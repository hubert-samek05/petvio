'use client';

import { petApi, healthRecordApi, bloodAnalysisApi } from '@/lib/api';
import { useState, useEffect, useRef } from 'react';
import {
  Droplets, FileText, AlertTriangle, CheckCircle2, PawPrint,
  Calculator, Camera, X, Loader2, History, Trash2,
  ChevronDown, ChevronUp, ArrowDown, ArrowUp, BookOpen, Activity,
  Stethoscope, Sparkles, Lightbulb, Search, ChevronRight,
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import { ageLabel } from '@/components/PetForm';
import ConfirmModal from '@/components/ui/ConfirmModal';

/* ============================= TYPY ============================= */

interface BloodParameter {
  id: string;
  name: string;
  namePl: string;
  unit: string;
  dogMin: number;
  dogMax: number;
  catMin: number;
  catMax: number;
  value: number;
  category: 'morphology' | 'biochemistry' | 'electrolytes';
}

interface AnalysisResult {
  parameter: string;
  paramId: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  status: 'normal' | 'low' | 'high';
  deviation: number;
  interpretation: string;
  ageNote: string | null;
  linkedConditions: string[];
  possibleCauses: string[];
  dietaryRecommendations: string[];
  urgency: 'low' | 'medium' | 'high';
}

interface Pattern {
  title: string;
  desc: string;
  urgency: 'low' | 'medium' | 'high';
}

interface HealthCondition {
  label: string;
  params: string[];
}

interface SavedAnalysis {
  id: string;
  date: string;
  petId: string;
  petName: string;
  species: string;
  age: number | null;
  parameters: BloodParameter[];
  results: AnalysisResult[];
}

type Tab = 'analyze' | 'history' | 'glossary';

/* ============================= DANE STAŁE ============================= */

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐶', cat: '🐱', rabbit: '🐰', bird: '🐦', hamster: '🐹', other: '🐾',
};

const BASIC_PANEL = ['rbc', 'hgb', 'hct', 'wbc', 'plt', 'alt', 'alp', 'bun', 'creatinine', 'glucose', 'tp', 'phosphorus'];

const GLOSSARY: Record<string, string> = {
  rbc: 'Czerwone krwinki — przenoszą tlen z płuc do całego ciała. Za mało = niedokrwistość (osłabienie, bladość), za dużo = często odwodnienie.',
  hgb: 'Białko w czerwonych krwinkach, które wiąże tlen. Niski poziom potwierdza anemię — pupil może być apatyczny i szybko się męczyć.',
  hct: 'Procent objętości krwi zajmowanej przez krwinki czerwone. Spada przy anemii, rośnie przy odwodnieniu.',
  mcv: 'Średnia wielkość krwinki czerwonej. Małe krwinki sugerują niedobór żelaza, duże — niedobór witamin z grupy B.',
  mch: 'Ilość hemoglobiny w pojedynczej krwince. Razem z MCV pomaga ustalić rodzaj anemii.',
  mchc: 'Stężenie hemoglobiny we krwi czerwonej. Niskie = krwinki „bielsze" (hipochromia), częste przy niedoborze żelaza.',
  wbc: 'Białe krwinki — armia odpornościowa organizmu. Dużo = infekcja lub stan zapalny, mało = osłabiona odporność.',
  plt: 'Płytki krwi — odpowiadają za krzepnięcie. Za mało = ryzyko krwawień i siniaków, dużo = reakcja na stan zapalny.',
  alt: 'Enzym wątrobowy. Gdy komórki wątroby są uszkodzone, ALT „wycieka" do krwi — wysoki wynik to sygnał problemów z wątrobą.',
  ast: 'Enzym obecny w wątrobie i mięśniach. Podnosi się przy uszkodzeniu tych tkanek — interpretuje się razem z ALT.',
  alp: 'Enzym związany z wątrobą i kośćmi. U szczeniąt i kociąt wysoki naturalnie (rosnące kości), u dorosłych może wskazywać na problemy wątrobowe.',
  ggt: 'Enzym dróg żółciowych. Wysoki sugeruje zastój żółci lub choroby wątroby — zwykle oceniany z ALP i bilirubiną.',
  tbil: 'Produkt rozpadu hemoglobiny, przetwarzany przez wątrobę. Za dużo = żółtaczka (żółte dziąsła, spojówki).',
  albumin: 'Główne białko krwi wytwarzane przez wątrobę. Niskie = choroby wątroby, nerek lub utrata przez jelita.',
  globulin: 'Białka immunologiczne i transportowe. Wysokie przy przewlekłych stanach zapalnych i infekcjach.',
  tp: 'Suma albumin i globulin. Niskie = niedożywienie, choroby nerek/wątroby; wysokie = odwodnienie lub zapalenie.',
  bun: 'Produkt przemiany białka usuwany przez nerki. Wysoki = nerki mogą nie nadążać, ale też odwodnienie lub dużo białka w diecie.',
  creatinine: 'Produkt przemiany mięśni usuwany wyłącznie przez nerki. Najważniejszy marker pracy nerek — wzrost = prawdopodobna niewydolność.',
  glucose: 'Cukier we krwi — główne paliwo organizmu. Wysoki = możliwa cukrzyca lub stres; niski = niebezpieczna hipoglikemia.',
  cholesterol: 'Tłuszcz we krwi. Wysoki = zła dieta, problemy z tarczycą, nerkami lub cukrzyca; niski = niedożywienie.',
  sodium: 'Elektrolit regulujący wodę w organizmie. Zaburzenia wpływają na układ nerwowy — wysoki zwykle = odwodnienie.',
  potassium: 'Elektrolit kluczowy dla serca i mięśni. Zarówno za dużo, jak i za mało może być niebezpieczne dla serca.',
  chloride: 'Elektrolit współpracujący z sodem. Spada przy wymiotach, rośnie przy odwodnieniu.',
  calcium: 'Mineralny budulec kości i regulator pracy serca oraz mięśni. Niski = drgawki; wysoki = możliwy nowotwór lub choroby przytarczyc.',
  phosphorus: 'Minerał usuwany przez nerki. Wysoki u starszych zwierząt = często niewydolność nerek; u szczeniąt lekko podniesiony naturalnie.',
};

const HEALTH_CONDITION_KEYWORDS: { keys: string[]; label: string; params: string[] }[] = [
  { keys: ['nerk', 'renal', 'ckd', 'niewydolność nerek', 'azotemi', 'pzn'], label: 'Problemy nerkowe', params: ['bun', 'creatinine', 'phosphorus', 'potassium', 'albumin', 'sodium'] },
  { keys: ['wątrob', 'watrob', 'hepat', 'hepato', 'żółtaczk', 'zoltaczk'], label: 'Problemy wątrobowe', params: ['alt', 'ast', 'alp', 'ggt', 'tbil', 'albumin', 'cholesterol', 'bun'] },
  { keys: ['cukrzyc', 'diabet', 'insulin', 'hiperglikem'], label: 'Cukrzyca / zaburzenia glukozy', params: ['glucose', 'cholesterol'] },
  { keys: ['anemia', 'niedokrwist'], label: 'Niedokrwistość', params: ['rbc', 'hgb', 'hct', 'mcv', 'mch', 'mchc'] },
  { keys: ['tarczyc', 'tyroksyn', 'niedoczynność tarczycy'], label: 'Problemy tarczycowe', params: ['cholesterol', 'glucose'] },
  { keys: ['serc', 'kardio', 'niewydolność serca'], label: 'Problemy sercowe', params: ['potassium', 'sodium', 'calcium'] },
  { keys: ['nadwag', 'otyłoś', 'otylo', 'odchudz'], label: 'Nadwaga / odchudzanie', params: ['glucose', 'cholesterol'] },
  { keys: ['zapalenie trzustk', 'pankreat'], label: 'Zapalenie trzustki', params: ['glucose', 'alt', 'cholesterol'] },
  { keys: ['alergi', 'atopow'], label: 'Alergie', params: ['wbc', 'globulin'] },
];

const mapAnalysis = (row: any): SavedAnalysis => ({
  id: String(row.id),
  date: row.created_at,
  petId: String(row.pet_id),
  petName: row.pet_name || '—',
  species: row.species,
  age: row.pet_age ?? null,
  parameters: row.parameters || [],
  results: row.results || [],
});

