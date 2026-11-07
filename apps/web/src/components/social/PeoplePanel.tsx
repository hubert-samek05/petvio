'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  Loader2,
  MessageCircle,
  Search,
  UserPlus,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Avatar } from './shared';
import { friendsApi, messagesApi } from '@/lib/api';

interface Person {
  id: string;
  name: string;
  avatarUrl?: string | null;
  relation?: 'none' | 'friend' | 'pending_out' | 'pending_in';
  isFollowing?: boolean;
  createdAt?: string;
}

export default function PeoplePanel({ myId, onRequestsCount }: { myId: string; onRequestsCount?: (n: number) => void }) {
  const router = useRouter();
  const [friends, setFriends] = useState<Person[]>([]);
  const [requests, setRequests] = useState<Person[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [f, r] = await Promise.all([friendsApi.list(), friendsApi.requests()]);
      setFriends(f.friends || []);
      setRequests(r.requests || []);
      onRequestsCount?.((r.requests || []).length);
    } catch {}
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await friendsApi.search(query.trim());
        setResults(res.people || []);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const act = async (id: string, fn: () => Promise<any>) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await fn();
      await load();
      if (searched) {
        const res = await friendsApi.search(query.trim());
        setResults(res.people || []);
      }
    } catch {} finally {
      setBusyId(null);
    }
  };

  const message = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await messagesApi.open(id);
      router.push(`/dashboard/messages?conv=${res.conversation.id}`);
    } catch {
      router.push('/dashboard/messages');
    } finally {
      setBusyId(null);
    }
  };

  const RelationBtn = ({ p }: { p: Person }) => {
    const busy = busyId === p.id;
    if (p.relation === 'friend') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold">
          <UserCheck className="w-3.5 h-3.5" /> Znajomi
        </span>
      );
    }
    if (p.relation === 'pending_out') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-500 text-xs font-medium">
          Wysłano
        </span>
      );
    }
    if (p.relation === 'pending_in') {
      return (
        <button
          onClick={() => act(p.id, () => friendsApi.accept(p.id))}
          disabled={busy}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-dark text-white text-xs font-semibold disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Zaakceptuj
        </button>
      );
    }
    return (
      <button
        onClick={() => act(p.id, () => friendsApi.request(p.id))}
        disabled={busy}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
        Dodaj
      </button>
    );
  };

  const PersonRow = ({ p, extra }: { p: Person; extra?: React.ReactNode }) => (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Link href={`/dashboard/community/user/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0 group">
        <Avatar name={p.name} url={p.avatarUrl} size="sm" />
        <span className="font-medium text-sm text-gray-900 truncate group-hover:text-brand-dark transition-colors">{p.name}</span>
      </Link>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {extra}
        {p.id !== myId && <RelationBtn p={p} />}
        {p.id !== myId && (
          <button
            onClick={() => message(p.id)}
            disabled={busyId === p.id}
            className="p-2 rounded-xl text-gray-400 hover:bg-brand-mint/60 hover:text-brand-dark transition-all disabled:opacity-50"
            title="Napisz wiadomość"
            aria-label="Napisz wiadomość"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="pv-card overflow-hidden">
      {/* Szukaj */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj osób w Petvio..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-dark focus:ring-4 focus:ring-brand/10"
          />
          {searching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand animate-spin" />}
        </div>
      </div>

      {/* Wyniki szukania */}
      {query.trim().length >= 2 && (
        <div className="divide-y divide-gray-50">
          {searched && results.length === 0 && !searching && (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">Nie znaleziono osób pasujących do „{query.trim()}"</p>
          )}
          {results.map((p) => <PersonRow key={p.id} p={p} />)}
        </div>
      )}

      {/* Zaproszenia */}
      {query.trim().length < 2 && requests.length > 0 && (
        <div>
          <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" /> Zaproszenia do znajomych ({requests.length})
          </p>
          <div className="divide-y divide-gray-50">
            {requests.map((p) => (
              <PersonRow
                key={p.id}
                p={{ ...p, relation: 'pending_in' }}
                extra={
                  <button
                    onClick={() => act(p.id, () => friendsApi.decline(p.id))}
                    disabled={busyId === p.id}
                    className="p-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50"
                    title="Odrzuć"
                    aria-label="Odrzuć zaproszenie"
                  >
                    <X className="w-4 h-4" />
                  </button>
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Znajomi */}
      {query.trim().length < 2 && (
        <div>
          <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Znajomi ({friends.length})
          </p>
          {friends.length === 0 ? (
            <p className="px-4 pb-5 text-sm text-gray-400">Nie masz jeszcze znajomych — wyszukaj osoby powyżej i wyślij zaproszenie.</p>
          ) : (
            <div className="divide-y divide-gray-50 pb-2">
              {friends.map((p) => <PersonRow key={p.id} p={p} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
