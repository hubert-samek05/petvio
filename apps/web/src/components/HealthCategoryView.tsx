'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Pencil, ChevronRight, ChevronLeft, X, ArrowLeft } from 'lucide-react';
import { petApi, healthRecordApi } from '@/lib/api';

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
  const [sort, setSort] = useState<SortMode>('newest');
  const [search, setSearch] = useState('');

  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [viewingRecord, setViewingRecord] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [petRes, recRes] = await Promise.all([
        petApi.getById(petId),
        healthRecordApi.getByPet(petId),
      ]);
      setPet(petRes.pet || petRes);
      setRecords((recRes.records || []).filter((r: any) => r.record_type === config.key));
    } catch {
      router.push('/dashboard/health');
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

  const handleDelete = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunąć ten wpis?')) return;
    try {
      await healthRecordApi.delete(id);
      closeModal();
      await load();
    } catch {}
  };

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const now = new Date();
  const upcoming = records
    .filter((r) => r.next_date && new Date(r.next_date) >= now)
    .sort((a, b) => new Date(a.next_date).getTime() - new Date(b.next_date).getTime());
  const overdue = records.filter((r) => r.next_date && new Date(r.next_date) < now);

  const visible = records
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
    <div className={`p-5 rounded-2xl bg-white border border-gray-200 shadow-sm focus-within:border-brand-dark/50 focus-within:ring-2 focus-within:ring-[#1B6B4A]/10 transition-all ${full ? 'sm:col-span-2' : ''}`}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        {label}
        {optional && <span className="normal-case font-normal text-gray-400"> (opcjonalnie)</span>}
      </label>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link
        href={`/dashboard/health/${petId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-dark hover:text-brand-dark transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Wróć do książeczki zdrowia
      </Link>

      {/* Header */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${config.bg} text-white p-6 sm:p-8 lg:p-10`}>
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/[0.08]"></div>
        <div className="absolute right-32 -bottom-20 w-48 h-48 rounded-full bg-white/[0.05]"></div>
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1">
            <p className="text-sm text-white/70 mb-1">Książeczka zdrowia · {pet?.name}</p>
            <h1 className="text-3xl lg:text-4xl font-semibold mb-2">{config.title}</h1>
            <p className="text-white/80 max-w-lg">{config.desc}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[90px]">
              <p className="text-xs text-white/70">Wpisy</p>
              <p className="text-xl font-semibold">{records.length}</p>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[90px]">
              <p className="text-xs text-white/70">Nadchodzące</p>
              <p className="text-xl font-semibold">{upcoming.length}</p>
            </div>
            {overdue.length > 0 && (
              <div className="px-5 py-3 rounded-2xl bg-red-400/20 backdrop-blur-sm border border-red-300/30 text-center min-w-[90px]">
                <p className="text-xs text-white/80">Zaległe</p>
                <p className="text-xl font-semibold">{overdue.length}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming banner */}
      {upcoming.length > 0 && (
        <div className="rounded-2xl border border-brand/20 bg-gradient-to-r from-brand-mint to-brand-light p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-1">
              {config.nextDateLabel}
            </p>
            <p className="text-lg font-semibold text-gray-900">{upcoming[0].title}</p>
            <p className="text-sm text-gray-600">{formatDate(upcoming[0].next_date)}</p>
          </div>
          <button
            onClick={() => openDetail(upcoming[0])}
            className="inline-flex items-center justify-center whitespace-nowrap border border-brand-dark/30 text-brand-dark px-6 py-2.5 rounded-full font-medium hover:bg-brand-dark/5 transition-all"
          >
            Zobacz szczegóły
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row flex-1 gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj wpisów..."
            className="w-full sm:flex-1 sm:max-w-sm min-w-0 px-5 py-3 rounded-full bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-dark/50 focus:ring-2 focus:ring-brand-dark/10 transition-all"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="px-5 py-3 rounded-full bg-white border border-gray-200 text-gray-700 font-medium focus:outline-none focus:border-brand-dark/50 transition-all cursor-pointer"
          >
            <option value="newest">Od najnowszych</option>
            <option value="oldest">Od najstarszych</option>
            <option value="next">Wg następnego terminu</option>
          </select>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center justify-center bg-brand-dark hover:bg-brand-dark text-white px-7 py-3 rounded-full font-medium shadow-md shadow-brand-dark/20 hover:shadow-lg transition-all whitespace-nowrap"
        >
          Dodaj wpis
        </button>
      </div>

      {/* Records */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-14 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full border-2 border-dashed border-brand"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {search ? 'Brak wyników wyszukiwania' : 'Brak wpisów'}
          </h3>
          <p className="text-gray-500 mb-6">{search ? 'Spróbuj innej frazy' : config.desc}</p>
          {!search && (
            <button
              onClick={openAdd}
              className="inline-flex items-center bg-brand-dark hover:bg-brand-dark text-white px-8 py-3 rounded-full font-medium transition-all"
            >
              Dodaj pierwszy wpis
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {visible.map((record) => {
            const isOverdue = record.next_date && new Date(record.next_date) < now;
            return (
              <div
                key={record.id}
                onClick={() => openDetail(record)}
                className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 hover:shadow-md hover:border-brand-dark/30 transition-all group cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="shrink-0 w-14 text-center py-2 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-xl font-semibold text-gray-900 leading-none">
                        {new Date(record.record_date).getDate()}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase font-semibold mt-1">
                        {new Date(record.record_date).toLocaleDateString('pl-PL', { month: 'short' })} '{String(new Date(record.record_date).getFullYear()).slice(2)}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 leading-snug">{record.title}</h3>
                      {record.veterinarian && (
                        <p className="text-sm text-gray-500 mt-0.5">{record.veterinarian}</p>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => openEdit(record)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-50 sm:bg-transparent hover:bg-gray-100 transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-500 bg-red-50/50 sm:bg-transparent hover:bg-red-50 transition-all"
                      aria-label="Usuń"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {record.description && (
                  <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-2">{record.description}</p>
                )}

                {record.next_date && (
                  <div
                    className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold ${
                      isOverdue ? 'bg-red-50 text-red-600' : ''
                    }`}
                    style={
                      isOverdue
                        ? undefined
                        : { backgroundColor: `${config.accent}14`, color: config.accent }
                    }
                  >
                    {isOverdue ? 'Zaległy termin: ' : `${config.nextDateLabel}: `}
                    {formatDate(record.next_date)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalMode !== 'closed' && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-y-contain">
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
                    <div className="shrink-0 w-16 text-center py-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <p className="text-2xl font-semibold text-gray-900 leading-none">
                        {new Date(viewingRecord.record_date).getDate()}
                      </p>
                      <p className="text-xs text-gray-500 uppercase font-semibold mt-1">
                        {new Date(viewingRecord.record_date).toLocaleDateString('pl-PL', { month: 'short' })} {new Date(viewingRecord.record_date).getFullYear()}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{viewingRecord.title}</h3>
                      {viewingRecord.veterinarian && (
                        <p className="text-gray-500 mt-1">{viewingRecord.veterinarian}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Data</p>
                      <p className="font-medium text-gray-900">{formatDate(viewingRecord.record_date)}</p>
                    </div>
                    {viewingRecord.next_date && (
                      <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{config.nextDateLabel}</p>
                        <p className="font-medium text-gray-900">{formatDate(viewingRecord.next_date)}</p>
                      </div>
                    )}
                  </div>

                  {viewingRecord.description && (
                    <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Notatki</p>
                      <p className="text-gray-700 leading-relaxed">{viewingRecord.description}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={() => openEdit(viewingRecord)}
                      className="flex-1 bg-brand-dark hover:bg-brand-dark text-white py-3.5 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all"
                    >
                      Edytuj wpis
                    </button>
                    <button
                      onClick={() => handleDelete(viewingRecord.id)}
                      className="flex-1 flex items-center justify-center gap-2 border border-red-200 text-red-600 py-3.5 rounded-full font-medium hover:bg-red-50 transition-all"
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

                      <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
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
                        className="px-8 py-3.5 rounded-full border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                      >
                        <ChevronLeft className="w-4 h-4" /> Wstecz
                      </button>
                    )}
                    {step < 3 ? (
                      <button
                        onClick={nextStep}
                        className="flex-1 bg-brand-dark hover:bg-brand-dark text-white py-3.5 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all flex items-center justify-center gap-2"
                      >
                        Dalej <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex-1 bg-brand-dark hover:bg-brand-dark text-white py-3.5 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all disabled:opacity-50"
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
    </div>
  );
}
