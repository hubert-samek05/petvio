'use client';

import { useRef } from 'react';
import { Camera, Check } from 'lucide-react';

export interface PetFormData {
  name: string;
  species: string;
  breed: string;
  birthDate: string;
  gender: string;
  weight: string;
  microchipNumber: string;
  photoUrl: string;
}

export const EMPTY_PET_FORM: PetFormData = {
  name: '',
  species: 'dog',
  breed: '',
  birthDate: '',
  gender: '',
  weight: '',
  microchipNumber: '',
  photoUrl: '',
};

export const SPECIES = [
  { value: 'dog', label: 'Pies', emoji: '🐶', bg: '#DCEFE3' },
  { value: 'cat', label: 'Kot', emoji: '🐱', bg: '#FCEADB' },
  { value: 'rabbit', label: 'Królik', emoji: '🐰', bg: '#EDE9FE' },
  { value: 'bird', label: 'Ptak', emoji: '🐦', bg: '#DBEAFE' },
  { value: 'hamster', label: 'Gryzoń', emoji: '🐹', bg: '#FEF3C7' },
  { value: 'other', label: 'Inne', emoji: '🐾', bg: '#F1F5F9' },
];

export const GENDERS = [
  { value: 'male', label: 'Samiec' },
  { value: 'female', label: 'Samica' },
  { value: '', label: 'Nie podano' },
];

export const speciesInfo = (value: string) =>
  SPECIES.find((s) => s.value === value) || SPECIES[SPECIES.length - 1];

export const speciesLabel = (value: string) => speciesInfo(value).label;

/** Dzisiejsza data jako YYYY-MM-DD w strefie lokalnej — do atrybutu max w input[type=date]. */
export const todayDateInput = () => new Date().toLocaleDateString('en-CA');

export const genderLabel = (g: string) =>
  g === 'male' ? 'Samiec' : g === 'female' ? 'Samica' : 'Nie podano';

/** Wiek z daty urodzenia, np. "2 lata 3 mies." / "5 mies." */
export function ageLabel(birthDate: string): string | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  if (birth > now) return null;
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years === 0 && months === 0) return 'mniej niż miesiąc';
  // Polska odmiana: 1 rok, 2–4 lata, 5+ lat — z wyjątkiem 12–14 lat (wyjątek gramatyczny)
  const fewYears = years % 10 >= 2 && years % 10 <= 4 && (years % 100 < 12 || years % 100 > 14);
  const y = years === 1 ? '1 rok' : fewYears ? `${years} lata` : years >= 5 ? `${years} lat` : '';
  const m = months === 1 ? '1 mies.' : months > 1 ? `${months} mies.` : '';
  return [y, m].filter(Boolean).join(' ');
}

/** Skalowanie zdjęcia do max 512px + JPEG base64. */
export function resizeImageToBase64(file: File, onDone: (b64: string) => void, onError: (msg: string) => void) {
  if (file.size > 5 * 1024 * 1024) {
    onError('Zdjęcie nie może być większe niż 5 MB');
    return;
  }
  const src = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const max = 512;
    const ratio = Math.min(max / img.width, max / img.height, 1);
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(img, 0, 0, w, h);
    onDone(canvas.toDataURL('image/jpeg', 0.85));
    URL.revokeObjectURL(src);
  };
  img.onerror = () => {
    URL.revokeObjectURL(src);
    onError('Nie udało się wczytać zdjęcia');
  };
  img.src = src;
}

/* ================== ELEMENTY FORMULARZA ================== */

export function Field({
  label,
  optional,
  full,
  children,
}: {
  label: string;
  optional?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`p-5 rounded-2xl bg-gray-50/70 border border-gray-100 focus-within:bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10 transition-all ${
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

export const inputCls =
  'w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none';

export function SpeciesPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {SPECIES.map((s) => {
        const active = value === s.value;
        return (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(s.value)}
            className={`relative p-3.5 rounded-2xl border-2 transition-all duration-200 active:scale-95 ${
              active
                ? 'border-brand bg-brand-mint shadow-md shadow-brand/10'
                : 'border-transparent bg-gray-50/70 hover:bg-brand-mint/50'
            }`}
          >
            {active && (
              <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </span>
            )}
            <div
              className="w-11 h-11 mx-auto mb-1.5 rounded-2xl flex items-center justify-center text-2xl transition-transform"
              style={{ background: active ? '#fff' : s.bg, transform: active ? 'scale(1.05)' : undefined }}
            >
              {s.emoji}
            </div>
            <div className={`text-xs font-bold ${active ? 'text-brand-dark' : 'text-gray-500'}`}>
              {s.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function GenderPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-2xl bg-gray-100">
      {GENDERS.map((g) => {
        const active = value === g.value;
        return (
          <button
            key={g.value}
            type="button"
            onClick={() => onChange(g.value)}
            className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              active ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {g.label}
          </button>
        );
      })}
    </div>
  );
}

export function PhotoPicker({
  photoUrl,
  species,
  onChange,
  onError,
}: {
  photoUrl: string;
  species: string;
  onChange: (b64: string) => void;
  onError: (msg: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const emoji = speciesInfo(species).emoji;

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="group relative w-28 h-28 rounded-full overflow-hidden transition-transform active:scale-95"
        style={{
          background: photoUrl ? undefined : 'linear-gradient(135deg,#0F3D2E,#1B6B4A)',
          boxShadow: '0 8px 24px -6px rgba(15,61,46,0.35)',
        }}
      >
        {photoUrl ? (
          <img src={photoUrl} alt="Zdjęcie pupila" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-white">
            {emoji}
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="w-7 h-7 text-white" />
        </div>
        <span className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
          <Camera className="w-4 h-4 text-brand-dark" />
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) resizeImageToBase64(file, onChange, onError);
        }}
        className="hidden"
      />
      <p className="text-xs text-gray-400">
        {photoUrl ? 'Kliknij, aby zmienić zdjęcie' : 'Kliknij, aby dodać zdjęcie (max 5 MB)'}
      </p>
      {photoUrl && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-xs font-semibold text-red-400 hover:text-red-500 transition-colors"
        >
          Usuń zdjęcie
        </button>
      )}
    </div>
  );
}

/** Żywy podgląd profilu pupila — jak będzie wyglądać w aplikacji. */
export function PetPreview({ form }: { form: PetFormData }) {
  const sp = speciesInfo(form.species);
  const age = ageLabel(form.birthDate);
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl overflow-hidden flex-shrink-0"
        style={{ background: sp.bg }}
      >
        {form.photoUrl ? (
          <img src={form.photoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          sp.emoji
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 truncate">{form.name.trim() || 'Imię pupila'}</p>
        <p className="text-xs text-gray-500 truncate">
          {[sp.label, form.breed.trim() || 'rasa nieznana'].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {age && (
          <span className="text-[11px] font-bold text-brand-dark bg-brand-mint px-2.5 py-1 rounded-full">
            {age}
          </span>
        )}
        {form.weight && (
          <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {form.weight} kg
          </span>
        )}
      </div>
    </div>
  );
}