// Jednorazowa migracja analiz zapisanych kiedyś w localStorage → serwer.
const migrateLocalAnalyses = async (): Promise<void> => {
  try {
    let uid = 'anon';
    try {
      uid = String(JSON.parse(localStorage.getItem('user') || 'null')?.id ?? 'anon');
    } catch {}
    const keys = ['bloodAnalyses', `pv_blood_analyses_${uid}`];
    const legacy: any[] = [];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) legacy.push(...arr);
      } catch {}
    }
    for (const a of legacy) {
      try {
        await bloodAnalysisApi.create({
          petId: Number(a.petId),
          species: a.species,
          age: a.age,
          parameters: a.parameters,
          results: a.results,
        });
      } catch {}
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {}
};

const petAgeYears = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - b.getTime()) / (365.25 * 24 * 3600 * 1000)));
};

const SPECIES_LABEL: Record<string, string> = {
  dog: 'Pies', cat: 'Kot', rabbit: 'Królik', bird: 'Ptak', hamster: 'Gryzoń', other: 'Inne',
};

const STATUS_CFG = {
  low: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', Icon: ArrowDown },
  high: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', Icon: ArrowUp },
  normal: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', Icon: CheckCircle2 },
};

/* ============================= KOMPONENT ============================= */

export default function BloodAnalysis() {
  const [tab, setTab] = useState<Tab>('analyze');
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [petSpecies, setPetSpecies] = useState<'dog' | 'cat'>('dog');
  const [petAge, setPetAge] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [petRecords, setPetRecords] = useState<any[]>([]);
  const [detectedConditions, setDetectedConditions] = useState<HealthCondition[]>([]);
  const [panelMode, setPanelMode] = useState<'basic' | 'full'>('basic');
  const [glossaryQuery, setGlossaryQuery] = useState('');
  const [glossaryExpanded, setGlossaryExpanded] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrFound, setOcrFound] = useState<number | null>(null);
  const [ocrError, setOcrError] = useState('');
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [expandedSaved, setExpandedSaved] = useState<string | null>(null);
  const [expandedResult, setExpandedResult] = useState<number | null>(null);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [petsError, setPetsError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parameters, setParameters] = useState<BloodParameter[]>([
    { id: 'rbc', name: 'RBC', namePl: 'Erytrocyty', unit: '10⁶/µL', dogMin: 5.5, dogMax: 8.5, catMin: 5.0, catMax: 10.0, value: 0, category: 'morphology' },
    { id: 'hgb', name: 'HGB', namePl: 'Hemoglobina', unit: 'g/dL', dogMin: 12.0, dogMax: 18.0, catMin: 8.0, catMax: 15.0, value: 0, category: 'morphology' },
    { id: 'hct', name: 'HCT', namePl: 'Hematokryt', unit: '%', dogMin: 37.0, dogMax: 55.0, catMin: 30.0, catMax: 45.0, value: 0, category: 'morphology' },
    { id: 'mcv', name: 'MCV', namePl: 'MCV', unit: 'fL', dogMin: 60.0, dogMax: 77.0, catMin: 35.0, catMax: 55.0, value: 0, category: 'morphology' },
    { id: 'mch', name: 'MCH', namePl: 'MCH', unit: 'pg', dogMin: 19.5, dogMax: 24.5, catMin: 12.0, catMax: 17.0, value: 0, category: 'morphology' },
    { id: 'mchc', name: 'MCHC', namePl: 'MCHC', unit: 'g/dL', dogMin: 32.0, dogMax: 36.0, catMin: 28.0, catMax: 33.0, value: 0, category: 'morphology' },
    { id: 'wbc', name: 'WBC', namePl: 'Leukocyty', unit: '10³/µL', dogMin: 6.0, dogMax: 17.0, catMin: 5.5, catMax: 19.5, value: 0, category: 'morphology' },
    { id: 'plt', name: 'PLT', namePl: 'Trombocyty', unit: '10³/µL', dogMin: 150.0, dogMax: 400.0, catMin: 175.0, catMax: 500.0, value: 0, category: 'morphology' },
    { id: 'alt', name: 'ALT', namePl: 'ALT (GPT)', unit: 'U/L', dogMin: 10.0, dogMax: 100.0, catMin: 10.0, catMax: 100.0, value: 0, category: 'biochemistry' },
    { id: 'ast', name: 'AST', namePl: 'AST (GOT)', unit: 'U/L', dogMin: 10.0, dogMax: 50.0, catMin: 10.0, catMax: 50.0, value: 0, category: 'biochemistry' },
    { id: 'alp', name: 'ALP', namePl: 'Fosfataza alkaliczna', unit: 'U/L', dogMin: 20.0, dogMax: 150.0, catMin: 10.0, catMax: 70.0, value: 0, category: 'biochemistry' },
    { id: 'ggt', name: 'GGT', namePl: 'GGTP', unit: 'U/L', dogMin: 0.0, dogMax: 10.0, catMin: 0.0, catMax: 5.0, value: 0, category: 'biochemistry' },
    { id: 'tbil', name: 'TBIL', namePl: 'Bilirubina całkowita', unit: 'mg/dL', dogMin: 0.1, dogMax: 0.6, catMin: 0.1, catMax: 0.4, value: 0, category: 'biochemistry' },
    { id: 'albumin', name: 'ALB', namePl: 'Albumina', unit: 'g/dL', dogMin: 2.7, dogMax: 4.4, catMin: 2.5, catMax: 4.0, value: 0, category: 'biochemistry' },
    { id: 'globulin', name: 'GLOB', namePl: 'Globulina', unit: 'g/dL', dogMin: 2.0, dogMax: 4.0, catMin: 2.5, catMax: 5.0, value: 0, category: 'biochemistry' },
    { id: 'tp', name: 'TP', namePl: 'Białko całkowite', unit: 'g/dL', dogMin: 5.5, dogMax: 7.5, catMin: 6.0, catMax: 8.5, value: 0, category: 'biochemistry' },
    { id: 'bun', name: 'BUN', namePl: 'Mocznik', unit: 'mg/dL', dogMin: 7.0, dogMax: 27.0, catMin: 15.0, catMax: 30.0, value: 0, category: 'biochemistry' },
    { id: 'creatinine', name: 'CRE', namePl: 'Kreatynina', unit: 'mg/dL', dogMin: 0.5, dogMax: 1.5, catMin: 0.8, catMax: 2.4, value: 0, category: 'biochemistry' },
    { id: 'glucose', name: 'GLU', namePl: 'Glukoza', unit: 'mg/dL', dogMin: 70.0, dogMax: 120.0, catMin: 70.0, catMax: 150.0, value: 0, category: 'biochemistry' },
    { id: 'cholesterol', name: 'CHOL', namePl: 'Cholesterol', unit: 'mg/dL', dogMin: 110.0, dogMax: 330.0, catMin: 75.0, catMax: 250.0, value: 0, category: 'biochemistry' },
    { id: 'sodium', name: 'Na', namePl: 'Sód', unit: 'mmol/L', dogMin: 140.0, dogMax: 155.0, catMin: 150.0, catMax: 165.0, value: 0, category: 'electrolytes' },
    { id: 'potassium', name: 'K', namePl: 'Potas', unit: 'mmol/L', dogMin: 3.5, dogMax: 5.5, catMin: 3.5, catMax: 5.5, value: 0, category: 'electrolytes' },
    { id: 'chloride', name: 'Cl', namePl: 'Chlorki', unit: 'mmol/L', dogMin: 105.0, dogMax: 120.0, catMin: 110.0, catMax: 125.0, value: 0, category: 'electrolytes' },
    { id: 'calcium', name: 'Ca', namePl: 'Wapń całkowity', unit: 'mg/dL', dogMin: 8.8, dogMax: 11.5, catMin: 8.0, catMax: 11.5, value: 0, category: 'electrolytes' },
    { id: 'phosphorus', name: 'P', namePl: 'Fosfor', unit: 'mg/dL', dogMin: 2.5, dogMax: 6.0, catMin: 3.0, catMax: 7.0, value: 0, category: 'electrolytes' },
  ]);

  const loadSavedAnalyses = async () => {
    setSavedLoading(true);
    setSavedError('');
    try {
      const res = await bloodAnalysisApi.getAll();
      setSavedAnalyses((res.analyses || []).map(mapAnalysis));
    } catch {
      setSavedError('Nie udało się pobrać historii analiz. Spróbuj ponownie.');
    } finally {
      setSavedLoading(false);
    }
  };

  /* ---------- Pupile + zapisane analizy ---------- */
  useEffect(() => {
    loadPets();
    // Najpierw przenieś ewentualne stare wpisy z localStorage na serwer, potem pobierz listę
    migrateLocalAnalyses().finally(loadSavedAnalyses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPets = () => {
    setPetsLoading(true);
    setPetsError('');
    petApi
      .getAll()
      .then((res) => {
        const list = res.pets || res || [];
        setPets(list);
        if (list.length > 0) selectPet(String(list[0].id), list[0]);
      })
      .catch(() => setPetsError('Nie udało się pobrać listy zwierząt. Spróbuj ponownie.'))
      .finally(() => setPetsLoading(false));
  };

  const selectPet = (id: string, pet?: any) => {
    const p = pet || pets.find((x) => String(x.id) === id);
    setSelectedPet(id);
    if (p) {
      // Gatunek i wiek są ZAWSZE pobierane z profilu pupila — bez ręcznego wyboru.
      setPetSpecies(p.species === 'cat' ? 'cat' : 'dog');
      setPetAge(petAgeYears(p.birth_date));
      loadHealthContext(Number(id));
    }
  };

  const loadHealthContext = async (petId: number) => {
    try {
      const res = await healthRecordApi.getByPet(petId);
      const records = res.records || [];
      setPetRecords(records);
      const text = records.map((r: any) => `${r.title || ''} ${r.description || ''}`).join(' ').toLowerCase();
      setDetectedConditions(
        HEALTH_CONDITION_KEYWORDS.filter((c) => c.keys.some((k) => text.includes(k)))
          .map((c) => ({ label: c.label, params: c.params }))
      );
    } catch {
      setPetRecords([]);
      setDetectedConditions([]);
    }
  };

  const currentPet = pets.find((p) => String(p.id) === selectedPet);
  const isExoticSpecies = currentPet && currentPet.species !== 'dog' && currentPet.species !== 'cat';

  const conditionsFor = (paramId: string) =>
    detectedConditions.filter((c) => c.params.includes(paramId)).map((c) => c.label);

  /* ---------- Status ---------- */
  const rangeFor = (p: BloodParameter) =>
    petSpecies === 'dog' ? { min: p.dogMin, max: p.dogMax } : { min: p.catMin, max: p.catMax };

  const statusFor = (p: BloodParameter): 'normal' | 'low' | 'high' | null => {
    if (!p.value || p.value <= 0) return null;
    const { min, max } = rangeFor(p);
    if (p.value < min) return 'low';
    if (p.value > max) return 'high';
    return 'normal';
  };

  /* ---------- Treści interpretacyjne ---------- */
  const getInterpretation = (paramId: string, status: string): string => {
    const m: Record<string, Record<string, string>> = {
      rbc: { low: 'Anemia — zmniejszona liczba erytrocytów wskazuje na niedokrwistość. Może wynikać z niedoborów żywieniowych, chorób przewlekłych, krwawień lub zaburzeń szpiku.', high: 'Politemia — zwiększona liczba erytrocytów może wskazywać na odwodnienie, choroby serca lub płuc.' },
      hgb: { low: 'Niedokrwistość — zmniejszona hemoglobina potwierdza anemię. Wymaga dalszej diagnostyki przyczyny.', high: 'Zwiększona hemoglobina — zwykle związana z odwodnieniem lub chorobami układu oddechowego.' },
      hct: { low: 'Niski hematokryt — towarzyszy anemii; warto zweryfikować RBC i HGB.', high: 'Wysoki hematokryt — najczęściej odwodnienie, rzadziej politemia.' },
      mcv: { low: 'Mikrocytoza — erytrocyty mniejsze niż norma, typowe dla niedoboru żelaza.', high: 'Makrocytoza — możliwy niedobór B12 lub kwasu foliowego.' },
      mch: { low: 'Hipochromia — mniej hemoglobiny w erytrocytach, typowe dla niedokrwistości z niedoboru żelaza.', high: 'Hiperchromia — zwykle artefakt pomiaru lub sferocytoza.' },
      mchc: { low: 'Niskie MCHC — hipochromowe erytrocyty, częste przy niedoborze żelaza.', high: 'Wysokie MCHC — często artefakt (hemoliza próbki) lub sferocytoza.' },
      wbc: { low: 'Leukopenia — obniżone leukocyty mogą wskazywać na infekcje wirusowe, choroby autoimmunologiczne lub skutki leczenia.', high: 'Leukocytoza — zwiększone leukocyty sugerują stan zapalny, infekcję bakteryjną, stres lub nowotwór.' },
      plt: { low: 'Trombocytopenia — mało płytek zwiększa ryzyko krwawień. Możliwe przyczyny: choroby autoimmunologiczne, infekcje, toksyny. Uwaga: kolumny w próbce mogą fałszować wynik.', high: 'Trombocytoza — reakcja na zapalenie, stres lub choroby szpiku.' },
      alt: { low: 'Zazwyczaj bez znaczenia klinicznego.', high: 'Wzrost ALT wskazuje na uszkodzenie hepatocytów. Możliwe przyczyny: hepatopatia, toksyny, leki, nowotwory.' },
      ast: { low: 'Zazwyczaj bez znaczenia klinicznego.', high: 'Wzrost AST — uszkodzenie wątroby lub mięśni. Interpretować razem z ALT.' },
      alp: { low: 'Hipofosfatazja — rzadka, możliwy niedobór cynku.', high: 'Wzrost ALP — fizjologiczny u młodych zwierząt; u dorosłych może wskazywać na choroby wątroby, kości lub działanie leków (sterydy).' },
      ggt: { low: 'Zazwyczaj bez znaczenia klinicznego.', high: 'Wzrost GGTP — cholestaza lub choroby dróg żółciowych; interpretować z ALP i bilirubiną.' },
      tbil: { low: 'Zazwyczaj bez znaczenia klinicznego.', high: 'Hiperbilirubinemia — żółtaczka: choroby wątroby, hemoliza lub zastój żółci. Sprawdź spojówki i dziąsła pupila.' },
      albumin: { low: 'Hypoalbuminemia — możliwe choroby wątroby, nerek (zespół nerczycowy) lub utrata przez przewód pokarmowy.', high: 'Wzrost albuminy — prawie zawsze odwodnienie.' },
      globulin: { low: 'Niska globulina — rzadka, możliwe niedobory immunologiczne.', high: 'Hiperglobulinemia — przewlekły stan zapalny, infekcja lub choroby autoimmunologiczne.' },
      tp: { low: 'Hipoproteinemia — niedożywienie, choroby wątroby/nerek lub utrata przez przewód pokarmowy.', high: 'Hiperproteinemia — odwodnienie lub przewlekły stan zapalny.' },
      bun: { low: 'Niski mocznik — możliwa dieta ubogobiałkowa, choroby wątroby lub przewodnienie.', high: 'Hiperazotemia — niewydolność nerek, odwodnienie lub wysokobiałkowa dieta; interpretować z kreatyniną.' },
      creatinine: { low: 'Niska kreatynina — niewielka masa mięśniowa; zwykle bez znaczenia.', high: 'Wzrost kreatyniny — marker niewydolności nerek. Wymaga konsultacji weterynaryjnej.' },
      glucose: { low: 'Hipoglikemia — niski cukier jest stanem niebezpiecznym; możliwe przyczyny: insulinoma, niedożywienie, sepsa.', high: 'Hiperglikemia — cukrzyca, stres lub zapalenie trzustki. U kotów częsta hiperglikemia stresowa po wizycie u weterynarza.' },
      cholesterol: { low: 'Hipocholesterolemia — niedożywienie, choroby wątroby lub malabsorpcja.', high: 'Hipercholesterolemia — dieta wysokotłuszczowa, choroby tarczycy, nerek lub cukrzyca.' },
      sodium: { low: 'Hiponatremia — może prowadzić do zaburzeń neurologicznych.', high: 'Hipernatremia — zwykle odwodnienie lub nadmierna podaż soli.' },
      potassium: { low: 'Hipokaliemia — osłabienie mięśni, zaburzenia rytmu serca; częsta u kotów z niewydolnością nerek.', high: 'Hiperkaliemia — stan zagrożenia życia (zaburzenia rytmu serca); pilna konsultacja.' },
      chloride: { low: 'Hipochloremia — częste przy wymiotach i zaburzeniach kwasowo-zasadowych.', high: 'Hiperchloremia — odwodnienie lub zaburzenia elektrolitowe.' },
      calcium: { low: 'Hipokalcemia — drgawki, osłabienie; pilna diagnostyka.', high: 'Hiperkalcemia — może wskazywać na nowotwór, hiperparatyreozę lub niewydolność nerek.' },
      phosphorus: { low: 'Hipofosfatemia — niedożywienie lub przesunięcie fosforu do komórek.', high: 'Hiperfosfatemia — często związana z niewydolnością nerek; u rosnących zwierząt lekki wzrost jest fizjologiczny.' },
    };
    return m[paramId]?.[status] || 'Wartość w zakresie referencyjnym.';
  };

  const getAgeNote = (paramId: string, status: string): string | null => {
    if (petAge === null) return null;
    if (paramId === 'alp' && status === 'high' && petAge < 1) return 'U szczeniąt i kociąt wzrost ALP jest fizjologiczny — rosnące kości produkują ten enzym.';
    if (paramId === 'phosphorus' && status === 'high' && petAge < 1) return 'U rosnących zwierząt lekko podwyższony fosfor jest zjawiskiem naturalnym.';
    if (paramId === 'creatinine' && status === 'high' && petAge >= 10) return 'U seniorów warto rozważyć pełną diagnostykę nerkową (SDMA, badanie moczu, USG).';
    if (paramId === 'glucose' && status === 'high' && petAge >= 7 && petSpecies === 'cat') return 'U starszych kotów podwyższona glukoza częściej wskazuje na cukrzycę niż na stres.';
    return null;
  };

  const getPossibleCauses = (paramId: string, status: string): string[] => {
    const c: Record<string, Record<string, string[]>> = {
      rbc: { low: ['Niedobór żelaza', 'Choroby przewlekłe', 'Krwawienia', 'Choroby szpiku', 'Niedobór B12'], high: ['Odwodnienie', 'Choroby serca', 'Choroby płuc'] },
      wbc: { low: ['Infekcje wirusowe', 'Choroby autoimmunologiczne', 'Leczenie cytostatyczne'], high: ['Infekcja bakteryjna', 'Stan zapalny', 'Stres', 'Nowotwór'] },
      plt: { low: ['Choroby autoimmunologiczne (IMT)', 'Infekcje (np. babeszjoza)', 'Toksyny', 'Błąd pomiaru — kolumny w próbce'], high: ['Stan zapalny', 'Reakcja na stres'] },
      alt: { high: ['Hepatopatia', 'Toksyny', 'Leki (sterydy, antykonwulsanty)', 'Nowotwór wątroby'] },
      ast: { high: ['Uszkodzenie mięśni', 'Uszkodzenie wątroby', 'Wysiłek fizyczny'] },
      alp: { high: ['Młody wiek (fizjologiczny)', 'Choroby wątroby', 'Choroby kości', 'Leki sterydowe'] },
      tbil: { high: ['Hemoliza', 'Choroby wątroby', 'Zastój żółci'] },
      albumin: { low: ['Choroby wątroby', 'Zespół nerczycowy', 'Enteropatia', 'Niedożywienie'] },
      globulin: { high: ['Przewlekły stan zapalny', 'Infekcja', 'Choroby autoimmunologiczne'] },
      bun: { low: ['Dieta ubogobiałkowa', 'Choroby wątroby'], high: ['Niewydolność nerek', 'Odwodnienie', 'Dieta wysokobiałkowa', 'Krwawienie z przewodu pokarmowego'] },
      creatinine: { high: ['Niewydolność nerek', 'Odwodnienie', 'Blokada dróg moczowych', 'Choroby serca'] },
      glucose: { low: ['Insulinoma', 'Niedożywienie', 'Sepsa', 'Choroby wątroby'], high: ['Cukrzyca', 'Stres', 'Zapalenie trzustki', 'Leki sterydowe'] },
      cholesterol: { low: ['Niedożywienie', 'Choroby wątroby', 'Malabsorpcja'], high: ['Dieta wysokotłuszczowa', 'Niedoczynność tarczycy', 'Niewydolność nerek', 'Cukrzyca'] },
      sodium: { low: ['Wymioty/biegunka', 'Choroby nerek', 'Choroby hormonalne'], high: ['Odwodnienie', 'Ograniczony dostęp do wody'] },
      potassium: { low: ['Wymioty', 'Niewydolność nerek (koty)', 'Choroby metaboliczne'], high: ['Niewydolność nerek', 'Blokada dróg moczowych', 'Choroby nadnerczy'] },
      chloride: { low: ['Wymioty', 'Zaburzenia kwasowo-zasadowe'], high: ['Odwodnienie'] },
      calcium: { low: ['Hipoparatyreoza', 'Eklampsja', 'Choroby nerek'], high: ['Nowotwór', 'Hiperparatyreoza', 'Niewydolność nerek', 'Toksyny z wit. D'] },
      phosphorus: { low: ['Niedożywienie', 'Choroby wątroby'], high: ['Niewydolność nerek', 'Niedoczynność przytarczyc', 'Suplementy fosforu'] },
    };
    return c[paramId]?.[status] || [];
  };

  const getDietaryRecommendations = (paramId: string, status: string): string[] => {
    const r: Record<string, Record<string, string[]>> = {
      rbc: { low: ['Zwiększ podaż żelaza (mięso, wątróbka)', 'Witamina B12 i kwas foliowy', 'Białko wysokiej jakości'] },
      hgb: { low: ['Żelazo i miedź w diecie', 'Witamina B12', 'Wątróbka i mięso czerwone (pies)'] },
      hct: { low: ['Żelazo w diecie', 'Białko wysokiej jakości'], high: ['Zwiększ podaż wody', 'Świeży pokarm zamiast suchego'] },
      alt: { high: ['Dieta niskotłuszczowa', 'Sylimaryna i witamina E (wsparcie wątroby)', 'Unikaj toksyn (cebula, czekolada)', 'Białko wysokiej jakości w ograniczonej ilości'] },
      alp: { high: ['Dieta niskotłuszczowa', 'Ogranicz fosfor', 'Łatwo strawne białko'] },
      albumin: { low: ['Białko wysokiej strawności', 'Łatwo strawna dieta'] },
      tp: { low: ['Białko wysokiej strawności', 'Weryfikacja diety z dietetykiem weterynaryjnym'] },
      bun: { high: ['Ogranicz białko (dieta renalna)', 'Dieta niskofosforanowa', 'Zwiększ podaż wody'] },
      creatinine: { high: ['Dieta nerkowa (niskie białko i fosfor)', 'Kwasy omega-3', 'Świeża woda zawsze dostępna'] },
      glucose: { low: ['Regularne posiłki', 'Unikaj długich przerw między karmieniem'], high: ['Dieta niskowęglowodanowa', 'Wysokie białko', 'Regularne pory posiłków', 'Unikaj słodyczy i prostych cukrów'] },
      cholesterol: { high: ['Dieta niskotłuszczowa', 'Zwiększ błonnik', 'Kwasy omega-3'] },
      sodium: { high: ['Dieta niskosodowa', 'Unikaj przetworzonej żywności i soli'] },
      phosphorus: { high: ['Dieta niskofosforanowa', 'Unikaj kości i podrobów bogatych w fosfor'] },
      potassium: { low: ['Suplementacja potasu za zgodą weterynarza'], high: ['Ogranicz potas w diecie', 'Konsultacja weterynaryjna przed zmianami'] },
      calcium: { low: ['Suplementacja wapnia za zgodą weterynarza'], high: ['Dieta niskowapniowa', 'Unikaj suplementów z wit. D'] },
    };
    return r[paramId]?.[status] || [];
  };

  const getUrgency = (paramId: string, status: string, deviation: number): 'low' | 'medium' | 'high' => {
    if (status === 'normal') return 'low';
    const highUrgency = ['creatinine', 'glucose', 'potassium', 'calcium', 'sodium'];
    const mediumUrgency = ['rbc', 'hgb', 'hct', 'wbc', 'plt', 'alt', 'bun', 'albumin'];
    if (highUrgency.includes(paramId)) return deviation > 50 ? 'high' : 'medium';
    if (mediumUrgency.includes(paramId)) return deviation > 30 ? 'medium' : 'low';
    return 'low';
  };

  /* ---------- Wzorce ---------- */
  const detectPatterns = (results: AnalysisResult[]): Pattern[] => {
    const s = (id: string) => results.find((r) => r.paramId === id)?.status;
    const patterns: Pattern[] = [];
    const lowCount = ['rbc', 'hgb', 'hct'].filter((id) => s(id) === 'low').length;
    if (lowCount >= 2) patterns.push({ title: 'Obraz niedokrwistości', desc: `Jednocześnie obniżone ${lowCount === 3 ? 'RBC, HGB i HCT' : 'parametry czerwonokrwinkowe'} to klasyczny obraz anemii. Kluczowe jest znalezienie przyczyny: niedobór żelaza, krwawienie lub choroba przewlekła.`, urgency: 'high' });
    if (s('bun') === 'high' && s('creatinine') === 'high') patterns.push({ title: 'Azotemia — obraz nerkowy', desc: 'Podniesione mocznik i kreatynina razem to silny sygnał niewydolności nerek. Konieczna konsultacja weterynaryjna i rozważenie diety nerkowej.', urgency: 'high' });
    else if (s('bun') === 'high' && s('creatinine') !== 'high' && (s('sodium') === 'high' || s('albumin') === 'high' || s('tp') === 'high' || s('hct') === 'high')) patterns.push({ title: 'Prawdopodobne odwodnienie', desc: 'Mocznik podniesiony przy prawidłowej kreatyninie + wysokie elektrolity/białka = klasyczny obraz odwodnienia. Zwiększ podaż wody i powtórz badanie.', urgency: 'medium' });
    const liverHigh = ['alt', 'ast', 'alp', 'ggt', 'tbil'].filter((id) => s(id) === 'high').length;
    if (liverHigh >= 2) patterns.push({ title: 'Obraz hepatobiliaryjny', desc: `${liverHigh} wskaźniki wątrobowe jednocześnie podniesione — sugeruje problemy wątrobowe lub dróg żółciowych. Warto rozważyć USG jamy brzusznej.`, urgency: 'high' });
    if (s('glucose') === 'high' && s('cholesterol') === 'high') patterns.push({ title: 'Zaburzenia metaboliczne', desc: 'Wysoka glukoza + cholesterol mogą wskazywać na cukrzycę lub zespół metaboliczny. Zalecane badanie fruktozaminy.', urgency: 'high' });
    if (s('wbc') === 'high' && s('globulin') === 'high') patterns.push({ title: 'Przewlekły stan zapalny', desc: 'Podniesione leukocyty wraz z globuliną sugerują długotrwałą infekcję lub proces zapalny.', urgency: 'medium' });
    if (s('albumin') === 'low' && s('tp') === 'low') patterns.push({ title: 'Niedobór białka', desc: 'Niska albumina + białko całkowite — utrata białka przez jelita (enteropatia) lub nerki, albo niewydolność wątroby.', urgency: 'medium' });
    if (s('glucose') === 'low' && s('albumin') === 'low') patterns.push({ title: 'Podejrzenie niewydolności wątroby', desc: 'Niska glukoza + albumina — wątroba może nie produkować wystarczająco glukozy i białek. Pilna diagnostyka.', urgency: 'high' });
    return patterns;
  };

  /* ---------- Analiza ---------- */
  const analyzeParameter = (param: BloodParameter): AnalysisResult => {
    const { min, max } = rangeFor(param);
    let status: 'normal' | 'low' | 'high' = 'normal';
    let deviation = 0;
    if (param.value < min) { status = 'low'; deviation = ((min - param.value) / min) * 100; }
    else if (param.value > max) { status = 'high'; deviation = ((param.value - max) / max) * 100; }
    return {
      parameter: param.namePl, paramId: param.id, value: param.value, min, max, unit: param.unit,
      status, deviation,
      interpretation: getInterpretation(param.id, status),
      ageNote: getAgeNote(param.id, status),
      linkedConditions: conditionsFor(param.id),
      possibleCauses: getPossibleCauses(param.id, status),
      dietaryRecommendations: getDietaryRecommendations(param.id, status),
      urgency: getUrgency(param.id, status, deviation),
    };
  };

  const handleAnalyze = () => {
    setAnalysisResults(parameters.filter((p) => p.value > 0).map(analyzeParameter));
    setShowResults(true);
    setExpandedResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setShowResults(false);
    setAnalysisResults([]);
    setParameters((ps) => ps.map((p) => ({ ...p, value: 0 })));
    setUploadedImage(null);
    setOcrFound(null);
    setOcrError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await bloodAnalysisApi.create({
        petId: Number(selectedPet),
        species: petSpecies,
        age: petAge,
        parameters: parameters.filter((p) => p.value > 0),
        results: analysisResults,
      });
      await loadSavedAnalyses();
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2500);
    } catch (err: any) {
      setSaveError(err.response?.data?.error?.message || 'Nie udało się zapisać analizy. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSaved = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await bloodAnalysisApi.delete(Number(deleteTarget));
      setSavedAnalyses((prev) => prev.filter((a) => a.id !== deleteTarget));
      setDeleteTarget(null);
    } catch {
      setSavedError('Nie udało się usunąć analizy. Spróbuj ponownie.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleParameterChange = (id: string, value: string) => {
    setParameters((ps) => ps.map((p) => (p.id === id ? { ...p, value: parseFloat(value) || 0 } : p)));
  };

  /* ---------- OCR ---------- */
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setOcrError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      processImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    setOcrStatus('Inicjalizacja OCR…');
    setOcrProgress(0);
    setOcrFound(null);
    try {
      const result = await Tesseract.recognize(imageData, 'pol+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
            setOcrStatus('Rozpoznawanie tekstu…');
          }
        },
      });
      setOcrStatus('Interpretacja wyników…');
      const found = parseAndFillValues(result.data.text);
      setOcrFound(found);
      setTimeout(() => { setIsProcessing(false); setOcrProgress(0); setOcrStatus(''); }, 800);
    } catch (error) {
      console.error('OCR Error:', error);
      setIsProcessing(false);
      setOcrFound(null);
      setOcrStatus('');
      setOcrError('Nie udało się przetworzyć obrazu. Wprowadź wartości ręcznie.');
      setTimeout(() => setOcrError(''), 5000);
    }
  };

  const parseAndFillValues = (text: string): number => {
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    const patterns: Record<string, RegExp> = {
      rbc: /\brbc\b|erytrocyt|red blood/i, hgb: /\bhgb\b|\bhb\b|hemoglobin/i,
      hct: /\bhct\b|hematokryt|hematocrit/i, mcv: /\bmcv\b/i, mchc: /\bmchc\b/i, mch: /\bmch\b(?!\w)/i,
      wbc: /\bwbc\b|leukocyt|white blood/i, plt: /\bplt\b|trombocyt|platelet/i,
      alt: /\balt\b|\bsgpt\b|\balat\b/i, ast: /\bast\b|\bsgot\b|\basat\b/i,
      alp: /\balp\b|fosfataza alkaliczna/i, ggt: /\bggt\b|\bggtp\b/i, tbil: /bilirubin|tbil/i,
      albumin: /albumin|\balb\b/i, globulin: /globulin|\bglob\b/i,
      tp: /bia[lł]ko ca[lł]kowite|total protein|\bt\.?p\.?\b/i,
      bun: /mocznik|\burea\b|\bbun\b|azot/i, creatinine: /kreatynin|creatinine|\bcre\b|\bkrea\b/i,
      glucose: /glukoz|glucose|\bglu\b|cukier/i, cholesterol: /cholesterol|\bchol\b/i,
      sodium: /\bs[oó]d\b|\bsodium\b|\bna\+?\b/i, potassium: /potas|\bpotassium\b|\bk\+?\b/i,
      chloride: /chlork|chloride|\bcl\b/i, calcium: /wap[nń]|\bcalcium\b|\bca\b/i,
      phosphorus: /fosfor\b|phosphorus|\bphos\b|\bp\b(?!\w)/i,
    };
    const extractValue = (line: string, nameEnd: number): number | null => {
      const tokens = line.slice(nameEnd).match(/\d+[.,]?\d*/g);
      if (!tokens) return null;
      for (const tok of tokens) {
        const v = parseFloat(tok.replace(',', '.'));
        if (!isNaN(v) && v > 0) return v;
      }
      return null;
    };
    const updated = [...parameters];
    let filled = 0;
    Object.entries(patterns).forEach(([paramId, re]) => {
      const lineIdx = lines.findIndex((l) => re.test(l));
      if (lineIdx === -1) return;
      const line = lines[lineIdx];
      const m = line.match(re);
      if (!m) return;
      const nameEnd = line.indexOf(m[0]) + m[0].length;
      let value = extractValue(line, nameEnd);
      if (value === null && lineIdx + 1 < lines.length) value = extractValue(lines[lineIdx + 1], 0);
      if (value !== null && value > 0) {
        const pi = updated.findIndex((p) => p.id === paramId);
        if (pi !== -1 && !updated[pi].value) { updated[pi] = { ...updated[pi], value }; filled++; }
      }
    });
    setParameters(updated);
    return filled;
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setOcrFound(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ---------- Pomocnicze ---------- */
  const getUrgencyMeta = (u: string) => {
    if (u === 'high') return { label: 'Pilna konsultacja', cls: 'bg-red-100 text-red-700 border-red-200' };
    if (u === 'medium') return { label: 'Do weryfikacji', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { label: 'Do obserwacji', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  };

  const gaugePos = (v: number, min: number, max: number) => {
    const span = max - min || 1;
    const pad = span * 0.25;
    return Math.max(0, Math.min(100, ((v - (min - pad)) / (span + pad * 2)) * 100));
  };

  const visibleParameters = panelMode === 'basic' ? parameters.filter((p) => BASIC_PANEL.includes(p.id)) : parameters;
  const filledCount = parameters.filter((p) => p.value > 0).length;
  const abnormalCount = analysisResults.filter((r) => r.status !== 'normal').length;
  const detectedPatterns = showResults ? detectPatterns(analysisResults) : [];

  const categoryNames: Record<string, string> = { morphology: 'Morfologia', biochemistry: 'Biochemia', electrolytes: 'Elektrolity' };
  const catIcons: Record<string, string> = { morphology: '🔬', biochemistry: '🧪', electrolytes: '⚡' };
  const groupedParameters = {
    morphology: visibleParameters.filter((p) => p.category === 'morphology'),
    biochemistry: visibleParameters.filter((p) => p.category === 'biochemistry'),
    electrolytes: visibleParameters.filter((p) => p.category === 'electrolytes'),
  };

  const glossaryFiltered = parameters.filter((p) =>
    !glossaryQuery ||
    p.namePl.toLowerCase().includes(glossaryQuery.toLowerCase()) ||
    p.name.toLowerCase().includes(glossaryQuery.toLowerCase())
  );

  /* ============================= RENDER ============================= */
  return (
    <div className="space-y-6">
      {/* ====== Taby (mobile-first) ====== */}
      <div className="flex gap-1 p-1 rounded-2xl bg-gray-100/80 animate-slide-up">
        {([
          { key: 'analyze', label: 'Analiza', Icon: Droplets, badge: 0 },
          { key: 'history', label: 'Historia', Icon: History, badge: savedAnalyses.length },
          { key: 'glossary', label: 'Słownik', Icon: BookOpen, badge: 0 },
        ] as { key: Tab; label: string; Icon: any; badge: number }[]).map(({ key, label, Icon, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === key ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            {badge > 0 && <span className="text-[10px] font-bold bg-brand text-white px-1.5 py-0.5 rounded-full">{badge}</span>}
          </button>
        ))}
      </div>

      {/* ====== TAB: ANALIZA ====== */}
      {tab === 'analyze' && (
        <div className="space-y-6 animate-fade-in">
          {/* Wybór pupila — poziomy scroll, mobile-first */}
          <div className="pv-card p-5">
            {petsLoading ? (
              <div className="flex gap-4 overflow-hidden">
                {[...Array(3)].map((_, i) => <div key={i} className="pv-skeleton w-16 h-20 rounded-2xl flex-shrink-0" />)}
              </div>
            ) : petsError ? (
              <div className="text-center py-4">
                <p className="text-sm text-red-600 font-medium mb-4">{petsError}</p>
                <button onClick={loadPets} className="pv-btn-primary px-5 py-2.5 text-sm inline-flex">Spróbuj ponownie</button>
              </div>
            ) : pets.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-4">Dodaj zwierzę, aby analizować jego wyniki.</p>
                <a href="/dashboard/pets/new" className="pv-btn-primary px-5 py-2.5 text-sm inline-flex">Dodaj zwierzę</a>
              </div>
            ) : (
              <>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
                  {pets.map((pet) => {
                    const sel = selectedPet === String(pet.id);
                    const age = petAgeYears(pet.birth_date);
                    return (
                      <button
                        key={pet.id}
                        onClick={() => selectPet(String(pet.id))}
                        className="flex flex-col items-center flex-shrink-0 active:scale-95 transition-all"
                      >
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl overflow-hidden transition-all ${
                          sel ? 'ring-[3px] ring-brand ring-offset-2 bg-brand-mint shadow-md' : 'bg-gray-100'
                        }`}>
                          {pet.photo_url ? (
                            <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                          ) : (
                            SPECIES_EMOJI[pet.species] || '🐾'
                          )}
                        </div>
                        <span className={`mt-2 text-xs font-semibold max-w-[72px] truncate ${sel ? 'text-brand-dark' : 'text-gray-500'}`}>
                          {pet.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Auto-dane pupila — bez ręcznego wyboru */}
                {currentPet && (
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                      {SPECIES_EMOJI[currentPet.species]} {SPECIES_LABEL[currentPet.species] || 'Zwierzę'}
                    </span>
                    {petAge !== null && (
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                        {ageLabel(currentPet.birth_date) || `${petAge} lat`}
                      </span>
                    )}
                    <span className="text-xs font-semibold text-brand-dark bg-brand-mint px-2.5 py-1 rounded-full">
                      Normy: {petSpecies === 'dog' ? 'pies' : 'kot'}
                    </span>
                  </div>
                )}

                {/* Kontekst zdrowia */}
                {detectedConditions.length > 0 && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-violet-50 border border-violet-100 animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <Stethoscope className="w-4 h-4 text-violet-600" />
                      <p className="text-xs font-bold text-violet-700">Z książeczki zdrowia</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {detectedConditions.map((c) => (
                        <span key={c.label} className="text-[11px] font-semibold bg-white text-violet-700 px-2.5 py-1 rounded-full border border-violet-200">{c.label}</span>
                      ))}
                    </div>
                  </div>
                )}

                {isExoticSpecies && (
                  <div className="mt-3 flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p>Normy dotyczą psów i kotów. Zastosuj zestaw:</p>
                      <div className="flex gap-1.5 mt-2">
                        {(['dog', 'cat'] as const).map((sp) => (
                          <button
                            key={sp}
                            onClick={() => setPetSpecies(sp)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${petSpecies === sp ? 'bg-amber-200 text-amber-900' : 'bg-white text-amber-600 border border-amber-200'}`}
                          >
                            {sp === 'dog' ? 'Pies' : 'Kot'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Formularz */}
          {!showResults && pets.length > 0 && (
            <div className="pv-card p-5 animate-slide-up stagger-1">
              {/* OCR */}
              {!uploadedImage ? (
                <label
                  htmlFor="image-upload"
                  className="flex items-center gap-4 cursor-pointer border-2 border-dashed border-gray-200 rounded-2xl p-4 hover:border-brand/50 hover:bg-brand-mint/30 transition-all"
                >
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="image-upload" />
                  <div className="w-12 h-12 rounded-2xl bg-brand-mint flex items-center justify-center flex-shrink-0">
                    <Camera className="w-6 h-6 text-brand-dark" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">Zeskanuj wyniki</p>
                    <p className="text-xs text-gray-400">Zdjęcie wydruku — pola uzupełnią się same</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </label>
              ) : (
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="relative">
                    <img src={uploadedImage} alt="Wyniki badań" className="w-full max-h-48 object-contain bg-gray-50" />
                    <button onClick={handleRemoveImage} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-red-50 transition-all" aria-label="Usuń">
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  {isProcessing && (
                    <div className="p-3.5 bg-gray-50 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-4 h-4 text-brand-dark animate-spin" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-700">{ocrStatus}</p>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                            <div className="bg-brand h-1.5 rounded-full transition-all" style={{ width: `${ocrProgress}%` }} />
                          </div>
                        </div>
                        <span className="text-xs font-bold text-brand-dark tabular-nums">{ocrProgress}%</span>
                      </div>
                    </div>
                  )}
                  {ocrFound !== null && !isProcessing && (
                    <div className={`p-3 border-t text-xs font-semibold flex items-center gap-2 ${ocrFound > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                      {ocrFound > 0 ? <><CheckCircle2 className="w-4 h-4" /> Rozpoznano {ocrFound} {ocrFound === 1 ? 'parametr' : 'parametrów'} — zweryfikuj poniżej</> : <><AlertTriangle className="w-4 h-4" /> Nie rozpoznano — wpisz ręcznie</>}
                    </div>
                  )}
                </div>
              )}
              {ocrError && <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">{ocrError}</div>}

              {/* Panel toggle */}
              <div className="flex items-center justify-between mt-5 mb-4">
                <div className="flex gap-1 p-1 rounded-xl bg-gray-100">
                  <button onClick={() => setPanelMode('basic')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${panelMode === 'basic' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-400'}`}>
                    Podstawowy · {BASIC_PANEL.length}
                  </button>
                  <button onClick={() => setPanelMode('full')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${panelMode === 'full' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-400'}`}>
                    Pełny · {parameters.length}
                  </button>
                </div>
                <span className="text-xs font-semibold text-gray-400 tabular-nums">{filledCount}/{visibleParameters.length}</span>
              </div>

              {/* Kompaktowe wiersze parametrów */}
              {Object.entries(groupedParameters).map(([category, params]) => (
                params.length > 0 && (
                  <div key={category} className="mb-5">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2.5 flex items-center gap-1.5">
                      <span>{catIcons[category]}</span>{categoryNames[category]}
                    </h4>
                    <div className="space-y-2">
                      {params.map((param) => {
                        const { min, max } = rangeFor(param);
                        const status = statusFor(param);
                        const linked = conditionsFor(param.id);
                        return (
                          <div
                            key={param.id}
                            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                              status === 'low' ? 'bg-blue-50/60 border-blue-200'
                              : status === 'high' ? 'bg-red-50/60 border-red-200'
                              : status === 'normal' ? 'bg-emerald-50/50 border-emerald-200'
                              : 'bg-gray-50/70 border-gray-100'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold text-gray-800 truncate">{param.namePl}</p>
                                {linked.length > 0 && <Stethoscope className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />}
                              </div>
                              <p className="text-[10px] text-gray-400">Norma {min}–{max} {param.unit}</p>
                            </div>
                            <div className="relative w-28 flex-shrink-0">
                              <input
                                type="number" step="0.01" inputMode="decimal"
                                value={param.value || ''}
                                onChange={(e) => handleParameterChange(param.id, e.target.value)}
                                placeholder="—"
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 pr-8 text-sm font-bold text-right tabular-nums focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-gray-400 pointer-events-none">{param.unit}</span>
                            </div>
                            <div className="w-6 flex-shrink-0 flex justify-center">
                              {status === 'low' && <ArrowDown className="w-4 h-4 text-blue-500" />}
                              {status === 'high' && <ArrowUp className="w-4 h-4 text-red-500" />}
                              {status === 'normal' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              ))}

              <div className="mt-4 flex items-start gap-2.5 p-3 rounded-2xl bg-gray-50 border border-gray-100 text-[11px] text-gray-500">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
                <p>
                  Wpisuj wartości w jednostkach podanych przy parametrach (tak jak na wydruku).
                  Jeśli laboratorium podało inne jednostki (np. mmol/L zamiast mg/dL), przelicz je przed wpisaniem.
                  Normy referencyjne różnią się między laboratoriami — w razie wątpliwości odsyłaj do zakresu z wydruku.
                </p>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={filledCount === 0}
                className="pv-btn-primary w-full py-4 text-base disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Calculator className="w-5 h-5" /> Analizuj {filledCount > 0 ? `${filledCount} ` : ''}{filledCount === 1 ? 'parametr' : 'parametrów'}
              </button>
            </div>
          )}

          {/* Wyniki */}
          {showResults && (
            <>
              <div className="pv-card p-5 animate-slide-up">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-brand-mint flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-brand-dark" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="pv-section-title">Wyniki</h3>
                      <p className="text-xs text-gray-400 truncate">{currentPet?.name} · {petSpecies === 'dog' ? 'pies' : 'kot'}{petAge !== null ? ` · ${ageLabel(currentPet?.birth_date) || `${petAge} lat`}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={handleSave} disabled={saving} className={`pv-btn px-3.5 py-2 rounded-xl text-xs font-bold disabled:opacity-50 ${savedFeedback ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                      {saving ? 'Zapisywanie…' : savedFeedback ? '✓ Zapisano' : 'Zapisz'}
                    </button>
                    <button onClick={handleReset} className="pv-btn px-3.5 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold">Nowa</button>
                  </div>
                </div>

                {saveError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium animate-fade-in">
                    {saveError}
                  </div>
                )}

                {detectedPatterns.length > 0 && (
                  <div className="mb-5 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand" />
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Wykryte powiązania</p>
                    </div>
                    {detectedPatterns.map((pat, i) => {
                      const urg = getUrgencyMeta(pat.urgency);
                      return (
                        <div key={i} className={`p-4 rounded-2xl border-2 flex items-start gap-3 ${pat.urgency === 'high' ? 'bg-red-50/70 border-red-200' : 'bg-amber-50/70 border-amber-200'}`}>
                          <Activity className={`w-5 h-5 flex-shrink-0 mt-0.5 ${pat.urgency === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-bold text-gray-900 text-sm">{pat.title}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urg.cls}`}>{urg.label}</span>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">{pat.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-2.5">
                  {analysisResults.filter((r) => r.status !== 'normal').map((result, index) => {
                    const cfg = STATUS_CFG[result.status];
                    const urg = getUrgencyMeta(result.urgency);
                    const expanded = expandedResult === index;
                    return (
                      <div key={index} className={`rounded-2xl border-2 ${cfg.bg} ${cfg.border} overflow-hidden`}>
                        <button onClick={() => setExpandedResult(expanded ? null : index)} className="w-full p-3.5 text-left">
                          <div className="flex items-center gap-3">
                            <span className={`w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                              <cfg.Icon className="w-5 h-5" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 text-sm">{result.parameter}</p>
                              <p className="text-xs text-gray-600">
                                {result.value} {result.unit} · norma {result.min}–{result.max}
                                {result.deviation > 0 && ` · ${result.deviation.toFixed(0)}%`}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urg.cls}`}>{urg.label}</span>
                              {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                            </div>
                          </div>
                          <div className="mt-3 relative h-2 rounded-full bg-white/70">
                            <div className="absolute top-0 h-full bg-emerald-300/50" style={{ left: `${gaugePos(result.min, result.min, result.max)}%`, width: `${gaugePos(result.max, result.min, result.max) - gaugePos(result.min, result.min, result.max)}%` }} />
                            <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow ${result.status === 'low' ? 'bg-blue-500' : 'bg-red-500'}`} style={{ left: `calc(${gaugePos(result.value, result.min, result.max)}% - 6px)` }} />
                          </div>
                        </button>

                        {expanded && (
                          <div className="px-3.5 pb-4 space-y-2.5 animate-fade-in">
                            {result.ageNote && (
                              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start gap-2">
                                <Lightbulb className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-indigo-700 leading-relaxed">{result.ageNote}</p>
                              </div>
                            )}
                            {result.linkedConditions.length > 0 && (
                              <div className="p-3 rounded-xl bg-violet-50 border border-violet-100 flex items-start gap-2">
                                <Stethoscope className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[10px] font-bold text-violet-700 uppercase mb-1">Powiązane z kartą zdrowia</p>
                                  <p className="text-xs text-violet-600">{result.linkedConditions.join(' · ')}</p>
                                </div>
                              </div>
                            )}
                            <div className="p-3 rounded-xl bg-white/70">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Interpretacja</p>
                              <p className="text-xs text-gray-700 leading-relaxed">{result.interpretation}</p>
                            </div>
                            {result.possibleCauses.length > 0 && (
                              <div className="p-3 rounded-xl bg-white/70">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">Możliwe przyczyny</p>
                                <ul className="text-xs text-gray-600 space-y-1">
                                  {result.possibleCauses.map((c, i) => <li key={i} className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />{c}</li>)}
                                </ul>
                              </div>
                            )}
                            {result.dietaryRecommendations.length > 0 && (
                              <div className="p-3 rounded-xl bg-white/70">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">Zalecenia dietetyczne</p>
                                <ul className="text-xs text-gray-600 space-y-1">
                                  {result.dietaryRecommendations.map((r, i) => <li key={i} className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-brand mt-0 flex-shrink-0" />{r}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {analysisResults.filter((r) => r.status === 'normal').length > 0 && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <p className="font-bold text-emerald-900 text-sm">W normie</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {analysisResults.filter((r) => r.status === 'normal').map((r, i) => (
                          <span key={i} className="text-[11px] text-emerald-700 bg-white/70 px-2 py-1 rounded-lg">{r.parameter} <b>{r.value}</b></span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative rounded-[28px] overflow-hidden px-6 py-5 text-white animate-slide-up" style={{ background: 'linear-gradient(135deg,#0F3D2E 0%,#1B6B4A 55%,#2E8B62 100%)' }}>
                <PawPrint className="absolute -right-4 -top-6 w-28 h-28 text-white/[0.07] rotate-12" />
                <div className="relative z-10">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div><p className="text-2xl font-bold tabular-nums">{analysisResults.filter((r) => r.status === 'normal').length}</p><p className="text-[10px] opacity-80 mt-0.5">W normie</p></div>
                    <div><p className="text-2xl font-bold tabular-nums">{abnormalCount}</p><p className="text-[10px] opacity-80 mt-0.5">Odchylenia</p></div>
                    <div><p className="text-2xl font-bold tabular-nums">{analysisResults.filter((r) => r.urgency === 'high').length}</p><p className="text-[10px] opacity-80 mt-0.5">Pilne</p></div>
                  </div>
                  <div className="mt-4 p-3 bg-white/10 rounded-2xl">
                    <p className="text-[11px] leading-relaxed opacity-90"><strong>Ważne:</strong> analiza nie zastępuje konsultacji weterynaryjnej.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ====== TAB: HISTORIA ====== */}
      {tab === 'history' && (
        <div className="space-y-4 animate-fade-in">
          {savedLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="pv-skeleton h-20 rounded-2xl" />)}
            </div>
          ) : savedError ? (
            <div className="pv-card p-10 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <p className="font-bold text-gray-800">Nie udało się pobrać historii</p>
              <p className="text-sm text-gray-400 mt-1 mb-5">{savedError}</p>
              <button onClick={loadSavedAnalyses} className="pv-btn-primary px-5 py-2.5 text-sm">Spróbuj ponownie</button>
            </div>
          ) : savedAnalyses.length === 0 ? (
            <div className="pv-card p-10 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-mint flex items-center justify-center">
                <History className="w-6 h-6 text-brand-dark" />
              </div>
              <p className="font-bold text-gray-800">Brak zapisanych analiz</p>
              <p className="text-sm text-gray-400 mt-1 mb-5">Wykonaj analizę i zapisz ją, żeby śledzić zmiany w czasie.</p>
              <button onClick={() => setTab('analyze')} className="pv-btn-primary px-5 py-2.5 text-sm">Rozpocznij analizę</button>
            </div>
          ) : (
            savedAnalyses.map((a) => {
              const bad = (a.results || []).filter((r) => r.status !== 'normal');
              const expanded = expandedSaved === a.id;
              return (
                <div key={a.id} className={`pv-card overflow-hidden transition-all`}>
                  <button onClick={() => setExpandedSaved(expanded ? null : a.id)} className="w-full flex items-center gap-4 p-4 text-left">
                    <div className="w-11 h-11 rounded-2xl bg-brand-mint flex items-center justify-center flex-shrink-0 text-xl">
                      {SPECIES_EMOJI[a.species] || '🐾'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">
                        {a.petName}
                        <span className="text-gray-400 font-normal"> · {new Date(a.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {(a.parameters || []).length} parametrów
                        {bad.length > 0 ? <span className="text-red-500 font-semibold"> · {bad.length} odchyleń</span> : <span className="text-emerald-600 font-semibold"> · wszystko w normie</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(a.id); }}
                        className="w-8 h-8 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center"
                        aria-label="Usuń"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {expanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-gray-100 animate-fade-in">
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {(a.results || []).map((r, i) => (
                          <span key={i} className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            r.status === 'low' ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : r.status === 'high' ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {r.status === 'low' ? '↓' : r.status === 'high' ? '↑' : '✓'} {r.parameter} {r.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ====== TAB: SŁOWNIK ====== */}
      {tab === 'glossary' && (
        <div className="space-y-4 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={glossaryQuery}
              onChange={(e) => setGlossaryQuery(e.target.value)}
              placeholder="Szukaj parametru… np. kreatynina, ALT"
              className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm shadow-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
          </div>

          {(['morphology', 'biochemistry', 'electrolytes'] as const).map((cat) => {
            const catParams = glossaryFiltered.filter((p) => p.category === cat);
            if (catParams.length === 0) return null;
            return (
              <div key={cat}>
                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5 px-1">
                  <span>{catIcons[cat]}</span>{categoryNames[cat]}
                </h4>
                <div className="pv-card overflow-hidden divide-y divide-gray-100">
                  {catParams.map((p) => {
                    const { min, max } = rangeFor(p);
                    const expanded = glossaryExpanded === p.id;
                    return (
                      <div key={p.id}>
                        <button onClick={() => setGlossaryExpanded(expanded ? null : p.id)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/50 transition-all">
                          <span className="text-xs font-bold text-brand-dark bg-brand-mint px-2 py-1 rounded-lg w-14 text-center flex-shrink-0">{p.name}</span>
                          <span className="flex-1 text-sm font-medium text-gray-800">{p.namePl}</span>
                          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>
                        {expanded && (
                          <div className="px-4 pb-4 animate-fade-in">
                            <p className="text-xs text-gray-600 leading-relaxed">{GLOSSARY[p.id]}</p>
                            <p className="text-[10px] text-gray-400 mt-2">Norma ({petSpecies === 'dog' ? 'pies' : 'kot'}): {min}–{max} {p.unit}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {glossaryFiltered.length === 0 && (
            <div className="pv-card p-8 text-center">
              <p className="text-sm text-gray-500">Brak parametrów pasujących do „{glossaryQuery}"</p>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteSaved}
        title="Usunąć zapisaną analizę?"
        description={
          deleteTarget
            ? `Analiza z ${new Date(savedAnalyses.find((a) => a.id === deleteTarget)?.date || '').toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })} zostanie trwale usunięta z tego urządzenia.`
            : undefined
        }
        confirmLabel="Usuń analizę"
        loading={deleting}
      />
    </div>
  );
}
