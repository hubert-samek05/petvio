'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Calendar } from 'lucide-react';
import { petApi, healthRecordApi, calendarApi } from '@/lib/api';
import CalendarEventModal from '@/components/CalendarEventModal';
import PageHeader from '@/components/PageHeader';

const TYPE_COLORS: Record<string, string> = {
  vaccination: '#1B6B4A',
  medication: '#2A8A5C',
  deworming: '#3D9A6A',
  visit: '#0F3D2E',
  other: '#94a3b8',
};

const TYPE_LABELS: Record<string, string> = {
  vaccination: 'Szczepienie',
  medication: 'Lek',
  deworming: 'Profilaktyka',
  visit: 'Wizyta',
  other: 'Inne',
};

export default function CalendarPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [pets, setPets] = useState<Record<string, any>>({});
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [petsList, setPetsList] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const petRes = await petApi.getAll();
      const petList = petRes.pets || [];
      const petMap: Record<string, any> = {};
      petList.forEach((p: any) => (petMap[p.id] = p));

      const allEvents: any[] = [];
      for (const pet of petList) {
        const recRes = await healthRecordApi.getByPet(pet.id);
        (recRes.records || []).forEach((r: any) => {
          if (r.next_date) {
            allEvents.push({ ...r, pet });
          }
        });
      }

      const calRes = await calendarApi.getAll();
      (calRes.events || []).forEach((e: any) => {
        const pet = petMap[e.pet_id] || { name: e.pet_name, species: e.pet_species };
        allEvents.push({
          ...e,
          id: `cal-${e.id}`,
          record_type: e.event_type,
          next_date: e.event_date,
          pet_id: e.pet_id,
          pet,
        });
      });

      setPetsList(petList);
      setPets(petMap);
      setEvents(allEvents);
    } catch (error) {
      console.error('Calendar load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday first

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const weekdays = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

  const eventsForDay = (day: number) =>
    events.filter((e) => {
      const d = new Date(e.next_date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => new Date(e.next_date) >= now)
      .sort((a, b) => new Date(a.next_date).getTime() - new Date(b.next_date).getTime())
      .slice(0, 8);
  }, [events]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
    setSelectedDay(null);
  };

  const getEventHref = (e: any) => {
    if (e.record_type === 'other') return null;
    const category = e.record_type === 'deworming' ? 'prevention' : e.record_type + 's';
    return `/dashboard/health/${e.pet_id}/${category}`;
  };

  const Banner = () => (
    <PageHeader
      title="Kalendarz zdrowia"
      description="Planuj szczepienia, wizyty, leki i inne wydarzenia"
      icon={Calendar}
      action={
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center w-fit bg-white text-brand-dark px-4 py-2 rounded-full font-medium text-sm hover:bg-gray-50 transition-all"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Dodaj termin
        </button>
      }
    />
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <Banner />
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-gray-500">Ładowanie kalendarza...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Banner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 capitalize">{monthName}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="w-9 h-9 rounded-full border border-gray-200 text-gray-600 hover:border-brand-dark hover:text-brand-dark transition-all flex items-center justify-center"
              >
                ←
              </button>
              <button
                onClick={() => setCurrentDate(today)}
                className="px-4 py-2 rounded-full text-sm font-medium text-brand-dark hover:bg-brand-dark/5 transition-all"
              >
                Dziś
              </button>
              <button
                onClick={() => changeMonth(1)}
                className="w-9 h-9 rounded-full border border-gray-200 text-gray-600 hover:border-brand-dark hover:text-brand-dark transition-all flex items-center justify-center"
              >
                →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekdays.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 uppercase py-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const dayEvents = day ? eventsForDay(day) : [];
              const isSelected = selectedDay === day;

              return (
                <button
                  key={i}
                  onClick={() => day && setSelectedDay(isSelected ? null : day)}
                  disabled={!day}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all relative ${
                    day === null
                      ? ''
                      : isToday
                      ? 'bg-brand-dark text-white font-semibold shadow-md shadow-brand-dark/20'
                      : isSelected
                      ? 'bg-brand-dark/10 text-gray-900 font-medium ring-2 ring-brand-dark/30'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {day && (
                    <>
                      <span className="relative z-10">{day}</span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5 mt-1 justify-center flex-wrap px-1">
                          {dayEvents.slice(0, 3).map((e, idx) => (
                            <span
                              key={idx}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: isToday ? '#fff' : TYPE_COLORS[e.record_type] || '#94a3b8' }}
                            ></span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {selectedDay && (
            <div className="mt-6 border-t border-gray-100 pt-5">
              <h3 className="font-semibold text-gray-900 mb-3">
                Wydarzenia {selectedDay} {currentDate.toLocaleDateString('pl-PL', { month: 'long' })} {year}
              </h3>
              <div className="space-y-2">
                {eventsForDay(selectedDay).length === 0 ? (
                  <p className="text-sm text-gray-500">Brak wydarzeń w tym dniu.</p>
                ) : (
                  eventsForDay(selectedDay).map((e) => {
                    const href = getEventHref(e);
                    const content = (
                      <>
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: TYPE_COLORS[e.record_type] }}
                        ></span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{e.title}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {TYPE_LABELS[e.record_type]} · {e.pet?.name}
                          </p>
                        </div>
                        {href && <span className="text-gray-400 text-xs">→</span>}
                      </>
                    );
                    return href ? (
                      <Link
                        key={e.id}
                        href={href}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div
                        key={e.id}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all"
                      >
                        {content}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Upcoming sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Najbliższe wydarzenia</h3>
            <p className="text-sm text-gray-500 mb-5">Przypomnienia z książeczek zdrowia</p>

            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-dashed border-brand"></div>
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">Brak nadchodzących wydarzeń</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs text-brand-dark font-medium hover:underline"
                >
                  Dodaj nowy termin
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((e) => {
                  const href = getEventHref(e);
                  const content = (
                    <>
                      <div
                        className="w-2.5 h-2.5 rounded-full mt-1.5"
                        style={{ backgroundColor: TYPE_COLORS[e.record_type] }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm leading-snug">{e.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {e.pet?.name} · {TYPE_LABELS[e.record_type]}
                        </p>
                        <p className="text-xs font-semibold text-brand-dark mt-2">{formatDate(e.next_date)}</p>
                      </div>
                    </>
                  );
                  return href ? (
                    <Link
                      key={e.id}
                      href={href}
                      className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-brand-dark/30 hover:bg-gray-50/50 transition-all group"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      key={e.id}
                      className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-brand-dark/30 hover:bg-gray-50/50 transition-all group"
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Legenda</h3>
            <div className="space-y-3">
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: TYPE_COLORS[key] }}></span>
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CalendarEventModal
        isOpen={isModalOpen}
        pets={petsList}
        initialDate={
          selectedDay
            ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
            : undefined
        }
        onClose={() => setIsModalOpen(false)}
        onSaved={loadData}
      />
    </div>
  );
}
