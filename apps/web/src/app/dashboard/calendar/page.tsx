'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Calendar, ChevronLeft, ChevronRight, Trash2, CheckCircle2,
  Circle, PawPrint, Clock, Pencil, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { petApi, healthRecordApi, calendarApi } from '@/lib/api';
import CalendarEventModal from '@/components/CalendarEventModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import PageHeader from '@/components/PageHeader';

const TYPE_COLORS: Record<string, string> = {
  vaccination: '#1B6B4A',   // zieleń brandowa
  medication: '#3B82F6',    // niebieski
  deworming: '#F59E0B',     // bursztyn
  visit: '#8B5CF6',         // fiolet
  other: '#94a3b8',         // szary
};

const TYPE_LABELS: Record<string, string> = {
  vaccination: 'Szczepienie',
  medication: 'Lek',
  deworming: 'Profilaktyka',
  visit: 'Wizyta',
  other: 'Inne',
};

// Poprawne linki tylko dla typów rekordów zdrowia
const HEALTH_HREFS: Record<string, string> = {
  vaccination: 'vaccinations',
  medication: 'medications',
  deworming: 'prevention',
  visit: 'visits',
};

interface CalEvent {
  id: string;               // 'cal-12' | 'rec-34'
  isCalEvent: boolean;      // wydarzenie z health_calendar (można edytować/usuwać)
  rawId?: number;
  title: string;
  description?: string;
  dateStr: string;          // 'YYYY-MM-DD' z bazy — bez interpretacji stref czasowych
  date: Date;
  type: string;
  petName: string;
  petId: number;
  completed?: boolean;
  reminderEnabled?: boolean;
}

const dateStrToLocal = (s: string) => new Date(`${String(s).slice(0, 10)}T00:00:00`);

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysUntil = (d: Date) =>
  Math.ceil((d.getTime() - startOfToday().getTime()) / (24 * 3600 * 1000));

