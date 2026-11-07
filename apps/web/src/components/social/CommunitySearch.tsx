'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Briefcase, Loader2, Search, Users, X } from 'lucide-react';
import { Avatar } from './shared';
import { businessPagesApi, friendsApi, groupsApi } from '@/lib/api';

interface Results {
  people: { id: string; name: string; avatarUrl?: string | null; relation?: string }[];
  pages: { id: string | number; name: string; category?: string; city?: string; avatarUrl?: string | null }[];
  groups: { id: string | number; name: string; memberCount?: number; member_count?: number; category?: string; coverUrl?: string | null }[];
}

export default function CommunitySearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Results | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    const query = q.trim();
    if (query.length < 2) {
      setRes(null);
      setBusy(false);
      return;
    }
    setBusy(true);
    timer.current = setTimeout(async () => {
      try {
        const [people, pages, groups] = await Promise.all([
          friendsApi.search(query).then((r: any) => r.people || []).catch(() => []),
          businessPagesApi.getAll({ q: query }).then((r: any) => r.pages || []).catch(() => []),
          groupsApi.getGroups({ search: query }).then((r: any) => r.groups || []).catch(() => []),
        ]);
        setRes({ people, pages, groups });
      } catch {
        setRes({ people: [], pages: [], groups: [] });
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [q]);

  const total = (res?.people.length || 0) + (res?.pages.length || 0) + (res?.groups.length || 0);

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2.5 pv-card px-4 py-3">
        <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Szukaj osób, stron i grup…"
          className="flex-1 min-w-0 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
        />
        {busy && <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />}
        {q && !busy && (
          <button
            onClick={() => {
              setQ('');
              setRes(null);
            }}
            aria-label="Wyczyść wyszukiwanie"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && q.trim().length >= 2 && res && (
        <div className="absolute left-0 right-0 top-full mt-2 z-40 pv-card overflow-hidden max-h-[70vh] overflow-y-auto">
          {total === 0 && !busy && (
            <p className="px-4 py-6 text-center text-sm text-gray-500">
              Brak wyników dla „{q.trim()}”
            </p>
          )}

          {res.people.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Osoby</p>
              {res.people.map((p) => (
                <Link
                  key={`u${p.id}`}
                  href={`/dashboard/community/user/${p.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-brand-mint/40 transition-colors"
                >
                  <Avatar name={p.name} url={p.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">
                      {p.relation === 'friend' ? 'Znajomy' : 'Użytkownik Petvio'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {res.pages.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Strony firmowe</p>
              {res.pages.map((pg) => (
                <Link
                  key={`pg${pg.id}`}
                  href={`/dashboard/community/pages/${pg.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-brand-mint/40 transition-colors"
                >
                  {pg.avatarUrl ? (
                    <img src={pg.avatarUrl} alt="" className="w-8 h-8 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {pg.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{pg.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      <Briefcase className="w-3 h-3 inline -mt-0.5 mr-1" />
                      {pg.city || 'Strona firmowa'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {res.groups.length > 0 && (
            <div className="pb-2">
              <p className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Grupy</p>
              {res.groups.map((g) => (
                <Link
                  key={`g${g.id}`}
                  href={`/dashboard/groups/${g.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-brand-mint/40 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{g.name}</p>
                    <p className="text-xs text-gray-400">
                      Grupa{typeof (g.memberCount ?? g.member_count) === 'number' ? ` · ${g.memberCount ?? g.member_count} członków` : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
