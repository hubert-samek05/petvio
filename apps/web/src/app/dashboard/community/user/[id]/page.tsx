'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  Cake,
  Calendar,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  MessageCircle,
  PawPrint,
  Rss,
  Settings2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import SocialFeed from '@/components/social/SocialFeed';
import ProfileSettingsModal from '@/components/social/ProfileSettingsModal';
import { SocialApi } from '@/components/social/shared';
import { friendsApi, messagesApi, postsApi } from '@/lib/api';

interface Profile {
  id: string;
  name: string;
  avatarUrl?: string | null;
  memberSince: string;
  bio?: string;
  city?: string;
  birthday?: string | null;
  postCount: number;
  friendCount: number;
  followerCount: number;
  pets: { id: string; name: string; species: string; breed?: string; photoUrl?: string | null }[];
  relation: 'self' | 'none' | 'friend' | 'pending_out' | 'pending_in';
  isFollowing: boolean;
  isBlocked?: boolean;
  canPostOnWall?: boolean;
  canMessage?: boolean;
}

const speciesEmoji: Record<string, string> = { dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾' };

export default function UserWallPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try { setUser(JSON.parse(userData)); } catch {}
    }
  }, []);

  const load = async () => {
    try {
      const res = await friendsApi.profile(id);
      setProfile(res.profile);
      setNotFound(false);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const myId = user ? String(user.id ?? '') : '';
  const isSelf = profile?.relation === 'self' || profile?.id === myId;

  const act = async (fn: () => Promise<any>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      await load();
    } catch {} finally {
      setBusy(false);
    }
  };

  const message = async () => {
    if (busy || !profile) return;
    setBusy(true);
    try {
      const res = await messagesApi.open(profile.id);
      router.push(`/dashboard/messages?conv=${res.conversation.id}`);
    } catch (e: any) {
      alert(e?.response?.data?.error?.message || 'Nie możesz wysłać wiadomości do tej osoby.');
    } finally {
      setBusy(false);
    }
  };

  const block = async () => {
    setMenuOpen(false);
    if (!profile || !confirm(`Zablokować ${profile.name}? Osoba nie będzie mogła pisać ani zapraszać Cię do znajomych.`)) return;
    await act(() => friendsApi.block(profile.id));
  };

  const api: SocialApi = {
    getPosts: () => postsApi.getPosts({ user_id: id }),
    createPost: (data) => postsApi.createPost({ ...data, wallUserId: isSelf ? null : parseInt(id, 10) }),
    updatePost: postsApi.updatePost,
    deletePost: postsApi.deletePost,
    reactPost: postsApi.reactPost,
    getComments: postsApi.getComments,
    addComment: postsApi.addComment,
    deleteComment: postsApi.deleteComment,
  };

  const friendBtn = (() => {
    if (!profile || isSelf || profile.isBlocked) return null;
    const icon = busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null;
    switch (profile.relation) {
      case 'friend':
        return (
          <button onClick={() => act(() => friendsApi.remove(profile.id))} disabled={busy}
            className="pv-btn px-4 py-2.5 border border-emerald-300 text-emerald-700 text-sm font-semibold inline-flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
            {icon || <UserCheck className="w-4 h-4" />} Znajomi
          </button>
        );
      case 'pending_out':
        return (
          <button onClick={() => act(() => friendsApi.remove(profile.id))} disabled={busy}
            className="pv-btn px-4 py-2.5 border border-gray-200 text-gray-500 text-sm font-medium inline-flex items-center gap-2 hover:bg-red-50 hover:text-red-600 transition-all">
            {icon || <X className="w-4 h-4" />} Zaproszenie wysłane
          </button>
        );
      case 'pending_in':
        return (
          <button onClick={() => act(() => friendsApi.accept(profile.id))} disabled={busy}
            className="pv-btn-primary px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50">
            {icon || <UserPlus className="w-4 h-4" />} Zaakceptuj zaproszenie
          </button>
        );
      default:
        return (
          <button onClick={() => act(() => friendsApi.request(profile.id))} disabled={busy}
            className="pv-btn-primary px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50">
            {icon || <UserPlus className="w-4 h-4" />} Dodaj do znajomych
          </button>
        );
    }
  })();

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Wróć do PetvioBooka
      </button>

      {loading ? (
        <div className="pv-card p-16 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-brand animate-spin" />
        </div>
      ) : notFound || !profile ? (
        <div className="pv-card p-12 text-center">
          <PawPrint className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <h2 className="pv-section-title mb-2">Nie znaleziono użytkownika</h2>
          <Link href="/dashboard/community" className="text-sm text-brand-dark font-medium hover:underline">
            Wróć do PetvioBooka
          </Link>
        </div>
      ) : (
        <>
          {/* Nagłówek profilu */}
          <div className="pv-card overflow-hidden">
            <div className="h-24 sm:h-28 bg-gradient-to-r from-brand-dark via-brand to-brand-light" />
            <div className="px-5 sm:px-6 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-12">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white shadow-lg overflow-hidden flex-shrink-0 bg-white">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white font-bold text-3xl">
                      {(profile.name[0] || 'U').toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="font-serif text-2xl sm:text-3xl font-normal text-gray-900 truncate">{profile.name}</h1>
                  <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    W Petvio od {new Date(profile.memberSince).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {friendBtn}
                  {!isSelf && !profile.isBlocked && (
                    <button
                      onClick={() => act(() => (profile.isFollowing ? friendsApi.unfollow(profile.id) : friendsApi.follow(profile.id)))}
                      disabled={busy}
                      className={`pv-btn px-4 py-2.5 border text-sm font-semibold inline-flex items-center gap-2 transition-all ${
                        profile.isFollowing
                          ? 'border-brand/40 text-brand-dark bg-brand-mint/40'
                          : 'border-gray-200 text-gray-700 hover:border-brand/40 hover:text-brand-dark'
                      }`}
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : profile.isFollowing ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {profile.isFollowing ? 'Obserwujesz' : 'Obserwuj'}
                    </button>
                  )}
                  {!isSelf && profile.canMessage && (
                    <button onClick={message} disabled={busy}
                      className="pv-btn px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold inline-flex items-center gap-2 hover:border-brand/40 hover:text-brand-dark transition-all disabled:opacity-50">
                      <MessageCircle className="w-4 h-4" /> Wiadomość
                    </button>
                  )}
                  {isSelf ? (
                    <button onClick={() => setSettingsOpen(true)}
                      className="pv-btn px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold inline-flex items-center gap-2 hover:border-brand/40 hover:text-brand-dark transition-all">
                      <Settings2 className="w-4 h-4" /> Ustawienia tablicy
                    </button>
                  ) : (
                    <div className="relative">
                      <button onClick={() => setMenuOpen(!menuOpen)}
                        className="pv-btn px-3 py-2.5 border border-gray-200 text-gray-500 text-sm hover:border-brand/40 transition-all"
                        aria-label="Więcej opcji">
                        ⋯
                      </button>
                      {menuOpen && (
                        <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-fade-in">
                          {profile.isBlocked ? (
                            <button onClick={() => { setMenuOpen(false); act(() => friendsApi.unblock(profile.id)); }}
                              className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                              <Ban className="w-4 h-4" /> Odblokuj użytkownika
                            </button>
                          ) : (
                            <button onClick={block}
                              className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2">
                              <Ban className="w-4 h-4" /> Zablokuj {profile.name.split(' ')[0]}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bio / miasto / urodziny */}
              {(profile.bio || profile.city || profile.birthday) && (
                <div className="mt-4 space-y-1.5">
                  {profile.bio && <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {profile.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{profile.city}</span>}
                    {profile.birthday && (
                      <span className="flex items-center gap-1">
                        <Cake className="w-3.5 h-3.5" />
                        Urodziny: {new Date(profile.birthday).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Statystyki */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 pt-4 border-t border-gray-100 text-sm">
                <span className="text-gray-600"><strong className="text-gray-900">{profile.postCount}</strong> postów</span>
                <span className="text-gray-600 flex items-center gap-1"><Users className="w-3.5 h-3.5 text-gray-400" /><strong className="text-gray-900">{profile.friendCount}</strong> znajomych</span>
                <span className="text-gray-600 flex items-center gap-1"><Rss className="w-3.5 h-3.5 text-gray-400" /><strong className="text-gray-900">{profile.followerCount}</strong> obserwujących</span>
              </div>

              {/* Pupile */}
              {profile.pets.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.pets.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-mint/50 border border-brand/20 text-xs font-medium text-gray-700">
                      {speciesEmoji[p.species] || '🐾'} {p.name}{p.breed ? ` · ${p.breed}` : ''}
                    </span>
                  ))}
                </div>
              )}

              {profile.isBlocked && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
                  <Ban className="w-4 h-4 flex-shrink-0" /> Zablokowałeś tego użytkownika — odblokuj, by móc z nim współdziałać.
                </div>
              )}
            </div>
          </div>

          {/* Tablica postów */}
          <div>
            <h2 className="pv-section-title mb-4">{isSelf ? 'Twoja tablica' : `Tablica — ${profile.name.split(' ')[0]}`}</h2>
            <SocialFeed
              key={id}
              api={api}
              user={user}
              myId={myId}
              showComposer={!!profile.canPostOnWall}
              composerPlaceholder={isSelf ? 'Napisz coś na swojej tablicy...' : `Napisz coś na tablicy ${profile.name.split(' ')[0]}...`}
              emptyTitle="Brak postów"
              emptyText={isSelf ? 'Opublikuj swój pierwszy post!' : 'Na tej tablicy nie ma jeszcze żadnych postów.'}
            />
          </div>
        </>
      )}

      {settingsOpen && <ProfileSettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
