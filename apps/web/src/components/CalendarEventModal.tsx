'use client';

import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { calendarApi } from '@/lib/api';

const maxEventDate = `${new Date().getFullYear() + 10}-12-31`;

const TYPE_LABELS: Record<string, string> = {
  vaccination: 'Szczepienie',
  medication: 'Lek',
  deworming: 'Profilaktyka',
  visit: 'Wizyta',
  other: 'Inne',
};

const TYPE_COLORS: Record<string, string> = {
  vaccination: '#1B6B4A',
  medication: '#3B82F6',
  deworming: '#F59E0B',
  visit: '#8B5CF6',
  other: '#9CA3AF',
};

export type EditingEvent = {
  id: number;
  petId: number;
  eventType: string;
  eventDate: string;
  title: string;
  description: string;
  reminderEnabled: boolean;
};

type CalendarEventModalProps = {
  isOpen: boolean;
  pets: any[];
  initialDate?: string;
  editingEvent?: EditingEvent;
  onClose: () => void;
  onSaved: () => void;
};

export default function CalendarEventModal({
  isOpen,
  pets,
  initialDate,
  editingEvent,
  onClose,
  onSaved,
}: CalendarEventModalProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    petId: '',
    eventType: 'other',
    eventDate: '',
    title: '',
    description: '',
    reminderEnabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const initialForm = useMemo(
    () =>
      editingEvent
        ? {
            petId: String(editingEvent.petId),
            eventType: TYPE_LABELS[editingEvent.eventType] ? editingEvent.eventType : 'other',
            eventDate: editingEvent.eventDate,
            title: editingEvent.title,
            description: editingEvent.description,
            reminderEnabled: editingEvent.reminderEnabled,
          }
        : {
            petId: pets[0]?.id?.toString() || '',
            eventType: 'other',
            eventDate: initialDate || '',
            title: '',
            description: '',
            reminderEnabled: true,
          },
    [pets, initialDate, editingEvent]
  );

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setError('');
    setForm(initialForm);
  }, [isOpen, initialForm]);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

  const stepTitles = ['Zwierzę i typ', 'Data i tytuł', 'Notatki i podsumowanie'];

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const stepValid = () => {
    if (step === 1) return !!form.petId;
    if (step === 2) return !!form.eventDate && !!form.title.trim();
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

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    const payload = {
      petId: Number(form.petId),
      eventType: form.eventType,
      eventDate: form.eventDate,
      title: form.title.trim(),
      description: form.description.trim(),
      reminderEnabled: form.reminderEnabled,
    };
    try {
      if (editingEvent) {
        await calendarApi.update(editingEvent.id, payload);
      } else {
        await calendarApi.create(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Błąd zapisywania wydarzenia');
    } finally {
      setSaving(false);
    }
  };

  const selectedPet = pets.find((p) => p.id.toString() === form.petId);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-[28px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-y-contain animate-scale-in">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-5 sm:px-8 pt-6 sm:pt-8 pb-4 rounded-t-3xl z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-brand-dark">
                Kalendarz zdrowia
              </p>
              <h2 className="text-2xl font-semibold text-gray-900">
                {editingEvent ? 'Edytuj termin' : 'Dodaj termin'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all flex items-center justify-center"
              aria-label="Zamknij"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 sm:px-8 pb-6 sm:pb-8">
          {error && (
            <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Stepper */}
          <div className="flex items-center gap-2 mb-6">
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
                {s < 3 && <div className="hidden sm:block flex-1 h-0.5 bg-gray-200 rounded-full" />}
              </div>
            ))}
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <WizardField label="Zwierzę" full>
                <select
                  value={form.petId}
                  onChange={(e) => setForm({ ...form, petId: e.target.value })}
                  className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                >
                  <option value="">Wybierz zwierzę</option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name}
                    </option>
                  ))}
                </select>
              </WizardField>

              <WizardField label="Typ wydarzenia" full>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(TYPE_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, eventType: key })}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        form.eventType === key
                          ? 'border-transparent text-white'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                      style={
                        form.eventType === key ? { backgroundColor: TYPE_COLORS[key] } : undefined
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </WizardField>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <WizardField label="Data">
                <div className="relative flex items-center">
                  <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                  <input
                    type="date"
                    value={form.eventDate}
                    min="1990-01-01"
                    max={maxEventDate}
                    onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                    className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                  />
                </div>
              </WizardField>
              <WizardField label="Tytuł">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="np. Szczepienie przeciw wściekliźnie"
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
                />
              </WizardField>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <WizardField label="Opis" optional full>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Dodatkowe informacje..."
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none resize-none"
                />
              </WizardField>

              <WizardField label="Przypomnienie" full>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Clock className="w-5 h-5 text-brand-dark" />
                  <span className="flex-1 text-sm text-gray-700">Włącz przypomnienie o wydarzeniu</span>
                  <input
                    type="checkbox"
                    checked={form.reminderEnabled}
                    onChange={(e) => setForm({ ...form, reminderEnabled: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-brand-dark focus:ring-brand-dark/30"
                  />
                </label>
              </WizardField>

              <div className="p-5 rounded-2xl bg-brand-mint/50 border border-brand-light/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">Podsumowanie</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Zwierzę</p>
                    <p className="font-medium text-gray-900">{selectedPet?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Typ</p>
                    <p className="font-medium text-gray-900">{TYPE_LABELS[form.eventType] || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Data</p>
                    <p className="font-medium text-gray-900">{formatDate(form.eventDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tytuł</p>
                    <p className="font-medium text-gray-900">{form.title || '—'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-gray-500">Opis</p>
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
                className="px-8 py-3.5 rounded-full pv-btn-ghost flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Wstecz
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={nextStep}
                className="flex-1 bg-brand-dark hover:bg-brand text-white py-3.5 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all flex items-center justify-center gap-2"
              >
                Dalej <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 bg-brand-dark hover:bg-brand text-white py-3.5 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all disabled:opacity-50"
              >
                {saving ? 'Zapisywanie...' : editingEvent ? 'Zapisz zmiany' : 'Dodaj termin'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function WizardField({
  label,
  optional,
  children,
  full,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div
      className={`p-5 pv-card shadow-sm focus-within:border-brand-dark/50 focus-within:ring-2 focus-within:ring-[#1B6B4A]/10 transition-all ${
        full ? 'sm:col-span-2' : ''
      }`}
    >
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        {label}
        {optional && <span className="normal-case font-normal text-gray-400"> (opcjonalnie)</span>}
      </label>
      {children}
    </div>
  );
}
