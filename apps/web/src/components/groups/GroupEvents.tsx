'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CalendarDays, Check, HelpCircle, ImagePlus, Loader2, MapPin, Minus, Plus, Ticket, Trash2, X,
} from 'lucide-react';
import { Avatar, downscaleImage, getTimeAgo } from '@/components/social/shared';
import { groupsApi } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface GroupEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  coverImage: string | null;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  goingCount: number;
  interestedCount: number;
  myStatus: 'going' | 'interested' | 'not_going' | null;
  attendees: { first_name: string; last_name: string; avatar_url: string | null }[];
  ticketsEnabled: boolean;
  ticketPrice: number | null;
  ticketTotal: number | null;
  ticketsClaimed: number;
  myTickets: number;
  ticketInfo: string;
}

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-dark focus:ring-4 focus:ring-brand/10';

export default function GroupEvents({ groupId, myId, canInteract }: { groupId: string; myId: string; canInteract: boolean }) {
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', location: '', date: '', time: '18:00', coverImage: null as string | null,
    ticketsEnabled: false, ticketTotal: '', ticketPrice: '', ticketInfo: '',
  });
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GroupEvent | null>(null);
  const [ticketQty, setTicketQty] = useState<Record<string, number>>({});
  const [ticketErr, setTicketErr] = useState<Record<string, string>>({});
  const imgRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await groupsApi.getEvents(groupId);
      setEvents(res.events || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [groupId]);

  useEffect(() => {
    if (!creating) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCreating(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [creating]);

  const respond = async (ev: GroupEvent, status: 'going' | 'interested' | 'not_going') => {
    setBusyId(ev.id);
    try {
      const next = ev.myStatus === status ? null : status;
      const res = await groupsApi.respondEvent(ev.id, next);
      setEvents((l) => l.map((e) => (e.id === ev.id ? res.event : e)));
    } catch {} finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await groupsApi.deleteEvent(deleteTarget.id);
      setEvents((l) => l.filter((e) => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {}
  };

  const claimTicket = async (ev: GroupEvent) => {
    const qty = Math.min(5, Math.max(1, ticketQty[ev.id] || 1));
    setBusyId(ev.id);
    try {
      const res = await groupsApi.claimTickets(ev.id, qty);
      setEvents((l) => l.map((e) => (e.id === ev.id ? res.event : e)));
    } catch (e: any) {
      setTicketErr((m) => ({ ...m, [ev.id]: e?.response?.data?.error?.message || 'Nie udało się zarezerwować biletu.' }));
    } finally {
      setBusyId(null);
    }
  };

  const unclaimTicket = async (ev: GroupEvent) => {
    setBusyId(ev.id);
    try {
      const res = await groupsApi.unclaimTickets(ev.id);
      setEvents((l) => l.map((e) => (e.id === ev.id ? res.event : e)));
    } catch {} finally {
      setBusyId(null);
    }
  };

  const pickImage = async (f: File) => {
    setForm((v) => ({ ...v, coverImage: null }));
    const dataUrl = await downscaleImage(f, 1200);
    setForm((v) => ({ ...v, coverImage: dataUrl }));
  };

  const create = async () => {
    if (!form.title.trim() || !form.date) return;
    if (form.ticketsEnabled && (!form.ticketTotal || parseInt(form.ticketTotal, 10) < 1)) {
      setFormError('Podaj liczbę dostępnych biletów.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const res = await groupsApi.createEvent(groupId, {
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        startsAt: new Date(`${form.date}T${form.time || '00:00'}`).toISOString(),
        coverImage: form.coverImage,
        ticketsEnabled: form.ticketsEnabled,
        ticketTotal: form.ticketsEnabled ? parseInt(form.ticketTotal, 10) : undefined,
        ticketPrice: form.ticketsEnabled && form.ticketPrice !== '' ? parseFloat(form.ticketPrice.replace(',', '.')) : null,
        ticketInfo: form.ticketsEnabled ? form.ticketInfo.trim() : undefined,
      });
      setEvents((l) => [...l, res.event].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)));
      setCreating(false);
      setForm({ title: '', description: '', location: '', date: '', time: '18:00', coverImage: null, ticketsEnabled: false, ticketTotal: '', ticketPrice: '', ticketInfo: '' });
    } catch (e: any) {
      setFormError(e?.response?.data?.error?.message || 'Nie udało się utworzyć wydarzenia.');
    } finally {
      setSubmitting(false);
    }
  };

  const now = Date.now();
  const upcoming = events.filter((e) => +new Date(e.startsAt) >= now - 3600000 * 3);
  const past = events.filter((e) => +new Date(e.startsAt) < now - 3600000 * 3);

  const EventCard = ({ ev, past }: { ev: GroupEvent; past?: boolean }) => {
    const d = new Date(ev.startsAt);
    const canDelete = ev.authorId === myId;
    return (
      <div className={`pv-card overflow-hidden ${past ? 'opacity-70' : ''}`}>
        {ev.coverImage && <img src={ev.coverImage} alt="" className="w-full h-32 sm:h-40 object-cover" />}
        <div className="p-4 sm:p-5">
          <div className="flex gap-4">
            <div className="w-14 sm:w-16 flex-shrink-0 rounded-2xl bg-brand-mint/50 flex flex-col items-center justify-center py-2 text-brand-dark">
              <span className="text-xl sm:text-2xl font-bold leading-none">{d.getDate()}</span>
              <span className="text-[10px] font-semibold uppercase mt-0.5">{d.toLocaleDateString('pl-PL', { month: 'short' })}</span>
              <span className="text-[10px] text-gray-500 mt-0.5">{d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 break-words">{ev.title}</h3>
              {ev.location && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /> {ev.location}</p>
              )}
              {ev.description && <p className="text-sm text-gray-600 mt-1.5 whitespace-pre-wrap break-words">{ev.description}</p>}
              <div className="flex items-center gap-2 mt-2.5">
                <div className="flex -space-x-2">
                  {ev.attendees.slice(0, 5).map((a, i) => (
                    <Avatar key={i} name={`${a.first_name} ${a.last_name}`} url={a.avatar_url} size="sm" />
                  ))}
                </div>
                <span className="text-xs text-gray-500">
                  {ev.goingCount > 0 && <>{ev.goingCount} {ev.goingCount === 1 ? 'osoba weźmie' : 'osób weźmie'} udział</>}
                  {ev.interestedCount > 0 && <>{ev.goingCount > 0 ? ' · ' : ''}{ev.interestedCount} zainteresowane</>}
                  {ev.goingCount === 0 && ev.interestedCount === 0 && 'Bądź pierwszy!'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Dodał(a) {ev.authorName} · {getTimeAgo(ev.startsAt) === 'Teraz' ? '' : ''}</p>
            </div>
          </div>
          {ev.ticketsEnabled && ev.ticketTotal != null && ev.ticketTotal > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-amber-600" />
                  {ev.ticketPrice && ev.ticketPrice > 0
                    ? `Bilety: ${ev.ticketPrice.toFixed(2)} zł`
                    : 'Bilety: bezpłatne'}
                </p>
                <p className="text-xs text-gray-500">
                  {ev.ticketsClaimed}/{ev.ticketTotal} zarezerwowanych
                </p>
              </div>
              <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden mb-2">
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${Math.min(100, (ev.ticketsClaimed / ev.ticketTotal) * 100)}%` }}
                />
              </div>
              {ev.ticketInfo && <p className="text-xs text-gray-500 mb-2">{ev.ticketInfo}</p>}
              {ev.ticketPrice && ev.ticketPrice > 0 && (
                <p className="text-[11px] text-amber-700/80 mb-2">Płatność u organizatora — PetVio nie przetwarza jeszcze płatności online.</p>
              )}
              {canInteract && !past && (
                ev.myTickets > 0 ? (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-brand-dark flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Masz {ev.myTickets} {ev.myTickets === 1 ? 'bilet' : ev.myTickets < 5 ? 'bilety' : 'biletów'}
                    </p>
                    <button
                      onClick={() => unclaimTicket(ev)}
                      disabled={busyId === ev.id}
                      className="text-xs text-gray-500 hover:text-red-500 font-medium disabled:opacity-50"
                    >
                      Oddaj bilety
                    </button>
                  </div>
                ) : ev.ticketsClaimed >= ev.ticketTotal ? (
                  <p className="text-xs font-semibold text-red-500">Pula biletów wyczerpana</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                      <button
                        onClick={() => setTicketQty((q) => ({ ...q, [ev.id]: Math.max(1, (q[ev.id] || 1) - 1) }))}
                        className="p-1.5 text-gray-500 hover:text-brand-dark" aria-label="Mniej"
                      ><Minus className="w-3.5 h-3.5" /></button>
                      <span className="w-7 text-center text-sm font-semibold">{ticketQty[ev.id] || 1}</span>
                      <button
                        onClick={() => setTicketQty((q) => ({ ...q, [ev.id]: Math.min(5, (ev.ticketTotal ?? 1) - ev.ticketsClaimed, (q[ev.id] || 1) + 1) }))}
                        className="p-1.5 text-gray-500 hover:text-brand-dark" aria-label="Więcej"
                      ><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <button
                      onClick={() => { setTicketErr((m) => ({ ...m, [ev.id]: '' })); claimTicket(ev); }}
                      disabled={busyId === ev.id}
                      className="flex-1 pv-btn-primary px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {busyId === ev.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ticket className="w-3.5 h-3.5" />}
                      Zarezerwuj bilet
                    </button>
                  </div>
                )
              )}
              {ticketErr[ev.id] && <p className="text-xs text-red-500 mt-1.5">{ticketErr[ev.id]}</p>}
            </div>
          )}
          {canInteract && !past && (
            <div className="flex gap-2 mt-4">
              {([
                { id: 'going' as const, name: 'Wezmę udział', icon: Check, active: 'bg-brand-dark text-white border-brand-dark' },
                { id: 'interested' as const, name: 'Zainteresowany', icon: HelpCircle, active: 'bg-amber-500 text-white border-amber-500' },
                { id: 'not_going' as const, name: 'Nie mogę', icon: X, active: 'bg-gray-500 text-white border-gray-500' },
              ]).map((o) => (
                <button
                  key={o.id}
                  onClick={() => respond(ev, o.id)}
                  disabled={busyId === ev.id}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border text-xs font-semibold transition-all disabled:opacity-50 ${
                    ev.myStatus === o.id ? o.active : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark/40'
                  }`}
                >
                  <o.icon className="w-3.5 h-3.5" /> {o.name}
                </button>
              ))}
            </div>
          )}
          {canDelete && (
            <button onClick={() => setDeleteTarget(ev)} className="mt-3 text-xs text-gray-400 hover:text-red-500 inline-flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Usuń wydarzenie
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {canInteract && (
        <button onClick={() => setCreating(true)} className="pv-card-hover w-full p-4 flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-brand-mint/60 flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5 text-brand-dark" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Utwórz wydarzenie</p>
            <p className="text-xs text-gray-400">Zorganizuj spacer, trening lub spotkanie członków grupy</p>
          </div>
        </button>
      )}

      {loading ? (
        <div className="pv-card p-10 text-center"><Loader2 className="w-7 h-7 mx-auto text-brand animate-spin" /></div>
      ) : upcoming.length === 0 && past.length === 0 ? (
        <div className="pv-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
            <CalendarDays className="w-7 h-7 text-brand" />
          </div>
          <h3 className="pv-section-title mb-2">Brak wydarzeń</h3>
          <p className="text-gray-500">{canInteract ? 'Utwórz pierwsze wydarzenie dla grupy!' : 'Dołącz do grupy, aby tworzyć wydarzenia.'}</p>
        </div>
      ) : (
        <>
          {upcoming.map((e) => <EventCard key={e.id} ev={e} />)}
          {past.length > 0 && (
            <>
              <p className="px-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Minione wydarzenia</p>
              {past.map((e) => <EventCard key={e.id} ev={e} past />)}
            </>
          )}
        </>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in px-3 pt-[5vh] sm:pt-4 pb-20 sm:pb-4 overflow-y-auto" onClick={() => setCreating(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Nowe wydarzenie</h3>
              <button onClick={() => setCreating(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Zamknij"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Nazwa, np. Wspólny spacer po Błoniach" maxLength={140} className={inputCls} autoFocus />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Data</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Godzina</label>
                  <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className={inputCls} />
                </div>
              </div>
              <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Miejsce (np. park, adres)" maxLength={200} className={inputCls} />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Opis wydarzenia (opcjonalnie)" rows={3} className={`${inputCls} resize-none`} />
              <div>
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && pickImage(e.target.files[0])} />
                {form.coverImage ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={form.coverImage} alt="" className="w-full h-36 object-cover" />
                    <button onClick={() => setForm({ ...form, coverImage: null })} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => imgRef.current?.click()} className="w-full px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-gray-500 text-sm hover:border-brand-dark/40 hover:text-brand-dark flex items-center justify-center gap-2 transition-all">
                    <ImagePlus className="w-4 h-4" /> Dodaj okładkę (opcjonalnie)
                  </button>
                )}
              </div>
              {/* Bilety */}
              <div className="rounded-xl border border-gray-200 p-3.5 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-amber-600" /> Wydarzenie biletowane
                  </span>
                  <input
                    type="checkbox"
                    checked={form.ticketsEnabled}
                    onChange={(e) => setForm({ ...form, ticketsEnabled: e.target.checked })}
                    className="w-5 h-5 rounded accent-[#1B6B4A]"
                  />
                </label>
                {form.ticketsEnabled && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Liczba biletów *</label>
                        <input type="number" min={1} max={10000} inputMode="numeric" value={form.ticketTotal}
                          onChange={(e) => setForm({ ...form, ticketTotal: e.target.value })}
                          placeholder="np. 20" className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Cena (zł)</label>
                        <input type="number" min={0} step="0.01" inputMode="decimal" value={form.ticketPrice}
                          onChange={(e) => setForm({ ...form, ticketPrice: e.target.value })}
                          placeholder="0 = bezpłatne" className={inputCls} />
                      </div>
                    </div>
                    <input type="text" value={form.ticketInfo} onChange={(e) => setForm({ ...form, ticketInfo: e.target.value })}
                      placeholder="Jak odebrać / zapłacić? (np. przelew na nr konta, płatność na miejscu)" maxLength={500} className={inputCls} />
                    {form.ticketPrice !== '' && parseFloat(form.ticketPrice.replace(',', '.')) > 0 && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                        PetVio nie przetwarza jeszcze płatności online — uczestnicy zarezerwują bilet, a płatność odbędzie się u organizatora.
                      </p>
                    )}
                  </div>
                )}
              </div>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <button onClick={create} disabled={submitting || !form.title.trim() || !form.date}
                className="w-full pv-btn-primary px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                Utwórz wydarzenie
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Usunąć wydarzenie?"
        description={deleteTarget ? `Wydarzenie „${deleteTarget.title}" zostanie trwale usunięte wraz z odpowiedziami i rezerwacjami biletów.` : ''}
        confirmLabel="Usuń"
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
