'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Briefcase,
  ChevronDown,
  Flame,
  MessagesSquare,
  Newspaper,
  PawPrint,
  Plus,
  Settings2,
  ShoppingBag,
  User as UserIcon,
  Users,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import CommunitySearch from '@/components/social/CommunitySearch';
import SocialFeed from '@/components/social/SocialFeed';
import StoriesBar from '@/components/social/StoriesBar';
import ReelsRail from '@/components/social/ReelsRail';
import PeoplePanel from '@/components/social/PeoplePanel';
import FriendsRail from '@/components/social/FriendsRail';
import ProfileSettingsModal from '@/components/social/ProfileSettingsModal';
import BusinessPageModal from '@/components/social/BusinessPageModal';
import { Avatar } from '@/components/social/shared';
import { postsApi, friendsApi, businessPagesApi } from '@/lib/api';
import { SocialApi } from '@/components/social/shared';

const SORTS = [
  { id: 'foryou', name: 'Dla Ciebie' },
  { id: 'newest', name: 'Najnowsze' },
  { id: 'popular', name: 'Najpopularniejsze' },
  { id: 'oldest', name: 'Najstarsze' },
] as const;

export default function CommunityPage() {
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'all' | 'mine' | 'people' | 'pages'>('all');
  const [sort, setSort] = useState<'foryou' | 'newest' | 'popular' | 'oldest'>('foryou');
  const [pendingCount, setPendingCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [myPages, setMyPages] = useState<any[]>([]);

  const loadPages = () => {
    businessPagesApi.getMine()
      .then((r) => setMyPages(r.pages || []))
      .catch(() => {});
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {}
    }
    friendsApi.requests()
      .then((r) => setPendingCount((r.requests || []).length))
      .catch(() => {});
    loadPages();
  }, []);

  const myId = user ? String(user.id ?? '') : '';
  const myName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
  const onlyMine = view === 'mine';

  const api: SocialApi = {
    getPosts: () =>
      postsApi.getPosts({
        ...(onlyMine ? { author: 'me' as const } : {}),
        sort: onlyMine ? 'newest' : sort,
      }),
    createPost: postsApi.createPost,
    updatePost: postsApi.updatePost,
    deletePost: postsApi.deletePost,
    reactPost: postsApi.reactPost,
    getComments: postsApi.getComments,
    addComment: postsApi.addComment,
    deleteComment: postsApi.deleteComment,
  };

  const shortcuts = myId
    ? [
        { href: `/dashboard/community/user/${myId}`, label: 'Moja tablica', icon: Newspaper },
        { href: '/dashboard/messages', label: 'Messenger', icon: MessagesSquare },
        { href: '/dashboard/groups', label: 'Grupy', icon: Users },
        { href: '/dashboard/shop', label: 'Sklep', icon: ShoppingBag },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Newspaper}
        title="PetvioBook"
        description="Społeczność PetVio — relacje, rolki, spacery, znajomi i wiadomości"
      />

      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_280px] items-start">
        {/* Lewy sidebar — profil + skróty (jak na Facebooku) */}
        <aside className="hidden lg:block sticky top-24 space-y-4">
          {user && (
            <Link
              href={`/dashboard/community/user/${myId}`}
              className="pv-card p-4 flex items-center gap-3 group hover:shadow-md transition-all"
            >
              <Avatar name={myName || 'U'} url={user.avatarUrl} size="lg" />
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-brand-dark transition-colors">
                  {myName || 'Mój profil'}
                </p>
                <p className="text-xs text-gray-400">Zobacz swoją tablicę</p>
              </div>
            </Link>
          )}
          <div className="pv-card p-2">
            {shortcuts.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-brand-mint/50 hover:text-brand-dark transition-all"
              >
                <s.icon className="w-[18px] h-[18px] text-brand-dark/70" />
                {s.label}
              </Link>
            ))}
            <button
              onClick={() => setView('people')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-brand-mint/50 hover:text-brand-dark transition-all"
            >
              <Users className="w-[18px] h-[18px] text-brand-dark/70" />
              Znajomi
              {pendingCount > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-brand-mint/50 hover:text-brand-dark transition-all"
            >
              <Settings2 className="w-[18px] h-[18px] text-brand-dark/70" />
              Ustawienia i prywatność
            </button>
          </div>

          {/* Twoje strony firmowe */}
          <div className="pv-card p-2">
            <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Twoje strony
            </p>
            {myPages.map((pg) => (
              <Link
                key={pg.id}
                href={`/dashboard/community/pages/${pg.id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-brand-mint/50 hover:text-brand-dark transition-all"
              >
                {pg.avatarUrl ? (
                  <img src={pg.avatarUrl} alt="" className="w-[18px] h-[18px] rounded-md object-cover" />
                ) : (
                  <Briefcase className="w-[18px] h-[18px] text-brand-dark/70" />
                )}
                <span className="truncate">{pg.name}</span>
              </Link>
            ))}
            <button
              onClick={() => setPageModalOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-brand-dark hover:bg-brand-mint/50 transition-all"
            >
              <Plus className="w-[18px] h-[18px]" />
              Utwórz stronę firmową
            </button>
          </div>
          <p className="px-2 text-[11px] text-gray-300 leading-relaxed">
            PetvioBook · społeczność opiekunów zwierząt
          </p>
        </aside>

        {/* Środek — wyszukiwarka, stories, rolki, filtry, feed */}
        <div className="space-y-4 sm:space-y-6 min-w-0">
          {/* Wyszukiwarka — osoby, strony, grupy (jak Facebook) */}
          <CommunitySearch />

          {/* Relacje (stories 24h) */}
          <StoriesBar myId={myId} />

          {/* Rolki */}
          {view === 'all' && <ReelsRail myId={myId} />}

          {/* MOBILE — pasek zakładek jak na Facebooku: 5 równych ikon, bez scrolla */}
          <div className="sm:hidden space-y-3">
            <div className="pv-card overflow-hidden">
              <div className="grid grid-cols-5">
                {([
                  { id: 'all', icon: Newspaper, label: 'Feed' },
                  { id: 'mine', icon: UserIcon, label: 'Moje' },
                  { id: 'people', icon: Users, label: 'Ludzie', badge: pendingCount },
                  { id: 'pages', icon: Briefcase, label: 'Strony' },
                ] as const).map((t) => {
                  const active = view === t.id;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setView(t.id as any)}
                      className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
                        active ? 'text-brand-dark' : 'text-gray-400'
                      }`}
                    >
                      {active && <span className="absolute top-0 left-3 right-3 h-[3px] rounded-b-full bg-brand-dark" />}
                      <span className="relative">
                        <Icon className="w-5 h-5" />
                        {'badge' in t && t.badge > 0 && !active && (
                          <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                            {t.badge}
                          </span>
                        )}
                      </span>
                      {t.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold text-gray-400 transition-colors"
                  aria-label="Ustawienia i prywatność"
                >
                  <Settings2 className="w-5 h-5" />
                  Ustaw.
                </button>
              </div>
            </div>
            {(view === 'all' || view === 'mine') && (
              <div className="flex items-center justify-between gap-2">
                {sort === 'foryou' && view === 'all' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                    <Flame className="w-3.5 h-3.5" /> znajomi i obserwowani na topie
                  </span>
                ) : <span />}
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as any)}
                    className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-gray-200 bg-white font-medium text-xs focus:outline-none focus:border-brand-dark cursor-pointer"
                  >
                    {SORTS.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* DESKTOP — klasyczne przyciski */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setView('all')}
              className={`px-4 py-2 rounded-xl border font-medium text-sm transition-all ${
                view === 'all' ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-dark/40'
              }`}
            >
              Wszystkie posty
            </button>
            <button
              onClick={() => setView('mine')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border font-medium text-sm transition-all ${
                view === 'mine' ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-brand-dark border-brand-dark/40 hover:border-brand-dark'
              }`}
            >
              <UserIcon className="w-4 h-4" /> Moje posty
            </button>
            <button
              onClick={() => setView('people')}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl border font-medium text-sm transition-all lg:hidden ${
                view === 'people' ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-dark/40'
              }`}
            >
              <Users className="w-4 h-4" /> Ludzie
              {pendingCount > 0 && view !== 'people' && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 border-2 border-white text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setView('pages')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border font-medium text-sm transition-all lg:hidden ${
                view === 'pages' ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-dark/40'
              }`}
            >
              <Briefcase className="w-4 h-4" /> Strony
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Ustawienia i prywatność"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border bg-white text-gray-700 border-gray-200 hover:border-brand-dark/40 transition-all lg:hidden"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {view !== 'people' && view !== 'pages' && (
              <div className="ml-auto flex items-center gap-2">
                {sort === 'foryou' && view === 'all' && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                    <Flame className="w-3.5 h-3.5" /> posty znajomych i obserwowanych na topie
                  </span>
                )}
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as any)}
                    className="appearance-none pl-3.5 pr-9 py-2 rounded-xl border border-gray-200 bg-white font-medium text-sm focus:outline-none focus:border-brand-dark cursor-pointer"
                  >
                    {SORTS.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {view === 'people' ? (
            <PeoplePanel myId={myId} onRequestsCount={setPendingCount} />
          ) : view === 'pages' ? (
            <div className="space-y-4">
              <div className="pv-card p-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">Twoje strony firmowe</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Wizytówki firm — jak strony na Facebooku</p>
                </div>
                <button
                  onClick={() => setPageModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl pv-btn-primary text-sm flex-shrink-0"
                >
                  <Plus className="w-4 h-4" /> Nowa strona
                </button>
              </div>
              {myPages.length === 0 ? (
                <div className="pv-card p-10 text-center">
                  <Briefcase className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">
                    Nie masz jeszcze strony firmowej. Utwórz wizytówkę z godzinami otwarcia, adresem i kontaktem — klienci znajdą Cię w katalogu.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {myPages.map((pg) => (
                    <Link
                      key={pg.id}
                      href={`/dashboard/community/pages/${pg.id}`}
                      className="pv-card-hover p-4 flex items-center gap-3"
                    >
                      {pg.avatarUrl ? (
                        <img src={pg.avatarUrl} alt="" className="w-12 h-12 rounded-2xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white font-bold flex-shrink-0">
                          {pg.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{pg.name}</p>
                        <p className="text-xs text-gray-500">
                          {pg.city || '—'} · {pg.postCount ?? 0} postów
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <SocialFeed
              key={`${view}-${sort}`}
              api={api}
              user={user}
              myId={myId}
              composerVisibility
              emptyTitle={onlyMine ? 'Nie masz jeszcze postów' : 'Brak postów'}
              emptyText={onlyMine ? 'Opublikuj swój pierwszy post powyżej!' : 'Bądź pierwszy i napisz coś!'}
            />
          )}
        </div>

        {/* Prawa kolumna — znajomi (jak na Facebooku) */}
        <aside className="hidden xl:block sticky top-24">
          <FriendsRail myId={myId} onRequestsCount={setPendingCount} />
        </aside>
      </div>

      {settingsOpen && <ProfileSettingsModal onClose={() => setSettingsOpen(false)} />}
      {pageModalOpen && (
        <BusinessPageModal
          onClose={() => setPageModalOpen(false)}
          onSaved={(p) => {
            loadPages();
            window.location.href = `/dashboard/community/pages/${p.id}`;
          }}
        />
      )}
    </div>
  );
}
