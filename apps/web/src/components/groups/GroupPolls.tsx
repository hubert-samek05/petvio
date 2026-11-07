'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Check, Clock, Loader2, Plus, Trash2, X } from 'lucide-react';
import { Avatar, getTimeAgo } from '@/components/social/shared';
import { groupsApi } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Poll {
  id: string;
  question: string;
  options: { text: string; votes: number }[];
  totalVotes: number;
  myVote: number | null;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  endsAt: string | null;
  createdAt: string;
}

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-dark focus:ring-4 focus:ring-brand/10';

export default function GroupPolls({ groupId, myId, canInteract, isMod }: { groupId: string; myId: string; canInteract: boolean; isMod: boolean }) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [endsAt, setEndsAt] = useState('');
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Poll | null>(null);

  const load = async () => {
    try {
      const res = await groupsApi.getPolls(groupId);
      setPolls(res.polls || []);
    } catch {
      setPolls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [groupId]);

  const vote = async (p: Poll, idx: number) => {
    if (busyId) return;
    setBusyId(p.id);
    try {
      const res = await groupsApi.votePoll(p.id, idx);
      setPolls((l) => l.map((x) => (x.id === p.id ? res.poll : x)));
    } catch {} finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await groupsApi.deletePoll(deleteTarget.id);
      setPolls((l) => l.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {}
  };

  const create = async () => {
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || opts.length < 2) return;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await groupsApi.createPoll(groupId, {
        question: question.trim(),
        options: opts,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      });
      setPolls((l) => [res.poll, ...l]);
      setCreating(false);
      setQuestion('');
      setOptions(['', '']);
      setEndsAt('');
    } catch (e: any) {
      setFormError(e?.response?.data?.error?.message || 'Nie udało się utworzyć ankiety.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {canInteract && (
        <button onClick={() => setCreating(true)} className="pv-card-hover w-full p-4 flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-brand-mint/60 flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5 text-brand-dark" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Utwórz ankietę</p>
            <p className="text-xs text-gray-400">Zapytaj grupę o zdanie — karma, miejsce spaceru, godzina treningu</p>
          </div>
        </button>
      )}

      {loading ? (
        <div className="pv-card p-10 text-center"><Loader2 className="w-7 h-7 mx-auto text-brand animate-spin" /></div>
      ) : polls.length === 0 ? (
        <div className="pv-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
            <BarChart3 className="w-7 h-7 text-brand" />
          </div>
          <h3 className="pv-section-title mb-2">Brak ankiet</h3>
          <p className="text-gray-500">{canInteract ? 'Zadaj pierwsze pytanie grupie!' : 'Dołącz do grupy, aby głosować.'}</p>
        </div>
      ) : (
        polls.map((p) => {
          const ended = p.endsAt ? new Date(p.endsAt) < new Date() : false;
          const canDelete = p.authorId === myId || isMod;
          return (
            <div key={p.id} className="pv-card p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={p.authorName} url={p.authorAvatar} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.authorName}</p>
                  <p className="text-[11px] text-gray-400">
                    {getTimeAgo(p.createdAt)}
                    {p.endsAt && (
                      <> · <Clock className="w-3 h-3 inline" /> {ended ? 'zakończona' : `do ${new Date(p.endsAt).toLocaleDateString('pl-PL')}`}</>
                    )}
                  </p>
                </div>
                {canDelete && (
                  <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500" aria-label="Usuń ankietę">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-3 break-words">{p.question}</h3>
              <div className="space-y-2">
                {p.options.map((o, i) => {
                  const pct = p.totalVotes > 0 ? Math.round((o.votes / p.totalVotes) * 100) : 0;
                  const mine = p.myVote === i;
                  const voted = p.myVote !== null || ended;
                  return (
                    <button
                      key={i}
                      onClick={() => !ended && canInteract && vote(p, i)}
                      disabled={ended || !canInteract || busyId === p.id}
                      className={`relative w-full text-left rounded-xl border overflow-hidden transition-all ${
                        mine ? 'border-brand-dark' : 'border-gray-200'
                      } ${!ended && canInteract ? 'hover:border-brand-dark/50 cursor-pointer' : 'cursor-default'}`}
                    >
                      {voted && (
                        <div
                          className={`absolute inset-y-0 left-0 transition-all duration-500 ${mine ? 'bg-brand-mint/70' : 'bg-gray-100'}`}
                          style={{ width: `${pct}%` }}
                        />
                      )}
                      <span className="relative flex items-center justify-between px-3.5 py-2.5">
                        <span className={`text-sm flex items-center gap-2 ${mine ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {mine && <Check className="w-4 h-4 text-brand-dark flex-shrink-0" />}
                          {o.text}
                        </span>
                        {voted && <span className="text-xs font-semibold text-gray-600">{pct}% ({o.votes})</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-400 mt-3">
                {p.totalVotes} {p.totalVotes === 1 ? 'głos' : 'głosów'}
                {p.myVote !== null && !ended && ' · możesz zmienić swój głos'}
              </p>
            </div>
          );
        })
      )}

      {creating && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in px-3 pt-[5vh] sm:pt-4 pb-20 sm:pb-4 overflow-y-auto" onClick={() => setCreating(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Nowa ankieta</h3>
              <button onClick={() => setCreating(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Zamknij"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
                placeholder="Pytanie, np. Najlepsza karma dla mopsa?" maxLength={200} className={inputCls} autoFocus />
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500">Odpowiedzi (2–6)</label>
                {options.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={o} maxLength={120}
                      onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
                      placeholder={`Opcja ${i + 1}`} className={inputCls} />
                    {options.length > 2 && (
                      <button onClick={() => setOptions(options.filter((_, j) => j !== i))}
                        className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 flex-shrink-0" aria-label="Usuń opcję">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 6 && (
                  <button onClick={() => setOptions([...options, ''])}
                    className="text-sm text-brand-dark font-medium hover:underline flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Dodaj odpowiedź
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Zakończenie (opcjonalnie)</label>
                <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputCls} />
              </div>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <button onClick={create} disabled={submitting || !question.trim() || options.filter((o) => o.trim()).length < 2}
                className="w-full pv-btn-primary px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                Opublikuj ankietę
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Usunąć ankietę?"
        description={deleteTarget ? `Ankieta „${deleteTarget.question}" zostanie trwale usunięta wraz z głosami.` : ''}
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
