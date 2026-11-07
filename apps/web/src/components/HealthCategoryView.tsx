'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Pencil, ChevronRight, ChevronLeft, X, ArrowLeft, PawPrint, Plus, CalendarClock, Search, Syringe, Shield, Pill, Stethoscope, AlertTriangle } from 'lucide-react';
import { petApi, healthRecordApi } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { daysUntilDate, isDateOverdue, isDateUpcoming } from '@/lib/dates';

export type CategoryConfig = {
  key: string;
  title: string;
  desc: string;
  accent: string;
  bg: string;
  placeholder: string;
  nextDateLabel: string;
};

const emptyForm = {
  title: '',
  recordDate: '',
  nextDate: '',
  veterinarian: '',
  description: '',
};

type SortMode = 'newest' | 'oldest' | 'next';
type ModalMode = 'closed' | 'detail' | 'wizard';

const CATEGORY_ICONS: Record<string, any> = {
  vaccination: Syringe,
  deworming: Shield,
  medication: Pill,
  visit: Stethoscope,
};

const CHAPTER_NUM: Record<string, string> = {
  vaccination: '01',
  deworming: '02',
  medication: '03',
  visit: '04',
};

export default function HealthCategoryView({
  petId,
  config,
}: {
  petId: number;
  config: CategoryConfig;
}) {
  const router = useRouter();
  const [pet, setPet] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue'>('all');

  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [viewingRecord, setViewingRecord] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [petRes, recRes] = await Promise.all([
        petApi.getById(petId),
        healthRecordApi.getByPet(petId),
      ]);
      setPet(petRes.pet || petRes);
      setRecords((recRes.records || []).filter((r: any) => r.record_type === config.key));
    } catch (err: any) {
      if (err?.response?.status === 404) {
        router.push('/dashboard/health');
      } else {
        setLoadError('Nie udało się pobrać wpisów');
      }
    } finally {
      setLoading(false);
    }
  }, [petId, router, config.key]);

  useEffect(() => {
    if (petId) load();
  }, [petId, load]);

  const openAdd = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setStep(1);
    setError('');
    setModalMode('wizard');
    setViewingRecord(null);
  };

  const openDetail = (record: any) => {
    setViewingRecord(record);
    setModalMode('detail');
  };

  const openEdit = (record: any) => {
    setForm({
      title: record.title || '',
      recordDate: record.record_date?.slice(0, 10) || '',
      nextDate: record.next_date?.slice(0, 10) || '',
      veterinarian: record.veterinarian || '',
      description: record.description || '',
    });
    setEditingId(record.id);
    setStep(1);
    setError('');
    setModalMode('wizard');
  };

  const closeModal = () => {
    setModalMode('closed');
    setViewingRecord(null);
    setEditingId(null);
    setForm({ ...emptyForm });
    setStep(1);
    setError('');
  };

  useEffect(() => {
    if (modalMode === 'closed') return;

    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.touchAction = 'none';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.touchAction = '';
      window.scrollTo(0, scrollY);
    };
  }, [modalMode]);

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        petId,
        recordType: config.key,
        title: form.title,
        recordDate: form.recordDate,
        nextDate: form.nextDate || null,
        veterinarian: form.veterinarian || null,
        description: form.description || null,
      };
      if (editingId) {
        await healthRecordApi.update(editingId, payload);
      } else {
        await healthRecordApi.create(payload);
      }
      closeModal();
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Wystąpił błąd podczas zapisywania');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await healthRecordApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      closeModal();
      await load();
    } catch (err: any) {
      setDeleteError(err.response?.data?.error?.message || 'Nie udało się usunąć wpisu');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const daysUntil = (d: string) => daysUntilDate(d);

  const upcoming = records
    .filter((r) => isDateUpcoming(r.next_date))
    .sort((a, b) => a.next_date.localeCompare(b.next_date));
  const overdue = records.filter((r) => isDateOverdue(r.next_date));

  const visible = records
    .filter((r) => {
      if (filter === 'upcoming') return isDateUpcoming(r.next_date);
      if (filter === 'overdue') return isDateOverdue(r.next_date);
      return true;
    })
    .filter((r) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.title?.toLowerCase().includes(q) ||
        r.veterinarian?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.record_date).getTime() - new Date(a.record_date).getTime();
      if (sort === 'oldest') return new Date(a.record_date).getTime() - new Date(b.record_date).getTime();
      const an = a.next_date ? new Date(a.next_date).getTime() : Infinity;
      const bn = b.next_date ? new Date(b.next_date).getTime() : Infinity;
      return an - bn;
    });

  const stepValid = () => {
    if (step === 1) return form.title && form.recordDate;
    return true;
  };

  const nextStep = () => {
    if (!stepValid()) {
      setError('Uzupełnij wymagane pola, aby przejść dalej');
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, 3));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const stepTitles = ['Podstawowe informacje', 'Weterynarz i termin', 'Notatki i podsumowanie'];

  const WizardField = ({
    label,
    optional,
    children,
    full,
  }: {
    label: string;
    optional?: boolean;
    children: React.ReactNode;
    full?: boolean;
  }) => (
    <div className={`p-5 pv-card shadow-sm focus-within:border-brand-dark/50 focus-within:ring-2 focus-within:ring-[#1B6B4A]/10 transition-all ${full ? 'sm:col-span-2' : ''}`}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        {label}
        {optional && <span className="normal-case font-normal text-gray-400"> (opcjonalnie)</span>}
      </label>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-7">
        <div className="pv-skeleton h-6 w-48" />
        <div className="pv-skeleton h-56 rounded-[28px]" />
        <div className="pv-skeleton h-11 w-72 max-w-full rounded-full" />
        <div className="pv-card p-4 space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="pv-skeleton h-16 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="pv-card p-10 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <p className="font-semibold text-gray-900 mb-1">Nie udało się pobrać wpisów</p>
        <p className="text-sm text-gray-500 mb-5">Sprawdź połączenie i spróbuj ponownie.</p>
        <button onClick={load} className="pv-btn-primary px-8 py-3">Spróbuj ponownie</button>
      </div>
    );
  }

  const CategoryIcon = CATEGORY_ICONS[config.key] || PawPrint;

  // Grupowanie wpisów po miesiącach (zachowuje kolejność sortowania)
  const groups: { label: string; items: any[] }[] = (() => {
    if (sort === 'next') return [{ label: '', items: visible }];
    const out: { label: string; items: any[] }[] = [];
    for (const r of visible) {
      const d = new Date(r.record_date);
      const label = d.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(r);
      else out.push({ label, items: [r] });
    }
    return out;
  })();

  return (
    <div className="space-y-7">
      <Link
        href={`/dashboard/health/${petId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-dark hover:text-brand-dark transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Wróć do książeczki zdrowia
      </Link>

      {/* ====== STRONA ROZDZIAŁU — nagłówek w stylu okładki ====== */}
      <div className="pv-card relative overflow-hidden animate-slide-down">
        {/* Grzbiet książeczki */}
        <span
          className="absolute left-0 top-0 bottom-0 w-2.5"
          style={{ background: `linear-gradient(180deg, #0F3D2E 0%, ${config.accent} 100%)` }}
          aria-hidden
        />
        {/* Tekstura papieru */}
        <span
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(27,107,74,0.05) 1px, transparent 1.4px)',
            backgroundSize: '16px 16px',
          }}
          aria-hidden
        />

        <div className="relative pl-7 sm:pl-9 pr-5 sm:pr-7 py-6 sm:py-7 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
            style={{ background: config.accent }}
          >
            <CategoryIcon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
              Rozdział {CHAPTER_NUM[config.key] || ''}{pet?.name ? ` · ${pet.name}` : ''}
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-gray-900 mt-0.5">
              {config.title}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{config.desc}</p>
          </div>
          <button onClick={openAdd} className="pv-btn-primary px-6 py-3 flex-shrink-0 self-start sm:self-center">
            <Plus className="w-4 h-4" /> Dodaj wpis
          </button>
        </div>

        {/* Licznik rozdziału */}
        <div className="relative flex divide-x divide-gray-100 border-t border-gray-100/80 bg-brand-mint/40">
          {[
            { v: records.length, l: 'wpisów', red: false },
            { v: upcoming.length, l: 'nadchodzących', red: false },
            { v: overdue.length, l: 'zaległych', red: overdue.length > 0 },
          ].map((s) => (
            <div key={s.l} className="flex-1 py-3.5 text-center">
              <p className={`font-serif text-xl leading-none tabular-nums ${s.red ? 'text-red-500' : 'text-brand-dark'}`}>
                {s.v}
              </p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-gray-400 mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ====== ZALEGŁE ====== */}
      {overdue.length > 0 && (
        <button
          onClick={() => openDetail([...overdue].sort((a, b) => a.next_date.localeCompare(b.next_date))[0])}
          className="w-full text-left pv-card !border-red-100 !bg-red-50/60 p-4 sm:p-5 flex items-center gap-4 animate-pop-in group"
        >
          <span className="w-11 h-11 rounded-2xl bg-red-100 text-red-500 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-red-600 text-sm">
              {overdue.length} {overdue.length === 1 ? 'zaległy termin' : 'zaległe terminy'} — wymaga uwagi
            </p>
            <p className="text-xs text-red-400 mt-0.5 line-clamp-2">
              Najstarszy: {[...overdue].sort((a, b) => new Date(a.next_date).getTime() - new Date(b.next_date).getTime())[0]?.title}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-red-300 group-hover:text-red-500 transition-colors flex-shrink-0" />
        </button>
      )}

      {/* ====== NAJBLIŻSZY TERMIN — odliczanie ====== */}
      {upcoming.length > 0 && (
        <button
          onClick={() => openDetail(upcoming[0])}
          className="w-full text-left pv-card p-5 flex items-center gap-4 sm:gap-5 hover:!border-brand/30 transition-all animate-slide-up stagger-1 group"
        >
          <div className="flex-shrink-0 w-[64px] text-center">
            <p className="font-serif text-3xl sm:text-4xl text-brand-dark leading-none">
              {daysUntil(upcoming[0].next_date) === 0 ? 'dziś' : daysUntil(upcoming[0].next_date)}
            </p>
            {daysUntil(upcoming[0].next_date) > 0 && (
              <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400 mt-1">
                {daysUntil(upcoming[0].next_date) === 1 ? 'dzień' : 'dni'}
              </p>
            )}
          </div>
          <span className="w-px self-stretch bg-gray-100 flex-shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: config.accent }}>
              Najbliższy termin
            </p>
            <p className="font-serif text-lg font-normal text-gray-900 line-clamp-2 group-hover:text-brand-dark transition-colors">
              {upcoming[0].title}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(upcoming[0].next_date)}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-dark group-hover:translate-x-1 transition-all flex-shrink-0" />
        </button>
      )}

      {/* ====== FILTRY + SZUKAJ ====== */}
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {([
            { key: 'all', label: 'Wszystkie', n: records.length },
            { key: 'upcoming', label: 'Nadchodzące', n: upcoming.length },
            { key: 'overdue', label: 'Zaległe', n: overdue.length },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                filter === f.key
                  ? 'bg-brand-dark text-white shadow-md'
                  : 'bg-white border border-gray-200/80 text-gray-500 hover:border-brand hover:text-brand-dark'
              }`}
            >
              {f.label}
              <span
                className={`min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  filter === f.key
                    ? 'bg-white/20 text-white'
                    : f.key === 'overdue' && f.n > 0
                    ? 'bg-red-50 text-red-500'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {f.n}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj wpisów..."
              className="w-full pl-11 pr-5 py-3 rounded-full bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="px-5 py-3 rounded-full bg-white border border-gray-200 text-gray-700 font-medium focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all cursor-pointer"
          >
            <option value="newest">Od najnowszych</option>
            <option value="oldest">Od najstarszych</option>
            <option value="next">Wg następnego terminu</option>
          </select>
        </div>
      </div>

      {/* Records */}
      {visible.length === 0 ? (
        <div className="pv-card p-14 text-center animate-pop-in">
          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-brand-mint flex items-center justify-center animate-float">
            <PawPrint className="w-9 h-9 text-brand-dark" />
          </div>
          <h3 className="font-serif text-xl font-normal text-gray-900 mb-2">
            {search ? 'Brak wyników wyszukiwania' : 'Brak wpisów'}
          </h3>
          <p className="text-gray-500 mb-6">{search ? 'Spróbuj innej frazy' : config.desc}</p>
          {!search && (
            <button onClick={openAdd} className="pv-btn-primary px-8 py-3">
              <Plus className="w-4 h-4" /> Dodaj pierwszy wpis
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.label || 'all'}>
              {g.label && (
                <div className="flex items-center gap-3 mb-2 px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 capitalize flex-shrink-0">
                    {g.label}
                  </h3>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              )}
              <div className="pv-card p-3 sm:p-4">
                {g.items.map((record, i) => {
                  const isOverdue = isDateOverdue(record.next_date);
                  const d = new Date(record.record_date);
                  const isLastItem = i === g.items.length - 1;
                  return (
                    <div
                      key={record.id}
                      onClick={() => openDetail(record)}
                      className="relative flex gap-3.5 pb-3 last:pb-0 cursor-pointer group"
                    >
                      {/* Oś z plakietką daty */}
                      <div className="relative flex flex-col items-center flex-shrink-0">
                        <div
                          className="w-11 h-11 rounded-xl flex flex-col items-center justify-center text-white shadow-sm z-10"
                          style={{ background: isOverdue ? '#DC2626' : config.accent }}
                        >
                          <span className="text-sm font-bold leading-none">{d.getDate()}</span>
                          <span className="text-[8px] uppercase font-semibold opacity-80 leading-none mt-0.5">
                            {d.toLocaleDateString('pl-PL', { month: 'short' })}
                          </span>
                        </div>
                        {!isLastItem && <span className="w-px flex-1 bg-gray-200/80 mt-1.5" aria-hidden />}
                      </div>

                      {/* Treść wpisu */}
                      <div className="flex-1 min-w-0 flex items-center gap-3 rounded-2xl px-3 py-2.5 -ml-1 group-hover:bg-brand-mint/70 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 break-words group-hover:text-brand-dark transition-colors">
                            {record.title}
                          </p>
                          {record.veterinarian ? (
                            <p className="text-sm text-gray-500 line-clamp-2">{record.veterinarian}</p>
                          ) : record.description ? (
                            <p className="text-sm text-gray-500 line-clamp-2">{record.description}</p>
                          ) : null}
                        </div>

                        {record.next_date && (
                          <span
                            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 ${isOverdue ? 'bg-red-50 text-red-600' : ''}`}
                            style={isOverdue ? undefined : { backgroundColor: `${config.accent}14`, color: config.accent }}
                          >
                            <CalendarClock className="w-3.5 h-3.5" />
                            {isOverdue ? 'Zaległe' : formatDate(record.next_date)}
                          </span>
                        )}

                        <div
                          className="flex gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => openEdit(record)}
                            className="w-8 h-8 rounded-xl text-gray-500 bg-white sm:bg-transparent hover:bg-white hover:text-brand-dark transition-all flex items-center justify-center"
                            aria-label="Edytuj"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(record)}
                            className="w-8 h-8 rounded-xl text-red-400 bg-white sm:bg-transparent hover:bg-white hover:text-red-600 transition-all flex items-center justify-center"
                            aria-label="Usuń"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalMode !== 'closed' && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}></div>
          <div className="relative bg-white rounded-[28px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-y-contain animate-scale-in">
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-5 sm:px-8 pt-6 sm:pt-8 pb-4 rounded-t-3xl z-10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: config.accent }}>
                    {config.title}
                  </p>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {modalMode === 'detail' ? 'Szczegóły wpisu' : editingId ? 'Edytuj wpis' : 'Nowy wpis'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">{pet?.name}</p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-5 sm:px-8 pb-6 sm:pb-8">
              {modalMode === 'detail' && viewingRecord ? (
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-16 text-center py-3 rounded-2xl bg-brand-mint/50 border border-brand-light/60">
                      <p className="text-2xl font-semibold text-gray-900 leading-none">
                        {new Date(viewingRecord.record_date).getDate()}
                      </p>
                      <p className="text-xs text-gray-500 uppercase font-semibold mt-1">
                        {new Date(viewingRecord.record_date).toLocaleDateString('pl-PL', { month: 'short' })} {new Date(viewingRecord.record_date).getFullYear()}
                      </p>
                    </div>
                    <div>
                      <h3 className="pv-section-title">{viewingRecord.title}</h3>
                      {viewingRecord.veterinarian && (
                        <p className="text-gray-500 mt-1">{viewingRecord.veterinarian}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-brand-mint/50 border border-brand-light/60">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Data</p>
                      <p className="font-medium text-gray-900">{formatDate(viewingRecord.record_date)}</p>
                    </div>
                    {viewingRecord.next_date && (
                      <div className="p-5 rounded-2xl bg-brand-mint/50 border border-brand-light/60">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{config.nextDateLabel}</p>
                        <p className="font-medium text-gray-900">{formatDate(viewingRecord.next_date)}</p>
                      </div>
                    )}
                  </div>

                  {viewingRecord.description && (
                    <div className="p-5 rounded-2xl bg-brand-mint/50 border border-brand-light/60">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Notatki</p>
                      <p className="text-gray-700 leading-relaxed">{viewingRecord.description}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={() => openEdit(viewingRecord)}
                      className="pv-btn-primary flex-1 py-3.5"
                    >
                      Edytuj wpis
                    </button>
                    <button
                      onClick={() => setDeleteTarget(viewingRecord)}
                      className="pv-btn flex-1 py-3.5 border border-red-200 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" /> Usuń wpis
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Stepper */}
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map((s) => (
                      <div key={s} className="flex-1 flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                            s < step
                              ? 'bg-brand-dark text-white'
                              : s === step
                              ? 'bg-brand-dark/10 text-brand-dark ring-2 ring-[#1B6B4A]'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {s < step ? '✓' : s}
                        </div>
                        <span className={`hidden sm:block text-sm ${s <= step ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                          {stepTitles[s - 1]}
                        </span>
                        {s < 3 && <div className="hidden sm:block flex-1 h-0.5 bg-gray-200 rounded-full"></div>}
                      </div>
                    ))}
                  </div>

                  {error && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                      {error}
                    </div>
                  )}

                  {/* Step 1 */}
                  {step === 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <WizardField label="Nazwa" full>
                        <input
                          type="text"
                          value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          placeholder={config.placeholder}
                          className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
                        />
                      </WizardField>
                      <WizardField label="Data" full>
                        <input
                          type="date"
                          min="1990-01-01"
                          max="2100-12-31"
                          value={form.recordDate}
                          onChange={(e) => setForm({ ...form, recordDate: e.target.value })}
                          className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                        />
                      </WizardField>
                    </div>
                  )}

                  {/* Step 2 */}
                  {step === 2 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <WizardField label="Weterynarz / klinika" optional full>
                        <input
                          type="text"
                          value={form.veterinarian}
                          onChange={(e) => setForm({ ...form, veterinarian: e.target.value })}
                          placeholder="np. lek. wet. Anna Kowalska, Klinika Cztery Łapy"
                          className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
                        />
                      </WizardField>
                      <WizardField label={config.nextDateLabel} optional full>
                        <input
                          type="date"
                          min="1990-01-01"
                          max="2100-12-31"
                          value={form.nextDate}
                          onChange={(e) => setForm({ ...form, nextDate: e.target.value })}
                          className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                        />
                      </WizardField>
                    </div>
                  )}

                  {/* Step 3 */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <WizardField label="Notatki" optional full>
                        <textarea
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          rows={3}
                          placeholder="Dodatkowe informacje, dawkowanie, zalecenia..."
                          className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none resize-none"
                        />
                      </WizardField>

                      <div className="p-6 rounded-2xl bg-brand-mint/50 border border-brand-light/60">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">Podsumowanie</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Nazwa</p>
                            <p className="font-medium text-gray-900">{form.title || '—'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Data</p>
                            <p className="font-medium text-gray-900">{form.recordDate ? formatDate(form.recordDate) : '—'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Weterynarz</p>
                            <p className="font-medium text-gray-900">{form.veterinarian || '—'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">{config.nextDateLabel}</p>
                            <p className="font-medium text-gray-900">{form.nextDate ? formatDate(form.nextDate) : '—'}</p>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-sm text-gray-500">Notatki</p>
                            <p className="font-medium text-gray-900">{form.description || '—'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {step > 1 && (
                      <button
                        onClick={prevStep}
                        className="pv-btn-ghost px-8 py-3.5"
                      >
                        <ChevronLeft className="w-4 h-4" /> Wstecz
                      </button>
                    )}
                    {step < 3 ? (
                      <button
                        onClick={nextStep}
                        className="pv-btn-primary flex-1 py-3.5"
                      >
                        Dalej <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="pv-btn-primary flex-1 py-3.5 disabled:opacity-50"
                      >
                        {saving ? 'Zapisywanie...' : editingId ? 'Zapisz zmiany' : 'Dodaj wpis'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>, document.body
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Usunąć ten wpis?"
        description={deleteTarget ? `Wpis „${deleteTarget.title}” zostanie trwale usunięty z książeczki.` : undefined}
        details={deleteError ? [deleteError] : undefined}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError('');
        }}
      />
    </div>
  );
}
