'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Award, Clock, Crown, ImagePlus, Loader2, Plus, Trophy, X, Image as ImageIcon, Trash2, Send,
} from 'lucide-react';
import { Avatar, downscaleImage, getTimeAgo } from '@/components/social/shared';
import { groupsApi } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Contest {
  id: string;
  title: string;
  description: string;
  endsAt: string;
  status: 'open' | 'ended';
  winnerUserId: string | null;
  winnerName: string | null;
  authorId: string;
  authorName: string;
  entryCount: number;
  myEntry: boolean;
}

interface Entry {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  body: string;
  image: string | null;
  createdAt: string;
}

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-dark focus:ring-4 focus:ring-brand/10';

export default function GroupContests({ groupId, myId, isMember, isMod }: { groupId: string; myId: string; isMember: boolean; isMod: boolean }) {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', endsAt: '' });
  const [openContest, setOpenContest] = useState<Contest | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entryBody, setEntryBody] = useState('');
  const [entryImage, setEntryImage] = useState<string | null>(null);
  const [entryBusy, setEntryBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [entryError, setEntryError] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; run: () => Promise<void> } | null>(null);
  const [winnerBusy, setWinnerBusy] = useState<string | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await groupsApi.getContests(groupId);
      setContests(res.contests || []);
    } catch {
      setContests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [groupId]);

  const openDetail = async (c: Contest) => {
    setOpenContest(c);
    setEntriesLoading(true);
    setEntryBody('');
    setEntryImage(null);
    try {
      const res = await groupsApi.getContest(c.id);
      setEntries(res.entries || []);
      setOpenContest(res.contest);
    } catch {
      setEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  };

  const create = async () => {
    if (!form.title.trim() || !form.endsAt) return;
    setSubmitting(true);
    try {
      const res = await groupsApi.createContest(groupId, {
        title: form.title.trim(),
        description: form.description.trim(),
        endsAt: new Date(form.endsAt).toISOString(),
      });
      setContests((l) => [res.contest, ...l]);
      setCreating(false);
      setForm({ title: '', description: '', endsAt: '' });
    } catch (e: any) {
      setFormError(e?.response?.data?.error?.message || 'Nie udało się utworzyć konkursu.');
    } finally {
      setSubmitting(false);
    }
  };

  const addEntry = async () => {
    if (!openContest || (!entryBody.trim() && !entryImage)) return;
    setEntryBusy(true);
    try {
      const res = await groupsApi.addContestEntry(openContest.id, { body: entryBody.trim(), image: entryImage });
      setEntries((l) => {
        const rest = l.filter((e) => e.userId !== res.entry.userId);
        return [...rest, res.entry];
      });
      setOpenContest((c) => (c ? { ...c, myEntry: true, entryCount: c.myEntry ? c.entryCount : c.entryCount + 1 } : c));
      setContests((l) => l.map((c) => (c.id === openContest.id ? { ...c, myEntry: true } : c)));
      setEntryBody('');
      setEntryImage(null);
    } catch (e: any) {
      setEntryError(e?.response?.data?.error?.message || 'Nie udało się dodać zgłoszenia.');
    } finally {
      setEntryBusy(false);
    }
  };

  const removeEntry = (e: Entry) => {
    setConfirmAction({
      title: 'Usunąć zgłoszenie?',
      description: 'Zgłoszenie zostanie trwale usunięte z konkursu.',
      run: async () => {
        try {
          await groupsApi.deleteContestEntry(e.id);
          setEntries((l) => l.filter((x) => x.id !== e.id));
          setOpenContest((c) => (c ? { ...c, entryCount: Math.max(0, c.entryCount - 1), myEntry: e.userId === myId ? false : c.myEntry } : c));
        } catch {}
      },
    });
  };

  const pickWinner = (e: Entry) => {
    if (!openContest) return;
    const contestId = openContest.id;
    setConfirmAction({
      title: `Wybrać ${e.name} jako zwycięzcę?`,
      description: `Zwycięzca konkursu „${openContest.title}" zostanie ogłoszony w grupie.`,
      run: async () => {
        setWinnerBusy(e.userId);
        try {
          const res = await groupsApi.pickContestWinner(contestId, e.userId);
          setOpenContest(res.contest);
          setContests((l) => l.map((x) => (x.id === res.contest.id ? res.contest : x)));
        } catch (e2: any) {
          setEntryError(e2?.response?.data?.error?.message || 'Nie udało się wybrać zwycięzcy.');
        } finally {
          setWinnerBusy(null);
        }
      },
    });
  };

  const ended = (c: Contest) => c.status === 'ended' || new Date(c.endsAt) < new Date();

  return (
    <div className="space-y-4">
      {isMod ? (
        <button onClick={() => setCreating(true)} className="pv-card-hover w-full p-4 flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Utwórz konkurs</p>
            <p className="text-xs text-gray-400">Konkursy organizują moderatorzy — członkowie wysyłają zgłoszenia</p>
          </div>
        </button>
      ) : contests.length === 0 && !loading ? null : null}

      {loading ? (
        <div className="pv-card p-10 text-center"><Loader2 className="w-7 h-7 mx-auto text-brand animate-spin" /></div>
      ) : contests.length === 0 ? (
        <div className="pv-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
            <Trophy className="w-7 h-7 text-amber-600" />
          </div>
          <h3 className="pv-section-title mb-2">Brak konkursów</h3>
          <p className="text-gray-500">{isMod ? 'Utwórz pierwszy konkurs dla grupy!' : 'Konkursy organizują moderatorzy — wróć wkrótce!'}</p>
        </div>
      ) : (
        contests.map((c) => {
          const isEnded = ended(c);
          return (
            <button key={c.id} onClick={() => openDetail(c)} className="pv-card-hover w-full p-4 sm:p-5 text-left">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  c.status === 'ended' ? 'bg-amber-100' : isEnded ? 'bg-gray-100' : 'bg-brand-mint/50'
                }`}>
                  <Trophy className={`w-6 h-6 ${c.status === 'ended' ? 'text-amber-600' : isEnded ? 'text-gray-400' : 'text-brand-dark'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 break-words">{c.title}</h3>
                    {c.status === 'ended' && c.winnerName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
                        <Crown className="w-3 h-3" /> {c.winnerName}
                      </span>
                    )}
                    {c.status === 'open' && !isEnded && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">Aktywny</span>
                    )}
                    {c.status === 'open' && isEnded && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold">Zgłoszenia zamknięte</span>
                    )}
                  </div>
                  {c.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2 break-words">{c.description}</p>}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> do {new Date(c.endsAt).toLocaleDateString('pl-PL')}</span>
                    <span>{c.entryCount} {c.entryCount === 1 ? 'zgłoszenie' : 'zgłoszeń'}</span>
                    <span>od {c.authorName}</span>
                    {c.myEntry && <span className="text-emerald-600 font-medium">· bierzesz udział ✓</span>}
                  </div>
                </div>
              </div>
            </button>
          );
        })
      )}

      {/* Modal tworzenia (moderator) */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in px-3 pt-[5vh] sm:pt-4 pb-20 sm:pb-4 overflow-y-auto" onClick={() => setCreating(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Nowy konkurs</h3>
              <button onClick={() => setCreating(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Zamknij"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Nazwa, np. Najpiękniejsze zdjęcie pupila" maxLength={140} className={inputCls} autoFocus />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Zasady i nagroda (opcjonalnie)" rows={3} className={`${inputCls} resize-none`} />
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Koniec zgłoszeń</label>
                <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className={inputCls} />
              </div>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <button onClick={create} disabled={submitting || !form.title.trim() || !form.endsAt}
                className="w-full pv-btn-primary px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                Opublikuj konkurs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal konkursu — zgłoszenia */}
      {openContest && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in px-3 pt-[3vh] sm:pt-4 pb-20 sm:pb-4 overflow-y-auto" onClick={() => setOpenContest(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[86vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                  <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <span className="break-words">{openContest.title}</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  zgłoszenia do {new Date(openContest.endsAt).toLocaleString('pl-PL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setOpenContest(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 flex-shrink-0" aria-label="Zamknij"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {openContest.description && (
                <div className="p-3.5 rounded-xl bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap break-words">{openContest.description}</div>
              )}
              {openContest.status === 'ended' && openContest.winnerName && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-400 text-white flex items-center justify-center flex-shrink-0">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-800">Zwycięzca: {openContest.winnerName}</p>
                    <p className="text-xs text-amber-600">Konkurs zakończony — gratulacje!</p>
                  </div>
                </div>
              )}

              {/* Formularz zgłoszenia */}
              {isMember && openContest.status === 'open' && !ended(openContest) && (
                <div className="pv-card border-2 border-dashed border-brand-light p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">{openContest.myEntry ? 'Twoje zgłoszenie (możesz je nadpisać)' : 'Dodaj swoje zgłoszenie'}</p>
                  <textarea value={entryBody} onChange={(e) => setEntryBody(e.target.value)}
                    placeholder="Tekst zgłoszenia (opcjonalnie ze zdjęciem)" rows={2} className={`${inputCls} resize-none`} />
                  <input ref={imgRef} type="file" accept="image/*" className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) setEntryImage(await downscaleImage(f, 900));
                    }} />
                  <div className="flex items-center gap-2">
                    {entryImage ? (
                      <div className="relative">
                        <img src={entryImage} alt="" className="h-16 w-16 rounded-xl object-cover" />
                        <button onClick={() => setEntryImage(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <button onClick={() => imgRef.current?.click()} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:border-brand-dark/40 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4" /> Dodaj zdjęcie
                      </button>
                    )}
                    <button onClick={addEntry} disabled={entryBusy || (!entryBody.trim() && !entryImage)}
                      className="ml-auto pv-btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
                      {entryBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      {openContest.myEntry ? 'Nadpisz zgłoszenie' : 'Wyślij zgłoszenie'}
                    </button>
                  </div>
                  {entryError && <p className="text-xs text-red-500 mt-2">{entryError}</p>}
                </div>
              )}

              <h4 className="font-semibold text-gray-900 text-sm">Zgłoszenia ({entries.length})</h4>
              {entriesLoading ? (
                <div className="py-8 text-center"><Loader2 className="w-6 h-6 mx-auto text-brand animate-spin" /></div>
              ) : entries.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Brak zgłoszeń — bądź pierwszy!</p>
              ) : (
                entries.map((e) => (
                  <div key={e.id} className={`pv-card p-4 ${openContest.winnerUserId === e.userId ? 'ring-2 ring-amber-400' : ''}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar name={e.name} url={e.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1.5">
                          {e.name}
                          {openContest.winnerUserId === e.userId && <Crown className="w-4 h-4 text-amber-500" />}
                        </p>
                        <p className="text-[11px] text-gray-400">{getTimeAgo(e.createdAt)}</p>
                      </div>
                      {(e.userId === myId || isMod) && openContest.status === 'open' && (
                        <button onClick={() => removeEntry(e)} className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500" aria-label="Usuń zgłoszenie">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {e.body && <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{e.body}</p>}
                    {e.image && <img src={e.image} alt="" className="mt-2 rounded-xl max-h-64 w-full object-cover" />}
                    {isMod && openContest.status === 'open' && (
                      <button onClick={() => pickWinner(e)} disabled={winnerBusy === e.userId}
                        className="mt-3 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 flex items-center gap-1.5 disabled:opacity-50 transition-all">
                        {winnerBusy === e.userId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Award className="w-3.5 h-3.5" />}
                        Wybierz jako zwycięzcę
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmAction}
        title={confirmAction?.title || ''}
        description={confirmAction?.description}
        onConfirm={async () => {
          if (confirmAction) {
            await confirmAction.run();
            setConfirmAction(null);
          }
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
