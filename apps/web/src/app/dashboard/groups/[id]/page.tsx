'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Users,
  Globe,
  Lock,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Settings,
  LogOut,
  UserPlus,
  Clock,
  Check,
  ShieldCheck,
  Crown,
  Trash2,
  Camera,
  Info,
  MessageCircle,
  UserCheck,
  UserX,
  Inbox,
  FileCheck,
  X as XIcon,
} from 'lucide-react';
import SocialFeed from '@/components/social/SocialFeed';
import PostCard from '@/components/social/PostCard';
import GroupEvents from '@/components/groups/GroupEvents';
import GroupPolls from '@/components/groups/GroupPolls';
import GroupContests from '@/components/groups/GroupContests';
import { Avatar, SocialApi, SocialPost, SocialComment, downscaleImage } from '@/components/social/shared';
import { groupsApi } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { GROUP_CATEGORIES, groupCategoryName, PetGroup } from '@/lib/group-constants';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Member {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: 'owner' | 'moderator' | 'member';
  status: string;
  joinedAt: string;
}

type Tab = 'dyskusja' | 'wydarzenia' | 'ankiety' | 'konkursy' | 'czlonkowie' | 'poczekalnia' | 'info' | 'ustawienia';

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = String(params.id);

  const [user, setUser] = useState<any>(null);
  const [group, setGroup] = useState<PetGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const initialTab = (searchParams.get('tab') as Tab) || 'dyskusja';
  const [tab, setTab] = useState<Tab>(initialTab);

  const [pendingPosts, setPendingPosts] = useState<SocialPost[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [pending, setPending] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [settingsForm, setSettingsForm] = useState({
    name: '', description: '', category: 'general', privacy: 'public',
    postApproval: false, memberPosting: 'everyone' as 'everyone' | 'mods', memberComments: true,
  });
  const [cover, setCover] = useState<string | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsMsg, setSettingsMsg] = useState('');
  const coverRef = useRef<HTMLInputElement>(null);

  const [actionError, setActionError] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; run: () => Promise<void> } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {}
    }
  }, []);

  const loadGroup = async () => {
    try {
      const res = await groupsApi.getGroup(groupId);
      setGroup(res.group);
      setSettingsForm({
        name: res.group.name,
        description: res.group.description,
        category: res.group.category,
        privacy: res.group.privacy,
        postApproval: !!res.group.postApproval,
        memberPosting: res.group.memberPosting || 'everyone',
        memberComments: res.group.memberComments !== false,
      });
      setCover(res.group.coverUrl);
      setLoadError('');
    } catch {
      setLoadError('Nie udało się pobrać grupy.');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    setMembersLoading(true);
    try {
      const res = await groupsApi.getMembers(groupId);
      setMembers(res.members || []);
      setPending(res.pending || []);
    } catch {
      setMembers([]);
      setPending([]);
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    loadGroup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const loadPendingPosts = async () => {
    setPendingLoading(true);
    try {
      const res = await groupsApi.getPendingPosts(groupId);
      setPendingPosts(res.posts || []);
    } catch {
      setPendingPosts([]);
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'czlonkowie' && group && !group.limited) loadMembers();
    if (tab === 'poczekalnia' && group && !group.limited) loadPendingPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, group?.id]);

  const myId = user ? String(user.id ?? '') : '';
  const isMod = group?.myRole === 'owner' || group?.myRole === 'moderator';
  const isOwner = group?.myRole === 'owner';
  const isMember = group?.myStatus === 'active';

  const api: SocialApi = {
    getPosts: () => groupsApi.getPosts(groupId),
    createPost: (d) => groupsApi.createPost(groupId, d),
    updatePost: groupsApi.updatePost,
    deletePost: groupsApi.deletePost,
    reactPost: groupsApi.reactPost,
    getComments: groupsApi.getComments,
    addComment: groupsApi.addComment,
    deleteComment: groupsApi.deleteComment,
    pinPost: groupsApi.pinPost,
  };

  const handleJoin = async () => {
    try {
      const res = await groupsApi.joinGroup(groupId);
      setGroup((g) =>
        g
          ? {
              ...g,
              myStatus: res.status,
              myRole: res.status === 'active' ? 'member' : null,
              memberCount: res.status === 'active' ? g.memberCount + 1 : g.memberCount,
              limited: g.privacy === 'private',
            }
          : g
      );
    } catch (e: any) {
      setActionError(e?.response?.data?.error?.message || 'Nie udało się dołączyć do grupy.');
    }
  };

  const handleLeave = () => {
    setConfirmAction({
      title: 'Opuścić grupę?',
      description: 'Przestaniesz widzieć posty i wydarzenia tej grupy.',
      run: async () => {
        try {
          await groupsApi.leaveGroup(groupId);
          router.push('/dashboard/groups');
        } catch (e: any) {
          setActionError(e?.response?.data?.error?.message || 'Nie udało się opuścić grupy.');
        }
      },
    });
  };

  const handleApprove = async (m: Member) => {
    try {
      await groupsApi.approveMember(groupId, m.userId);
      setPending((l) => l.filter((x) => x.userId !== m.userId));
      setMembers((l) => [...l, { ...m, status: 'active', role: 'member' }]);
      setGroup((g) => (g ? { ...g, memberCount: g.memberCount + 1 } : g));
    } catch (e: any) {
      setActionError(e?.response?.data?.error?.message || 'Nie udało się zaakceptować.');
    }
  };

  const handleRemove = (m: Member, isPending = false) => {
    setConfirmAction({
      title: isPending ? `Odrzucić prośbę ${m.name}?` : `Usunąć ${m.name} z grupy?`,
      description: isPending ? 'Osoba nie zostanie członkiem grupy.' : 'Osoba straci dostęp do grupy i jej treści.',
      run: async () => {
        try {
          await groupsApi.removeMember(groupId, m.userId);
          if (isPending) {
            setPending((l) => l.filter((x) => x.userId !== m.userId));
          } else {
            setMembers((l) => l.filter((x) => x.userId !== m.userId));
            setGroup((g) => (g ? { ...g, memberCount: Math.max(0, g.memberCount - 1) } : g));
          }
        } catch (e: any) {
          setActionError(e?.response?.data?.error?.message || 'Nie udało się usunąć.');
        }
      },
    });
  };

  const handleRole = async (m: Member) => {
    const newRole = m.role === 'moderator' ? 'member' : 'moderator';
    try {
      await groupsApi.setMemberRole(groupId, m.userId, newRole);
      setMembers((l) => l.map((x) => (x.userId === m.userId ? { ...x, role: newRole } : x)));
    } catch (e: any) {
      setActionError(e?.response?.data?.error?.message || 'Nie udało się zmienić roli.');
    }
  };

  const handleApprovePost = async (post: SocialPost) => {
    try {
      await groupsApi.approvePost(post.id);
      setPendingPosts((l) => l.filter((p) => p.id !== post.id));
      setGroup((g) => (g ? { ...g, pendingPostCount: Math.max(0, (g.pendingPostCount || 0) - 1), postCount: g.postCount + 1 } : g));
    } catch (e: any) {
      setActionError(e?.response?.data?.error?.message || 'Nie udało się zatwierdzić posta.');
    }
  };

  const handleRejectPost = (post: SocialPost) => {
    setConfirmAction({
      title: 'Odrzucić ten post?',
      description: 'Post zostanie trwale usunięty i nie pojawi się w dyskusji.',
      run: async () => {
        try {
          await groupsApi.rejectPost(post.id);
          setPendingPosts((l) => l.filter((p) => p.id !== post.id));
          setGroup((g) => (g ? { ...g, pendingPostCount: Math.max(0, (g.pendingPostCount || 0) - 1) } : g));
        } catch (e: any) {
          setActionError(e?.response?.data?.error?.message || 'Nie udało się odrzucić posta.');
        }
      },
    });
  };

  const handleSaveSettings = async () => {
    if (!settingsForm.name.trim()) {
      setSettingsError('Nazwa grupy jest wymagana.');
      return;
    }
    setSettingsBusy(true);
    setSettingsError('');
    try {
      const res = await groupsApi.updateGroup(groupId, { ...settingsForm, coverUrl: cover });
      setGroup((g) => (g ? { ...g, ...res.group } : g));
      setSettingsMsg('Ustawienia zapisane.');
      setTimeout(() => setSettingsMsg(''), 3000);
    } catch (e: any) {
      setSettingsError(e?.response?.data?.error?.message || 'Nie udało się zapisać ustawień.');
    } finally {
      setSettingsBusy(false);
    }
  };

  const handleDeleteGroup = () => {
    setConfirmAction({
      title: 'Usunąć grupę na stałe?',
      description: 'Znikną wszystkie posty, wydarzenia, ankiety, konkursy i członkowie. Tej operacji nie da się cofnąć.',
      run: async () => {
        try {
          await groupsApi.deleteGroup(groupId);
          router.push('/dashboard/groups');
        } catch (e: any) {
          setActionError(e?.response?.data?.error?.message || 'Nie udało się usunąć grupy.');
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="pv-card p-12 text-center">
        <Loader2 className="w-8 h-8 mx-auto text-brand animate-spin" />
        <p className="text-sm text-gray-500 mt-3">Ładowanie grupy...</p>
      </div>
    );
  }

  if (loadError || !group) {
    return (
      <div className="pv-card p-8 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-3" />
        <p className="text-gray-700 mb-4">{loadError || 'Grupa nie została znaleziona'}</p>
        <button onClick={() => router.push('/dashboard/groups')} className="pv-btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Wróć do grup
        </button>
      </div>
    );
  }

  const tabs: { id: Tab; name: string; badge?: number }[] = [
    { id: 'dyskusja', name: 'Dyskusja' },
    { id: 'wydarzenia', name: 'Wydarzenia' },
    { id: 'ankiety', name: 'Ankiety' },
    { id: 'konkursy', name: 'Konkursy' },
    { id: 'czlonkowie', name: 'Członkowie', badge: isMod ? pending.length || group.pendingCount : 0 },
    ...(isMod ? [{ id: 'poczekalnia' as Tab, name: 'Poczekalnia', badge: group.pendingPostCount || pendingPosts.length || 0 }] : []),
    { id: 'info', name: 'O grupie' },
    ...(isMod ? [{ id: 'ustawienia' as Tab, name: 'Ustawienia' }] : []),
  ];

  const canPostHere = isMember && (isMod || group.memberPosting !== 'mods');
  const canCommentHere = isMod || group.memberComments !== false;

  return (
    <div className="space-y-5">
      {actionError && (
        <div className="pv-card p-3.5 flex items-center justify-between gap-3 border-l-4 border-red-400">
          <p className="text-sm text-red-600">{actionError}</p>
          <button onClick={() => setActionError('')} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Zamknij">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Nagłówek grupy */}
      <div className="pv-card overflow-hidden">
        <div className="relative">
          {group.coverUrl ? (
            <img src={group.coverUrl} alt="" className="w-full h-36 sm:h-48 object-cover" />
          ) : (
            <div
              className="w-full h-36 sm:h-48 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1B6B4A 0%, #0F3D2E 60%, #2E8B62 100%)' }}
            >
              <Users className="w-16 h-16 text-white/20" />
            </div>
          )}
          <button
            onClick={() => router.push('/dashboard/groups')}
            className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-gray-700 hover:bg-white shadow-md transition-all"
            aria-label="Wróć"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {isMod && (
            <button
              onClick={() => {
                setTab('ustawienia');
                setTimeout(() => coverRef.current?.click(), 100);
              }}
              className="absolute bottom-3 right-3 px-3.5 py-2 rounded-xl bg-white/90 backdrop-blur text-gray-700 text-sm font-medium hover:bg-white shadow-md transition-all flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4" /> Zmień okładkę
            </button>
          )}
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-2xl sm:text-3xl font-normal text-gray-900 break-words">{group.name}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  {group.privacy === 'private' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  {group.privacy === 'private' ? 'Grupa prywatna' : 'Grupa publiczna'}
                </span>
                <span>·</span>
                <span>{groupCategoryName(group.category)}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {group.memberCount} {group.memberCount === 1 ? 'członek' : 'członków'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              {!isMember && group.myStatus !== 'pending' && (
                <button onClick={handleJoin} className="pv-btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  {group.privacy === 'private' ? 'Poproś o dołączenie' : 'Dołącz'}
                </button>
              )}
              {group.myStatus === 'pending' && (
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-50 text-amber-700 text-sm font-medium border border-amber-200">
                  <Clock className="w-4 h-4" /> Oczekuje na akceptację
                </span>
              )}
              {isMember && !isOwner && (
                <button
                  onClick={handleLeave}
                  className="pv-btn px-5 py-2.5 border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600 text-sm"
                >
                  <LogOut className="w-4 h-4" /> Opuść
                </button>
              )}
              {isMod && (
                <button
                  onClick={() => setTab('ustawienia')}
                  className="pv-btn px-4 py-2.5 border border-gray-200 text-gray-600 hover:border-brand-dark hover:text-brand-dark text-sm"
                  aria-label="Ustawienia grupy"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Prywatna — widok ograniczony */}
      {group.limited ? (
        <div className="pv-card p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-brand" />
          </div>
          <h3 className="pv-section-title mb-2">To grupa prywatna</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            {group.description || 'Treść tej grupy jest widoczna tylko dla jej członków.'}
          </p>
          {group.myStatus !== 'pending' && !isMember && (
            <button onClick={handleJoin} className="pv-btn-primary px-6 py-3 text-sm inline-flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Poproś o dołączenie
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Zakładki */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative px-4 py-2 rounded-xl border font-medium text-sm whitespace-nowrap transition-all ${
                  tab === t.id
                    ? 'bg-brand-dark text-white border-brand-dark'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-brand-dark/40'
                }`}
              >
                {t.name}
                {!!t.badge && t.badge > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === 'dyskusja' && (
            <div className="space-y-5">
              {isMember && group.memberPosting === 'mods' && !isMod && (
                <div className="pv-card px-4 py-3 flex items-center gap-2.5 text-sm text-gray-500">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0 text-brand-dark" />
                  W tej grupie publikować mogą tylko moderatorzy.
                </div>
              )}
              <SocialFeed
                api={api}
                user={user}
                myId={myId}
                canModerate={isMod}
                showComposer={canPostHere}
                composerPlaceholder={`Napisz coś do grupy „${group.name}"...`}
                composerNotice={
                  group.postApproval && !isMod
                    ? 'Twoje posty trafiają do poczekalni — opublikujemy je po akceptacji moderatora.'
                    : undefined
                }
                emptyTitle="Brak postów w grupie"
                emptyText={canPostHere ? 'Napisz pierwszy post i rozpocznij dyskusję!' : 'Dołącz do grupy, aby publikować.'}
                canDeleteComment={(post, c) =>
                  c.authorId === myId || post.authorId === myId || isMod
                }
                canComment={canCommentHere}
              />
            </div>
          )}

          {tab === 'wydarzenia' && (
            <GroupEvents groupId={group.id} myId={myId} canInteract={isMember} />
          )}

          {tab === 'ankiety' && (
            <GroupPolls groupId={group.id} myId={myId} canInteract={isMember} isMod={isMod} />
          )}

          {tab === 'konkursy' && (
            <GroupContests groupId={group.id} myId={myId} isMember={isMember} isMod={isMod} />
          )}

          {tab === 'poczekalnia' && isMod && (
            <div className="space-y-5">
              <div className="pv-card px-4 py-3 flex items-center gap-2.5 text-sm text-gray-500">
                <Inbox className="w-4 h-4 flex-shrink-0 text-brand-dark" />
                Posty oczekujące na zatwierdzenie — zaakceptuj je lub odrzuć
              </div>
              {pendingLoading ? (
                <div className="pv-card p-10 text-center">
                  <Loader2 className="w-7 h-7 mx-auto text-brand animate-spin" />
                </div>
              ) : pendingPosts.length === 0 ? (
                <div className="pv-card p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
                    <FileCheck className="w-7 h-7 text-brand" />
                  </div>
                  <h3 className="pv-section-title mb-2">Poczekalnia pusta</h3>
                  <p className="text-gray-500">Nie ma postów oczekujących na zatwierdzenie.</p>
                </div>
              ) : (
                pendingPosts.map((post) => (
                  <div key={post.id} className="relative">
                    <PostCard
                      post={post}
                      myId={myId}
                      myName={user?.firstName}
                      myAvatar={user?.avatarUrl}
                      canModerate={false}
                      onReact={() => {}}
                      onDelete={() => {}}
                      loadComments={async () => []}
                      onAddComment={async () => {}}
                      onDeleteComment={() => {}}
                      canComment={false}
                    />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button
                        onClick={() => handleApprovePost(post)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-dark text-white text-xs font-semibold hover:bg-brand shadow-md transition-all"
                      >
                        <Check className="w-3.5 h-3.5" /> Zatwierdź
                      </button>
                      <button
                        onClick={() => handleRejectPost(post)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-red-600 text-xs font-semibold hover:border-red-300 shadow-md transition-all"
                      >
                        <XIcon className="w-3.5 h-3.5" /> Odrzuć
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'czlonkowie' && (
            <div className="space-y-5">
              {/* Prośby o dołączenie */}
              {isMod && pending.length > 0 && (
                <div className="pv-card p-5">
                  <h3 className="pv-section-title mb-1">Prośby o dołączenie ({pending.length})</h3>
                  <p className="text-sm text-gray-500 mb-4">Zaakceptuj lub odrzuć oczekujących użytkowników</p>
                  <div className="space-y-2">
                    {pending.map((m) => (
                      <div key={m.userId} className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50/60 border border-amber-100">
                        <Avatar name={m.name} url={m.avatarUrl} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{m.name}</p>
                          <p className="text-xs text-gray-500">prosi o dołączenie</p>
                        </div>
                        <button
                          onClick={() => handleApprove(m)}
                          className="p-2 rounded-xl bg-brand-dark text-white hover:bg-brand transition-all"
                          aria-label="Zaakceptuj"
                          title="Zaakceptuj"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(m, true)}
                          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition-all"
                          aria-label="Odrzuć"
                          title="Odrzuć"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista członków */}
              <div className="pv-card p-5">
                <h3 className="pv-section-title mb-4">Członkowie ({members.length})</h3>
                {membersLoading ? (
                  <div className="py-6 text-center">
                    <Loader2 className="w-6 h-6 mx-auto text-brand animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.userId} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-all">
                        <Avatar name={m.name} url={m.avatarUrl} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{m.name}</p>
                          <p className="text-xs text-gray-500 inline-flex items-center gap-1">
                            {m.role === 'owner' && (
                              <>
                                <Crown className="w-3.5 h-3.5 text-amber-500" /> Właściciel
                              </>
                            )}
                            {m.role === 'moderator' && (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 text-brand-dark" /> Moderator
                              </>
                            )}
                            {m.role === 'member' && 'Członek grupy'}
                          </p>
                        </div>
                        {isMod && m.role !== 'owner' && (
                          <div className="flex gap-1.5 flex-shrink-0">
                            {isOwner && (
                              <button
                                onClick={() => handleRole(m)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-mint/60 text-brand-dark hover:bg-brand-mint transition-all"
                                title={m.role === 'moderator' ? 'Odbierz moderację' : 'Nadaj moderację'}
                              >
                                {m.role === 'moderator' ? 'Odbierz mod.' : 'Zrób mod.'}
                              </button>
                            )}
                            <button
                              onClick={() => handleRemove(m)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                              aria-label="Usuń z grupy"
                              title="Usuń z grupy"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'info' && (
            <div className="pv-card p-5 sm:p-6">
              <h3 className="pv-section-title mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-brand-dark" /> O tej grupie
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap break-words mb-6">
                {group.description || 'Brak opisu.'}
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-gray-600">
                  {group.privacy === 'private' ? <Lock className="w-4 h-4 text-gray-400" /> : <Globe className="w-4 h-4 text-gray-400" />}
                  {group.privacy === 'private'
                    ? 'Grupa prywatna — treść widoczna tylko dla członków, dołączenie za zgodą'
                    : 'Grupa publiczna — każdy może przeglądać i dołączyć'}
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Users className="w-4 h-4 text-gray-400" />
                  {group.memberCount} {group.memberCount === 1 ? 'członek' : 'członków'}
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MessageCircle className="w-4 h-4 text-gray-400" />
                  {group.postCount} {group.postCount === 1 ? 'post' : 'postów'}
                </div>
                {group.ownerName && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Crown className="w-4 h-4 text-amber-500" />
                    Założyciel: {group.ownerName}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'ustawienia' && isMod && (
            <div className="space-y-5">
              <div className="pv-card p-5 sm:p-6">
                <h3 className="pv-section-title mb-1 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-brand-dark" /> Ustawienia grupy
                </h3>
                <p className="text-sm text-gray-500 mb-5">Zmień nazwę, opis, kategorię i prywatność</p>

                {settingsMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm mb-4 flex items-center gap-2">
                    <Check className="w-4 h-4" /> {settingsMsg}
                  </div>
                )}
                {settingsError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm mb-4">{settingsError}</div>
                )}

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Okładka</label>
                    <button
                      onClick={() => coverRef.current?.click()}
                      className="w-full h-28 rounded-2xl border-2 border-dashed border-gray-200 hover:border-brand-dark/50 overflow-hidden flex items-center justify-center transition-all"
                    >
                      {cover ? (
                        <img src={cover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="flex items-center gap-2 text-sm text-gray-400">
                          <Camera className="w-5 h-5" /> Dodaj okładkę
                        </span>
                      )}
                    </button>
                    {cover && (
                      <button onClick={() => setCover(null)} className="mt-2 text-xs text-red-500 hover:underline">
                        Usuń okładkę
                      </button>
                    )}
                    <input
                      ref={coverRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) setCover(await downscaleImage(f, 1200));
                        e.target.value = '';
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Nazwa grupy</label>
                    <input
                      type="text"
                      value={settingsForm.name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                      maxLength={120}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Opis</label>
                    <textarea
                      value={settingsForm.description}
                      onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Kategoria</label>
                    <select
                      value={settingsForm.category}
                      onChange={(e) => setSettingsForm({ ...settingsForm, category: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                    >
                      {GROUP_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Prywatność</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => setSettingsForm({ ...settingsForm, privacy: 'public' })}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                          settingsForm.privacy === 'public' ? 'border-brand-dark bg-brand-mint/40' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Globe className={`w-5 h-5 flex-shrink-0 ${settingsForm.privacy === 'public' ? 'text-brand-dark' : 'text-gray-400'}`} />
                        <span>
                          <span className="block font-semibold text-gray-900 text-sm">Publiczna</span>
                          <span className="block text-xs text-gray-500">Otwarta dla wszystkich</span>
                        </span>
                      </button>
                      <button
                        onClick={() => setSettingsForm({ ...settingsForm, privacy: 'private' })}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                          settingsForm.privacy === 'private' ? 'border-brand-dark bg-brand-mint/40' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Lock className={`w-5 h-5 flex-shrink-0 ${settingsForm.privacy === 'private' ? 'text-brand-dark' : 'text-gray-400'}`} />
                        <span>
                          <span className="block font-semibold text-gray-900 text-sm">Prywatna</span>
                          <span className="block text-xs text-gray-500">Dołączenie za zgodą</span>
                        </span>
                      </button>
                    </div>
                  </div>

                  {isOwner && (
                    <div className="pt-5 border-t border-gray-100 space-y-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-brand-dark" /> Moderacja
                      </h4>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Kto może publikować</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            onClick={() => setSettingsForm({ ...settingsForm, memberPosting: 'everyone' })}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                              settingsForm.memberPosting === 'everyone' ? 'border-brand-dark bg-brand-mint/40' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Users className={`w-5 h-5 flex-shrink-0 ${settingsForm.memberPosting === 'everyone' ? 'text-brand-dark' : 'text-gray-400'}`} />
                            <span>
                              <span className="block font-semibold text-gray-900 text-sm">Wszyscy członkowie</span>
                              <span className="block text-xs text-gray-500">Każdy może dodawać posty</span>
                            </span>
                          </button>
                          <button
                            onClick={() => setSettingsForm({ ...settingsForm, memberPosting: 'mods' })}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                              settingsForm.memberPosting === 'mods' ? 'border-brand-dark bg-brand-mint/40' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <ShieldCheck className={`w-5 h-5 flex-shrink-0 ${settingsForm.memberPosting === 'mods' ? 'text-brand-dark' : 'text-gray-400'}`} />
                            <span>
                              <span className="block font-semibold text-gray-900 text-sm">Tylko moderatorzy</span>
                              <span className="block text-xs text-gray-500">Ogłoszenia i ważne tematy</span>
                            </span>
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => setSettingsForm({ ...settingsForm, postApproval: !settingsForm.postApproval })}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                          settingsForm.postApproval ? 'border-brand-dark bg-brand-mint/40' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span
                          className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${
                            settingsForm.postApproval ? 'bg-brand-dark' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                              settingsForm.postApproval ? 'left-[22px]' : 'left-0.5'
                            }`}
                          />
                        </span>
                        <span>
                          <span className="block font-semibold text-gray-900 text-sm">Poczekalnia postów</span>
                          <span className="block text-xs text-gray-500">
                            Posty członków trafiają do zatwierdzenia przez moderatora (posty moderatorów wchodzą od razu)
                          </span>
                        </span>
                      </button>

                      <button
                        onClick={() => setSettingsForm({ ...settingsForm, memberComments: !settingsForm.memberComments })}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                          settingsForm.memberComments ? 'border-brand-dark bg-brand-mint/40' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span
                          className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${
                            settingsForm.memberComments ? 'bg-brand-dark' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                              settingsForm.memberComments ? 'left-[22px]' : 'left-0.5'
                            }`}
                          />
                        </span>
                        <span>
                          <span className="block font-semibold text-gray-900 text-sm">Komentarze członków</span>
                          <span className="block text-xs text-gray-500">
                            {settingsForm.memberComments ? 'Członkowie mogą komentować posty' : 'Komentować mogą tylko moderatorzy'}
                          </span>
                        </span>
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleSaveSettings}
                    disabled={settingsBusy || !settingsForm.name.trim()}
                    className="pv-btn-primary px-6 py-3 text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {settingsBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Zapisz ustawienia
                  </button>
                </div>
              </div>

              {isOwner && (
                <div className="pv-card p-5 sm:p-6 border-red-100">
                  <h3 className="pv-section-title mb-1 text-red-600">Strefa ryzyka</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Usunięcie grupy jest nieodwracalne — znikną wszystkie posty, komentarze i lista członków.
                  </p>
                  <button
                    onClick={handleDeleteGroup}
                    className="pv-btn px-5 py-2.5 bg-red-600 text-white hover:bg-red-700 text-sm"
                  >
                    <Trash2 className="w-4 h-4" /> Usuń grupę
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={!!confirmAction}
        title={confirmAction?.title || ''}
        description={confirmAction?.description}
        loading={confirmBusy}
        onConfirm={async () => {
          if (!confirmAction) return;
          setConfirmBusy(true);
          try {
            await confirmAction.run();
            setConfirmAction(null);
          } finally {
            setConfirmBusy(false);
          }
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
