'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell, Check, Loader2, MessageCircle, Users, X } from 'lucide-react';
import { Avatar } from './shared';
import { friendsApi, messagesApi } from '@/lib/api';

interface Person {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export default function FriendsRail({ myId, onRequestsCount }: { myId: string; onRequestsCount?: (n: number) => void }) {
  const router = useRouter();
  const [friends, setFriends] = useState<Person[]>([]);
  const [requests, setRequests] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [f, r] = await Promise.all([friendsApi.list(), friendsApi.requests()]);
      setFriends((f.friends || []).slice(0, 8));
      setRequests(r.requests || []);
      onRequestsCount?.((r.requests || []).length);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (id: string, fn: () => Promise<any>) => {
    if (busyId) return;
    setBusyId(id);
    try { await fn(); await load(); } catch {} finally { setBusyId(null); }
  };

  const message = async (id: string) => {
    setBusyId(id);
    try {
      const res = await messagesApi.open(id);
      router.push(`/dashboard/messages?conv=${res.conversation.id}`);
    } catch {} finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {requests.length > 0 && (
        <div className="pv-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 flex items-center gap-1.5 mb-2">
            <Bell className="w-3.5 h-3.5" /> Zaproszenia ({requests.length})
          </p>
          <div className="space-y-2">
            {requests.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center gap-2.5">
                <Link href={`/dashboard/community/user/${p.id}`} className="flex items-center gap-2.5 flex-1 min-w-0 group">
                  <Avatar name={p.name} url={p.avatarUrl} size="sm" />
                  <span className="text-sm font-medium text-gray-900 truncate group-hover:text-brand-dark transition-colors">{p.name}</span>
                </Link>
                <button onClick={() => act(p.id, () => friendsApi.accept(p.id))} disabled={busyId === p.id}
                  className="p-1.5 rounded-lg bg-brand-dark text-white hover:bg-brand transition-all disabled:opacity-50" title="Zaakceptuj" aria-label="Zaakceptuj">
                  {busyId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => act(p.id, () => friendsApi.decline(p.id))} disabled={busyId === p.id}
                  className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all" title="Odrzuć" aria-label="Odrzuć">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pv-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5 mb-3">
          <Users className="w-3.5 h-3.5" /> Znajomi
        </p>
        {loading ? (
          <div className="py-4 text-center"><Loader2 className="w-5 h-5 mx-auto text-brand animate-spin" /></div>
        ) : friends.length === 0 ? (
          <p className="text-xs text-gray-400 leading-relaxed">
            Nie masz jeszcze znajomych — wyszukaj osoby w zakładce „Ludzie".
          </p>
        ) : (
          <div className="space-y-0.5">
            {friends.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 group">
                <Link href={`/dashboard/community/user/${p.id}`} className="flex items-center gap-2.5 flex-1 min-w-0 px-2 py-1.5 -mx-2 rounded-xl hover:bg-brand-mint/40 transition-all">
                  <Avatar name={p.name} url={p.avatarUrl} size="sm" />
                  <span className="text-sm font-medium text-gray-800 truncate group-hover:text-brand-dark transition-colors">{p.name}</span>
                </Link>
                <button onClick={() => message(p.id)} disabled={busyId === p.id}
                  className="p-1.5 rounded-lg text-gray-300 hover:bg-brand-mint/60 hover:text-brand-dark transition-all opacity-0 group-hover:opacity-100"
                  title="Napisz wiadomość" aria-label="Napisz wiadomość">
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
