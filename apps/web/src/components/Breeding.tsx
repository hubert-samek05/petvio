'use client';

import { petApi, breedingApi } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useState, useEffect } from 'react';
import {
  Plus,
  Calendar,
  Heart,
  Baby,
  X,
  Check,
  AlertCircle,
  Clock,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCcw,
  Stethoscope,
} from 'lucide-react';

interface HeatCycle {
  id: string;
  petId: string;
  petName: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  mated: boolean;
  matingDate?: string;
  partnerName?: string;
}

interface Pregnancy {
  id: string;
  petId: string;
  petName: string;
  matingDate: string;
  expectedDueDate: string;
  confirmed: boolean;
  confirmationDate?: string;
  vetVisits: number;
  notes?: string;
  status: 'ongoing' | 'completed' | 'failed';
}

interface Litter {
  id: string;
  petId: string;
  petName: string;
  birthDate: string;
  puppiesCount: number;
  aliveCount: number;
  partnerName?: string;
  notes?: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  gender?: string;
}

const mapCycle = (r: any): HeatCycle => ({
  id: String(r.id),
  petId: String(r.pet_id),
  petName: r.pet_name || '',
  startDate: r.start_date,
  endDate: r.end_date || undefined,
  mated: !!r.mated,
  matingDate: r.mating_date || undefined,
  partnerName: r.partner_name || undefined,
  notes: r.notes || undefined,
});

const mapPregnancy = (r: any): Pregnancy => ({
  id: String(r.id),
  petId: String(r.pet_id),
  petName: r.pet_name || '',
  matingDate: r.mating_date,
  expectedDueDate: r.expected_due_date,
  confirmed: !!r.confirmed,
  confirmationDate: r.confirmation_date || undefined,
  vetVisits: r.vet_visits ?? 0,
  notes: r.notes || undefined,
  status: r.status,
});

const mapLitter = (r: any): Litter => ({
  id: String(r.id),
  petId: String(r.pet_id),
  petName: r.pet_name || '',
  birthDate: r.birth_date,
  puppiesCount: r.puppies_count,
  aliveCount: r.alive_count,
  partnerName: r.partner_name || undefined,
  notes: r.notes || undefined,
});