export default function CalendarPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [petsList, setPetsList] = useState<any[]>([]);
  const [loadError, setLoadError] = useState('');
  const [eventToDelete, setEventToDelete] = useState<CalEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);

  const loadData = useCallback(async () => {
    setLoadError('');
    try {
      // Jedno zapytanie o zwierzęta + jedno o wszystkie rekordy zdrowia (zamiast N+1 per pupil)
      const [petRes, recordsRes, calRes] = await Promise.all([
        petApi.getAll(),
        healthRecordApi.getAll(),
        calendarApi.getAll(),
      ]);
      const petList = petRes.pets || (Array.isArray(petRes) ? petRes : []);
      const petMap: Record<string, any> = {};
      petList.forEach((p: any) => (petMap[p.id] = p));

      const allEvents: CalEvent[] = [];

      (recordsRes.records || []).forEach((r: any) => {
        if (!r.next_date) return;
        allEvents.push({
          id: `rec-${r.id}`,
          isCalEvent: false,
          title: r.title,
          dateStr: String(r.next_date).slice(0, 10),
          date: dateStrToLocal(r.next_date),
          type: r.record_type,
          petName: petMap[r.pet_id]?.name || r.pet_name || '',
          petId: r.pet_id,
        });
      });

      (calRes.events || []).forEach((e: any) => {
        allEvents.push({
          id: `cal-${e.id}`,
          isCalEvent: true,
          rawId: e.id,
          title: e.title,
          description: e.description || '',
          dateStr: String(e.event_date).slice(0, 10),
          date: dateStrToLocal(e.event_date),
          type: e.event_type,
          petName: petMap[e.pet_id]?.name || e.pet_name || '',
          petId: e.pet_id,
          completed: !!e.completed,
          reminderEnabled: e.reminder_enabled !== false,
        });
      });

      setPetsList(petList);
      setEvents(allEvents);
    } catch (error) {
      console.error('Calendar load error:', error);
      setLoadError('Nie udało się pobrać kalendarza. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7; // poniedziałek pierwszy

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const weekdays = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

  const eventsForDay = (day: number) =>
    events.filter(
      (e) => e.date.getFullYear() === year && e.date.getMonth() === month && e.date.getDate() === day
    );

  const formatDate = (d: Date) =>
    d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

  // Nadchodzące wydarzenia (w tym dzisiejsze — porównanie do początku dnia)
  const upcomingEvents = useMemo(() => {
    const t = startOfToday();
    return events
      .filter((e) => {
        if (e.completed) return false;
        const day = new Date(e.date);
        day.setHours(0, 0, 0, 0);
        return day >= t;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
    setSelectedDay(null);
  };

  const getEventHref = (e: CalEvent) =>
    e.isCalEvent ? null : `/dashboard/health/${e.petId}/${HEALTH_HREFS[e.type] || 'visits'}`;

  const confirmDelete = async () => {
    const e = eventToDelete;
    if (!e?.isCalEvent || !e.rawId) return;
    setDeleting(true);
    setActionError('');
    try {
      await calendarApi.delete(e.rawId);
      setEvents((ev) => ev.filter((x) => x.id !== e.id));
      setEventToDelete(null);
    } catch {
      setActionError('Nie udało się usunąć wydarzenia. Spróbuj ponownie.');
    } finally {
      setDeleting(false);
    }
  };

  const toggleCompleted = async (e: CalEvent) => {
    if (!e.isCalEvent || !e.rawId) return;
    setActionError('');
    try {
      await calendarApi.update(e.rawId, { completed: !e.completed });
      setEvents((ev) => ev.map((x) => (x.id === e.id ? { ...x, completed: !e.completed } : x)));
    } catch {
      setActionError('Nie udało się zaktualizować wydarzenia. Spróbuj ponownie.');
    }
  };

  const countdownLabel = (e: CalEvent) => {
    const d = daysUntil(e.date);
    if (d === 0) return 'Dziś!';
    if (d === 1) return 'Jutro';
    return `Za ${d} dni`;
  };

  const EventRow = ({ e }: { e: CalEvent }) => {
    const href = getEventHref(e);
    const inner = (
      <>
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
          style={{ background: TYPE_COLORS[e.type] || TYPE_COLORS.other }}
        >
          <PawPrint className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm truncate ${e.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
            {e.title}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {TYPE_LABELS[e.type] || 'Inne'} · {e.petName}
          </p>
        </div>
      </>
    );
    return (
      <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-brand-mint/60 transition-colors">
        {href ? (
          <Link href={href} className="flex items-center gap-3 flex-1 min-w-0">
            {inner}
          </Link>
        ) : (
          <button onClick={() => toggleCompleted(e)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            {inner}
          </button>
        )}
        {e.isCalEvent && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => toggleCompleted(e)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                e.completed ? 'text-brand bg-brand-mint' : 'text-gray-400 hover:text-brand-dark hover:bg-white'
              }`}
              aria-label={e.completed ? 'Odznacz' : 'Oznacz jako zrobione'}
            >
              {e.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setEditingEvent(e)}
              className="w-8 h-8 rounded-xl text-gray-400 hover:bg-brand-mint hover:text-brand-dark transition-all flex items-center justify-center"
              aria-label="Edytuj wydarzenie"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEventToDelete(e)}
              className="w-8 h-8 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center"
              aria-label="Usuń wydarzenie"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const Banner = (
    <PageHeader
      title="Kalendarz zdrowia"
      description="Planuj szczepienia, wizyty, leki i inne wydarzenia"
      icon={Calendar}
      action={
        <button
          onClick={() => setIsModalOpen(true)}
          className="pv-btn bg-white text-brand-dark px-5 py-3 text-sm font-bold shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Dodaj termin
        </button>
      }
    />
  );

  if (loading) {
    return (
      <div className="space-y-7">
        {Banner}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 pv-card p-6">
            <div className="pv-skeleton h-8 w-48 mb-6" />
            <div className="grid grid-cols-7 gap-2">
              {[...Array(35)].map((_, i) => (
                <div key={i} className="pv-skeleton aspect-square rounded-xl" />
              ))}
            </div>
          </div>
          <div className="pv-card p-6 space-y-3">
            <div className="pv-skeleton h-6 w-40 mb-2" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="pv-skeleton h-16 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loadError && events.length === 0) {
    return (
      <div className="space-y-7">
        {Banner}
        <div className="pv-card p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <p className="font-semibold text-gray-900 mb-1">Nie udało się załadować kalendarza</p>
          <p className="text-sm text-gray-500 mb-5">{loadError}</p>
          <button onClick={loadData} className="pv-btn-primary px-6 py-3 text-sm">
            <RefreshCw className="w-4 h-4" /> Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {Banner}

      {actionError && (
        <div className="pv-card p-4 flex items-center justify-between gap-3 border-red-100 bg-red-50/60 animate-fade-in">
          <p className="text-sm text-red-600 font-medium">{actionError}</p>
          <button onClick={() => setActionError('')} className="text-red-400 hover:text-red-600 text-xs font-bold">
            Zamknij
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ====== KALENDARZ ====== */}
        <div className="lg:col-span-2 pv-card p-4 sm:p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl font-normal text-gray-900 capitalize">{monthName}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="w-9 h-9 rounded-full border border-gray-200 text-gray-500 hover:border-brand-dark hover:text-brand-dark hover:bg-brand-mint active:scale-90 transition-all flex items-center justify-center"
                aria-label="Poprzedni miesiąc"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDay(today.getDate()); }}
                className="px-4 py-2 rounded-full text-sm font-semibold text-brand-dark hover:bg-brand-mint transition-all"
              >
                Dziś
              </button>
              <button
                onClick={() => changeMonth(1)}
                className="w-9 h-9 rounded-full border border-gray-200 text-gray-500 hover:border-brand-dark hover:text-brand-dark hover:bg-brand-mint active:scale-90 transition-all flex items-center justify-center"
                aria-label="Następny miesiąc"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekdays.map((d, i) => (
              <div
                key={d}
                className={`text-center text-xs font-bold uppercase py-2 ${i >= 5 ? 'text-brand/60' : 'text-gray-400'}`}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const dayEvents = day ? eventsForDay(day) : [];
              const isSelected = selectedDay === day;
              const isWeekend = day !== null && (startOffset + day - 1) % 7 >= 5;

              return (
                <button
                  key={i}
                  onClick={() => day && setSelectedDay(isSelected ? null : day)}
                  disabled={!day}
                  className={`aspect-square flex flex-col items-center justify-center rounded-2xl text-sm transition-all duration-200 relative ${
                    day === null
                      ? ''
                      : isToday
                      ? 'bg-gradient-to-br from-brand to-brand-dark text-white font-bold shadow-lg shadow-brand-dark/25 scale-105'
                      : isSelected
                      ? 'bg-brand-mint text-brand-dark font-bold ring-2 ring-brand/40'
                      : `text-gray-700 hover:bg-brand-mint/60 hover:scale-105 active:scale-95 ${isWeekend ? 'bg-brand-cream/70' : ''}`
                  }`}
                >
                  {day && (
                    <>
                      <span className="relative z-10">{day}</span>
                      {dayEvents.length > 0 && (
                        <div className="flex items-center gap-0.5 mt-1 justify-center">
                          {dayEvents.slice(0, 3).map((e, idx) => (
                            <span
                              key={idx}
                              className={`w-1.5 h-1.5 rounded-full ${e.completed ? 'opacity-30' : ''}`}
                              style={{ backgroundColor: isToday ? '#fff' : TYPE_COLORS[e.type] || TYPE_COLORS.other }}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className={`text-[9px] font-bold leading-none ${isToday ? 'text-white/80' : 'text-gray-400'}`}>
                              +{dayEvents.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Wydarzenia wybranego dnia */}
          {selectedDay && (
            <div className="mt-6 border-t border-gray-100 pt-5 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="pv-section-title text-base">
                  {selectedDay} {currentDate.toLocaleDateString('pl-PL', { month: 'long' })} {year}
                </h3>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs font-bold text-brand-dark hover:text-brand inline-flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Dodaj w tym dniu
                </button>
              </div>
              <div className="space-y-1">
                {eventsForDay(selectedDay).length === 0 ? (
                  <p className="text-sm text-gray-400 py-3 text-center">Brak wydarzeń w tym dniu.</p>
                ) : (
                  eventsForDay(selectedDay).map((e) => <EventRow key={e.id} e={e} />)
                )}
              </div>
            </div>
          )}
        </div>

        {/* ====== SIDEBAR ====== */}
        <div className="space-y-6">
          <div className="pv-card overflow-hidden animate-slide-up stagger-2">
            <div className="px-6 py-5 border-b border-gray-100/80">
              <h3 className="pv-section-title flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand" /> Najbliższe terminy
              </h3>
            </div>
            <div className="p-4 sm:p-5">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-brand-mint flex items-center justify-center animate-float">
                    <Calendar className="w-6 h-6 text-brand-dark" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Brak nadchodzących terminów</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-xs text-brand-dark font-bold hover:underline"
                  >
                    Dodaj nowy termin
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {upcomingEvents.slice(0, 8).map((e) => {
                    const href = getEventHref(e);
                    const inner = (
                      <>
                        <div
                          className="w-11 h-11 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 text-white shadow-sm"
                          style={{ background: TYPE_COLORS[e.type] || TYPE_COLORS.other }}
                        >
                          <span className="text-sm font-bold leading-none">{e.date.getDate()}</span>
                          <span className="text-[8px] uppercase font-semibold opacity-80 leading-none mt-0.5">
                            {e.date.toLocaleDateString('pl-PL', { month: 'short' })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{e.title}</p>
                          <p className="text-xs text-gray-500 truncate">{e.petName} · {TYPE_LABELS[e.type] || 'Inne'}</p>
                        </div>
                        <span className="text-[11px] font-bold text-brand-dark bg-brand-mint px-2.5 py-1 rounded-full flex-shrink-0">
                          {countdownLabel(e)}
                        </span>
                      </>
                    );
                    return href ? (
                      <Link key={e.id} href={href} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-brand-mint transition-colors">
                        {inner}
                      </Link>
                    ) : (
                      <button key={e.id} onClick={() => toggleCompleted(e)} className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-brand-mint transition-colors text-left">
                        {inner}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Legenda */}
          <div className="pv-card p-6 animate-slide-up stagger-4">
            <h3 className="pv-section-title text-base mb-4">Legenda</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[key] }} />
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
              Kropki na kalendarzu — terminy z książeczek zdrowia oraz własne wydarzenia. Własne wydarzenia możesz odhaczać i usuwać.
            </p>
          </div>
        </div>
      </div>

      <CalendarEventModal
        isOpen={isModalOpen || !!editingEvent}
        pets={petsList}
        initialDate={
          selectedDay && !editingEvent
            ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
            : undefined
        }
        editingEvent={
          editingEvent?.isCalEvent
            ? {
                id: editingEvent.rawId!,
                petId: editingEvent.petId,
                eventType: editingEvent.type,
                eventDate: editingEvent.dateStr,
                title: editingEvent.title,
                description: editingEvent.description || '',
                reminderEnabled: editingEvent.reminderEnabled !== false,
              }
            : undefined
        }
        onClose={() => { setIsModalOpen(false); setEditingEvent(null); }}
        onSaved={loadData}
      />

      <ConfirmModal
        isOpen={!!eventToDelete}
        onCancel={() => !deleting && setEventToDelete(null)}
        onConfirm={confirmDelete}
        title="Usunąć wydarzenie?"
        description={
          eventToDelete
            ? `„${eventToDelete.title}" (${formatDate(eventToDelete.date)}) zostanie trwale usunięte z kalendarza.`
            : undefined
        }
        confirmLabel="Usuń wydarzenie"
        loading={deleting}
      />
    </div>
  );
}