const pregnancyStatusLabel: Record<string, { label: string; chip: string }> = {
  ongoing: { label: 'W trakcie', chip: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Zakończona', chip: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'Nieudana', chip: 'bg-red-100 text-red-600' },
};

export default function Breeding() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cycles' | 'pregnancies' | 'litters'>('cycles');
  const [heatCycles, setHeatCycles] = useState<HeatCycle[]>([]);
  const [pregnancies, setPregnancies] = useState<Pregnancy[]>([]);
  const [litters, setLitters] = useState<Litter[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const [showAddCycleModal, setShowAddCycleModal] = useState(false);
  const [showAddPregnancyModal, setShowAddPregnancyModal] = useState(false);
  const [showAddLitterModal, setShowAddLitterModal] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; run: () => Promise<void> } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [cycleFormData, setCycleFormData] = useState({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    mated: false,
    matingDate: '',
    partnerName: '',
    notes: '',
  });

  const [pregnancyFormData, setPregnancyFormData] = useState({
    matingDate: new Date().toISOString().slice(0, 10),
    expectedDueDate: '',
    confirmed: false,
    confirmationDate: '',
    notes: '',
  });

  const [litterFormData, setLitterFormData] = useState({
    birthDate: new Date().toISOString().slice(0, 10),
    puppiesCount: '',
    aliveCount: '',
    partnerName: '',
    notes: '',
  });

  const loadAll = async () => {
    try {
      const [c, p, l] = await Promise.all([
        breedingApi.getCycles(),
        breedingApi.getPregnancies(),
        breedingApi.getLitters(),
      ]);
      setHeatCycles((c.cycles || []).map(mapCycle));
      setPregnancies((p.pregnancies || []).map(mapPregnancy));
      setLitters((l.litters || []).map(mapLitter));
      setLoadError('');
    } catch (e) {
      console.error('Breeding load error:', e);
      setLoadError('Nie udało się pobrać danych rozrodu. Sprawdź połączenie.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showAddCycleModal || showAddPregnancyModal || showAddLitterModal) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [showAddCycleModal, showAddPregnancyModal, showAddLitterModal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddCycleModal(false);
        setShowAddPregnancyModal(false);
        setShowAddLitterModal(false);
      }
    };
    if (showAddCycleModal || showAddPregnancyModal || showAddLitterModal) {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [showAddCycleModal, showAddPregnancyModal, showAddLitterModal]);

  useEffect(() => {
    petApi
      .getAll()
      .then((res) => {
        const list = (res.pets || res || []).map((p: any) => ({
          id: String(p.id),
          name: p.name,
          species: p.species,
          gender: p.gender,
        }));
        setPets(list);
        if (list.length > 0) setSelectedPet(list[0].id);
      })
      .catch(() => setPets([]));

    loadAll();
  }, []);

  const currentPet = pets.find((p) => p.id === selectedPet);
  const filteredCycles = heatCycles.filter((c) => c.petId === selectedPet);
  const filteredPregnancies = pregnancies.filter((p) => p.petId === selectedPet);
  const filteredLitters = litters.filter((l) => l.petId === selectedPet);

  const getDaysUntilDue = (dueDate: string) =>
    Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);

  const resetCycleForm = () =>
    setCycleFormData({ startDate: new Date().toISOString().slice(0, 10), endDate: '', mated: false, matingDate: '', partnerName: '', notes: '' });
  const resetPregnancyForm = () =>
    setPregnancyFormData({ matingDate: new Date().toISOString().slice(0, 10), expectedDueDate: '', confirmed: false, confirmationDate: '', notes: '' });
  const resetLitterForm = () =>
    setLitterFormData({ birthDate: new Date().toISOString().slice(0, 10), puppiesCount: '', aliveCount: '', partnerName: '', notes: '' });

  const handleAddCycle = async () => {
    if (!selectedPet || !cycleFormData.startDate) return;
    setSubmitting(true);
    setFormError('');
    try {
      await breedingApi.addCycle({
        petId: selectedPet,
        startDate: cycleFormData.startDate,
        endDate: cycleFormData.endDate || undefined,
        mated: cycleFormData.mated,
        matingDate: cycleFormData.matingDate || undefined,
        partnerName: cycleFormData.partnerName || undefined,
        notes: cycleFormData.notes || undefined,
      });
      resetCycleForm();
      setShowAddCycleModal(false);
      await loadAll();
    } catch (e: any) {
      setFormError(e?.response?.data?.error?.message || 'Nie udało się dodać cyklu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPregnancy = async () => {
    if (!selectedPet || !pregnancyFormData.matingDate || !pregnancyFormData.expectedDueDate) return;
    setSubmitting(true);
    setFormError('');
    try {
      await breedingApi.addPregnancy({
        petId: selectedPet,
        matingDate: pregnancyFormData.matingDate,
        expectedDueDate: pregnancyFormData.expectedDueDate,
        confirmed: pregnancyFormData.confirmed,
        confirmationDate: pregnancyFormData.confirmationDate || undefined,
        notes: pregnancyFormData.notes || undefined,
      });
      resetPregnancyForm();
      setShowAddPregnancyModal(false);
      await loadAll();
    } catch (e: any) {
      setFormError(e?.response?.data?.error?.message || 'Nie udało się dodać ciąży.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddLitter = async () => {
    if (!selectedPet || !litterFormData.birthDate || !litterFormData.puppiesCount) return;
    setSubmitting(true);
    setFormError('');
    try {
      await breedingApi.addLitter({
        petId: selectedPet,
        birthDate: litterFormData.birthDate,
        puppiesCount: litterFormData.puppiesCount,
        aliveCount: litterFormData.aliveCount || undefined,
        partnerName: litterFormData.partnerName || undefined,
        notes: litterFormData.notes || undefined,
      });
      resetLitterForm();
      setShowAddLitterModal(false);
      await loadAll();
    } catch (e: any) {
      setFormError(e?.response?.data?.error?.message || 'Nie udało się dodać miotu.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRecord = (kind: 'cycle' | 'pregnancy' | 'litter', id: string, label: string) => {
    setConfirmAction({
      title: `Usunąć ${label}?`,
      description: 'Rekord zostanie trwale usunięty.',
      run: async () => {
        setActionBusy(id);
        try {
          if (kind === 'cycle') await breedingApi.deleteCycle(id);
          else if (kind === 'pregnancy') await breedingApi.deletePregnancy(id);
          else await breedingApi.deleteLitter(id);
          if (kind === 'cycle') setHeatCycles((l) => l.filter((x) => x.id !== id));
          if (kind === 'pregnancy') setPregnancies((l) => l.filter((x) => x.id !== id));
          if (kind === 'litter') setLitters((l) => l.filter((x) => x.id !== id));
        } catch (e: any) {
          setActionError(e?.response?.data?.error?.message || 'Nie udało się usunąć rekordu.');
        } finally {
          setActionBusy(null);
        }
      },
    });
  };

  const handlePregnancyPatch = async (p: Pregnancy, data: any) => {
    setActionBusy(p.id);
    try {
      await breedingApi.updatePregnancy(p.id, data);
      await loadAll();
    } catch (e: any) {
      setActionError(e?.response?.data?.error?.message || 'Nie udało się zaktualizować ciąży.');
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      {actionError && (
        <div className="pv-card p-3.5 flex items-center justify-between gap-3 border-l-4 border-red-400">
          <p className="text-sm text-red-600">{actionError}</p>
          <button onClick={() => setActionError('')} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Zamknij">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Pet Selection */}
      <div className="pv-card p-5">
        <label className="block text-sm font-semibold text-gray-900 mb-2">Wybierz zwierzę</label>
        <select
          value={selectedPet || ''}
          onChange={(e) => setSelectedPet(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 font-medium focus:outline-none focus:border-brand-dark"
        >
          {pets.map((pet) => (
            <option key={pet.id} value={pet.id}>
              {pet.name} ({pet.species === 'dog' ? 'Pies' : pet.species === 'cat' ? 'Kot' : pet.species})
            </option>
          ))}
        </select>
        {pets.length === 0 && !loading && (
          <p className="text-xs text-gray-400 mt-2">Dodaj pupila w zakładce Pupile, aby śledzić rozród.</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 pv-card p-1">
        {[
          { id: 'cycles', label: `Cykle (${filteredCycles.length})`, icon: Calendar },
          { id: 'pregnancies', label: `Ciąże (${filteredPregnancies.length})`, icon: Heart },
          { id: 'litters', label: `Mioty (${filteredLitters.length})`, icon: Baby },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                activeTab === tab.id ? 'bg-brand-dark text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="hidden sm:inline text-sm">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="pv-card p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-brand animate-spin" />
          <p className="text-sm text-gray-500 mt-3">Ładowanie danych...</p>
        </div>
      ) : loadError ? (
        <div className="pv-card p-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-3" />
          <p className="text-gray-700 mb-4">{loadError}</p>
          <button
            onClick={() => {
              setLoading(true);
              loadAll();
            }}
            className="pv-btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" /> Spróbuj ponownie
          </button>
        </div>
      ) : (
        <>
          {/* Heat Cycles Tab */}
          {activeTab === 'cycles' && (
            <div className="space-y-5">
              <button
                onClick={() => {
                  resetCycleForm();
                  setFormError('');
                  setShowAddCycleModal(true);
                }}
                disabled={!selectedPet}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl pv-btn-primary disabled:opacity-50"
              >
                <Plus className="w-6 h-6" />
                Dodaj cykl
              </button>

              {filteredCycles.length === 0 ? (
                <div className="pv-card p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
                    <Calendar className="w-7 h-7 text-brand" />
                  </div>
                  <h3 className="pv-section-title mb-2">Brak cykli</h3>
                  <p className="text-gray-500">Dodaj pierwszy cykl rujowy dla {currentPet?.name || 'pupila'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredCycles
                    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                    .map((cycle) => (
                      <div key={cycle.id} className="pv-card-hover overflow-hidden">
                        <div className="h-1.5 bg-gradient-to-r from-brand-dark to-brand"></div>
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <div className="text-sm text-gray-500">Początek cyklu</div>
                              <div className="text-lg font-bold text-gray-900">
                                {new Date(cycle.startDate).toLocaleDateString('pl-PL')}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {cycle.mated && (
                                <div className="px-3 py-1 rounded-full bg-brand-light text-brand-dark text-xs font-semibold">
                                  Krycie
                                </div>
                              )}
                              <button
                                onClick={() => deleteRecord('cycle', cycle.id, 'ten cykl')}
                                disabled={actionBusy === cycle.id}
                                className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {cycle.endDate && (
                            <div className="mb-3">
                              <div className="text-sm text-gray-500">Koniec cyklu</div>
                              <div className="font-semibold text-gray-900">
                                {new Date(cycle.endDate).toLocaleDateString('pl-PL')}
                              </div>
                            </div>
                          )}

                          {cycle.mated && (
                            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                              {cycle.matingDate && (
                                <div>
                                  <div className="text-gray-500">Data krycia</div>
                                  <div className="font-semibold text-gray-900">
                                    {new Date(cycle.matingDate).toLocaleDateString('pl-PL')}
                                  </div>
                                </div>
                              )}
                              {cycle.partnerName && (
                                <div>
                                  <div className="text-gray-500">Partner</div>
                                  <div className="font-semibold text-gray-900">{cycle.partnerName}</div>
                                </div>
                              )}
                            </div>
                          )}

                          {cycle.notes && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-sm text-gray-600">{cycle.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Pregnancies Tab */}
          {activeTab === 'pregnancies' && (
            <div className="space-y-5">
              <button
                onClick={() => {
                  resetPregnancyForm();
                  setFormError('');
                  setShowAddPregnancyModal(true);
                }}
                disabled={!selectedPet}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl pv-btn-primary disabled:opacity-50"
              >
                <Plus className="w-6 h-6" />
                Dodaj ciążę
              </button>

              {filteredPregnancies.length === 0 ? (
                <div className="pv-card p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
                    <Heart className="w-7 h-7 text-brand" />
                  </div>
                  <h3 className="pv-section-title mb-2">Brak ciąż</h3>
                  <p className="text-gray-500">Dodaj pierwszą ciążę dla {currentPet?.name || 'pupila'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredPregnancies
                    .sort((a, b) => (a.status === 'ongoing' ? -1 : 1) - (b.status === 'ongoing' ? -1 : 1))
                    .map((pregnancy) => {
                      const daysLeft = getDaysUntilDue(pregnancy.expectedDueDate);
                      const ongoing = pregnancy.status === 'ongoing';
                      const cfg = pregnancyStatusLabel[pregnancy.status] || pregnancyStatusLabel.ongoing;

                      return (
                        <div key={pregnancy.id} className={`pv-card-hover overflow-hidden ${!ongoing ? 'opacity-80' : ''}`}>
                          <div
                            className={`h-1.5 ${
                              ongoing ? 'bg-gradient-to-r from-brand-dark to-brand' : pregnancy.status === 'completed' ? 'bg-emerald-500' : 'bg-red-400'
                            }`}
                          ></div>
                          <div className="p-5">
                            <div className="flex items-center justify-between mb-4 gap-2">
                              <div>
                                <div className="text-sm text-gray-500">Przewidywany poród</div>
                                <div className="text-lg font-bold text-gray-900">
                                  {new Date(pregnancy.expectedDueDate).toLocaleDateString('pl-PL')}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {pregnancy.confirmed && (
                                  <div className="px-3 py-1 rounded-full bg-brand-light text-brand-dark text-xs font-semibold">
                                    Potwierdzona
                                  </div>
                                )}
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cfg.chip}`}>{cfg.label}</span>
                                <button
                                  onClick={() => deleteRecord('pregnancy', pregnancy.id, 'tę ciążę')}
                                  disabled={actionBusy === pregnancy.id}
                                  className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {ongoing && (
                              <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Clock className="w-4 h-4 text-brand-dark" />
                                  <span className="text-sm font-semibold text-gray-900">
                                    {daysLeft > 0 ? `${daysLeft} dni do porodu` : daysLeft === 0 ? 'Dziś!' : 'Po terminie'}
                                  </span>
                                </div>
                                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-brand-dark to-brand rounded-full transition-all"
                                    style={{ width: `${Math.min(100, Math.max(0, 100 - (daysLeft / 63) * 100))}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="text-gray-500">Data krycia</div>
                                <div className="font-semibold text-gray-900">
                                  {new Date(pregnancy.matingDate).toLocaleDateString('pl-PL')}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">Wizyty u wet.</div>
                                <div className="font-semibold text-gray-900 flex items-center gap-2">
                                  {pregnancy.vetVisits}
                                  {ongoing && (
                                    <button
                                      onClick={() => handlePregnancyPatch(pregnancy, { vetVisits: pregnancy.vetVisits + 1 })}
                                      disabled={actionBusy === pregnancy.id}
                                      className="px-2 py-0.5 rounded-md bg-brand-light text-brand-dark text-xs font-semibold hover:bg-brand-light/70 disabled:opacity-50"
                                    >
                                      +1
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {pregnancy.notes && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <p className="text-sm text-gray-600">{pregnancy.notes}</p>
                              </div>
                            )}

                            {pregnancy.status === 'completed' && (
                              <div className="mt-4 pt-3 border-t border-gray-100">
                                <button
                                  onClick={() => {
                                    resetLitterForm();
                                    setLitterFormData((f) => ({ ...f, birthDate: pregnancy.expectedDueDate <= new Date().toISOString().slice(0, 10) ? pregnancy.expectedDueDate : new Date().toISOString().slice(0, 10) }));
                                    setFormError('');
                                    setActiveTab('litters');
                                    setShowAddLitterModal(true);
                                  }}
                                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-brand-light text-brand-dark text-xs font-semibold hover:bg-brand-light/70 transition-all"
                                >
                                  <Baby className="w-3.5 h-3.5" /> Zarejestruj miot z tej ciąży
                                </button>
                              </div>
                            )}
                            {ongoing && (
                              <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                                {!pregnancy.confirmed && (
                                  <button
                                    onClick={() => handlePregnancyPatch(pregnancy, { confirmed: true })}
                                    disabled={actionBusy === pregnancy.id}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-brand-light text-brand-dark text-xs font-semibold hover:bg-brand-light/70 disabled:opacity-50"
                                  >
                                    <Stethoscope className="w-3.5 h-3.5" /> Potwierdź (wet)
                                  </button>
                                )}
                                <button
                                  onClick={() => handlePregnancyPatch(pregnancy, { status: 'completed' })}
                                  disabled={actionBusy === pregnancy.id}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" /> Poród odbył się
                                </button>
                                <button
                                  onClick={() => handlePregnancyPatch(pregnancy, { status: 'failed' })}
                                  disabled={actionBusy === pregnancy.id}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 disabled:opacity-50"
                                >
                                  <AlertCircle className="w-3.5 h-3.5" /> Nieudana
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Litters Tab */}
          {activeTab === 'litters' && (
            <div className="space-y-5">
              <button
                onClick={() => {
                  resetLitterForm();
                  setFormError('');
                  setShowAddLitterModal(true);
                }}
                disabled={!selectedPet}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl pv-btn-primary disabled:opacity-50"
              >
                <Plus className="w-6 h-6" />
                Dodaj miot
              </button>

              {filteredLitters.length === 0 ? (
                <div className="pv-card p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
                    <Baby className="w-7 h-7 text-brand" />
                  </div>
                  <h3 className="pv-section-title mb-2">Brak miotów</h3>
                  <p className="text-gray-500">Dodaj pierwszy miot dla {currentPet?.name || 'pupila'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredLitters
                    .sort((a, b) => new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime())
                    .map((litter) => (
                      <div key={litter.id} className="pv-card-hover overflow-hidden">
                        <div className="h-1.5 bg-gradient-to-r from-brand-dark to-brand"></div>
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <div className="text-sm text-gray-500">Data urodzenia</div>
                              <div className="text-lg font-bold text-gray-900">
                                {new Date(litter.birthDate).toLocaleDateString('pl-PL')}
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="text-right">
                                <div className="text-3xl font-bold text-brand-dark">{litter.aliveCount}</div>
                                <div className="text-xs text-gray-500">żyjących</div>
                              </div>
                              <button
                                onClick={() => deleteRecord('litter', litter.id, 'ten miot')}
                                disabled={actionBusy === litter.id}
                                className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                            <div>
                              <div className="text-gray-500">W miocie ogółem</div>
                              <div className="font-semibold text-gray-900">{litter.puppiesCount}</div>
                            </div>
                            {litter.partnerName && (
                              <div>
                                <div className="text-gray-500">Partner</div>
                                <div className="font-semibold text-gray-900">{litter.partnerName}</div>
                              </div>
                            )}
                          </div>

                          {litter.notes && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-sm text-gray-600">{litter.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Cycle Modal */}
      {showAddCycleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">Dodaj cykl rujowy</h3>
              <button
                onClick={() => setShowAddCycleModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{formError}</div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Data rozpoczęcia</label>
                <input
                  type="date"
                  value={cycleFormData.startDate}
                  onChange={(e) => setCycleFormData({ ...cycleFormData, startDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Data zakończenia (opcjonalnie)</label>
                <input
                  type="date"
                  value={cycleFormData.endDate}
                  onChange={(e) => setCycleFormData({ ...cycleFormData, endDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="mated"
                  checked={cycleFormData.mated}
                  onChange={(e) => setCycleFormData({ ...cycleFormData, mated: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-brand-dark focus:ring-brand-dark"
                />
                <label htmlFor="mated" className="text-sm font-semibold text-gray-900">Krycie</label>
              </div>

              {cycleFormData.mated && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Data krycia</label>
                    <input
                      type="date"
                      value={cycleFormData.matingDate}
                      onChange={(e) => setCycleFormData({ ...cycleFormData, matingDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Imię partnera</label>
                    <input
                      type="text"
                      value={cycleFormData.partnerName}
                      onChange={(e) => setCycleFormData({ ...cycleFormData, partnerName: e.target.value })}
                      placeholder="np. Max"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Notatki (opcjonalnie)</label>
                <textarea
                  value={cycleFormData.notes}
                  onChange={(e) => setCycleFormData({ ...cycleFormData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddCycleModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleAddCycle}
                  disabled={submitting || !cycleFormData.startDate}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Dodaj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Pregnancy Modal */}
      {showAddPregnancyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">Dodaj ciążę</h3>
              <button
                onClick={() => setShowAddPregnancyModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{formError}</div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Data krycia</label>
                <input
                  type="date"
                  value={pregnancyFormData.matingDate}
                  onChange={(e) => setPregnancyFormData({ ...pregnancyFormData, matingDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Przewidywany termin porodu</label>
                <input
                  type="date"
                  value={pregnancyFormData.expectedDueDate}
                  onChange={(e) => setPregnancyFormData({ ...pregnancyFormData, expectedDueDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="confirmed"
                  checked={pregnancyFormData.confirmed}
                  onChange={(e) => setPregnancyFormData({ ...pregnancyFormData, confirmed: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-brand-dark focus:ring-brand-dark"
                />
                <label htmlFor="confirmed" className="text-sm font-semibold text-gray-900">Ciąża potwierdzona przez weterynarza</label>
              </div>

              {pregnancyFormData.confirmed && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Data potwierdzenia</label>
                  <input
                    type="date"
                    value={pregnancyFormData.confirmationDate}
                    onChange={(e) => setPregnancyFormData({ ...pregnancyFormData, confirmationDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Notatki (opcjonalnie)</label>
                <textarea
                  value={pregnancyFormData.notes}
                  onChange={(e) => setPregnancyFormData({ ...pregnancyFormData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddPregnancyModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleAddPregnancy}
                  disabled={submitting || !pregnancyFormData.matingDate || !pregnancyFormData.expectedDueDate}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Dodaj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Litter Modal */}
      {showAddLitterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">Dodaj miot</h3>
              <button
                onClick={() => setShowAddLitterModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{formError}</div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Data urodzenia</label>
                <input
                  type="date"
                  value={litterFormData.birthDate}
                  onChange={(e) => setLitterFormData({ ...litterFormData, birthDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Liczba szczeniąt w miocie</label>
                <input
                  type="number"
                  min={1}
                  value={litterFormData.puppiesCount}
                  onChange={(e) => setLitterFormData({ ...litterFormData, puppiesCount: e.target.value })}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Liczba żyjących (opcjonalnie)</label>
                <input
                  type="number"
                  min={0}
                  value={litterFormData.aliveCount}
                  onChange={(e) => setLitterFormData({ ...litterFormData, aliveCount: e.target.value })}
                  placeholder="domyślnie = liczba w miocie"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Imię partnera (opcjonalnie)</label>
                <input
                  type="text"
                  value={litterFormData.partnerName}
                  onChange={(e) => setLitterFormData({ ...litterFormData, partnerName: e.target.value })}
                  placeholder="np. Max"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Notatki (opcjonalnie)</label>
                <textarea
                  value={litterFormData.notes}
                  onChange={(e) => setLitterFormData({ ...litterFormData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddLitterModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleAddLitter}
                  disabled={submitting || !litterFormData.birthDate || !litterFormData.puppiesCount}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Dodaj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmAction}
        title={confirmAction?.title || ''}
        description={confirmAction?.description}
        loading={confirmBusy}
        onConfirm={async () => {
          if (!confirmAction) return;
          setConfirmBusy(true);
          try {
            await confirmAction.run();
            setConfirmAction(null);
          } finally {
            setConfirmBusy(false);
          }
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
