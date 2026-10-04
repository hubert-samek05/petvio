'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Calendar,
  Heart,
  Baby,
  FileText,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Clock
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
  puppies: Puppy[];
}

interface Puppy {
  id: string;
  name?: string;
  gender: 'male' | 'female';
  weight: number;
  color?: string;
  status: 'available' | 'reserved' | 'sold';
  buyer?: string;
  price?: number;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  gender?: string;
}

const stepLabels = ['Podstawowe', 'Szczegóły', 'Podsumowanie'];

export default function Breeding() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cycles' | 'pregnancies' | 'litters'>('cycles');
  const [heatCycles, setHeatCycles] = useState<HeatCycle[]>([]);
  const [pregnancies, setPregnancies] = useState<Pregnancy[]>([]);
  const [litters, setLitters] = useState<Litter[]>([]);
  
  const [showAddCycleModal, setShowAddCycleModal] = useState(false);
  const [showAddPregnancyModal, setShowAddPregnancyModal] = useState(false);
  const [showAddLitterModal, setShowAddLitterModal] = useState(false);
  const [step, setStep] = useState(1);

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
    const userData = localStorage.getItem('user');
    if (userData) {
      const mockPets: Pet[] = [
        { id: '1', name: 'Luna', species: 'dog', gender: 'female' },
        { id: '2', name: 'Bella', species: 'cat', gender: 'female' },
      ];
      setPets(mockPets);
      setSelectedPet(mockPets[0].id);

      const savedCycles = localStorage.getItem('heatCycles');
      if (savedCycles) setHeatCycles(JSON.parse(savedCycles));

      const savedPregnancies = localStorage.getItem('pregnancies');
      if (savedPregnancies) setPregnancies(JSON.parse(savedPregnancies));

      const savedLitters = localStorage.getItem('litters');
      if (savedLitters) setLitters(JSON.parse(savedLitters));
    }
  }, []);

  const currentPet = pets.find(p => p.id === selectedPet);
  const filteredCycles = heatCycles.filter(c => c.petId === selectedPet);
  const filteredPregnancies = pregnancies.filter(p => p.petId === selectedPet);
  const filteredLitters = litters.filter(l => l.petId === selectedPet);

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleAddCycle = () => {
    if (!selectedPet || !cycleFormData.startDate) return;

    const cycle: HeatCycle = {
      id: Date.now().toString(),
      petId: selectedPet,
      petName: currentPet?.name || '',
      startDate: cycleFormData.startDate,
      endDate: cycleFormData.endDate || undefined,
      mated: cycleFormData.mated,
      matingDate: cycleFormData.matingDate || undefined,
      partnerName: cycleFormData.partnerName || undefined,
      notes: cycleFormData.notes || undefined,
    };

    const updated = [...heatCycles, cycle];
    setHeatCycles(updated);
    localStorage.setItem('heatCycles', JSON.stringify(updated));

    setCycleFormData({
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      mated: false,
      matingDate: '',
      partnerName: '',
      notes: '',
    });
    setShowAddCycleModal(false);
    setStep(1);
  };

  const handleAddPregnancy = () => {
    if (!selectedPet || !pregnancyFormData.matingDate || !pregnancyFormData.expectedDueDate) return;

    const pregnancy: Pregnancy = {
      id: Date.now().toString(),
      petId: selectedPet,
      petName: currentPet?.name || '',
      matingDate: pregnancyFormData.matingDate,
      expectedDueDate: pregnancyFormData.expectedDueDate,
      confirmed: pregnancyFormData.confirmed,
      confirmationDate: pregnancyFormData.confirmationDate || undefined,
      vetVisits: 0,
      notes: pregnancyFormData.notes || undefined,
      status: 'ongoing',
    };

    const updated = [...pregnancies, pregnancy];
    setPregnancies(updated);
    localStorage.setItem('pregnancies', JSON.stringify(updated));

    setPregnancyFormData({
      matingDate: new Date().toISOString().slice(0, 10),
      expectedDueDate: '',
      confirmed: false,
      confirmationDate: '',
      notes: '',
    });
    setShowAddPregnancyModal(false);
    setStep(1);
  };

  const handleAddLitter = () => {
    if (!selectedPet || !litterFormData.birthDate || !litterFormData.puppiesCount) return;

    const litter: Litter = {
      id: Date.now().toString(),
      petId: selectedPet,
      petName: currentPet?.name || '',
      birthDate: litterFormData.birthDate,
      puppiesCount: parseInt(litterFormData.puppiesCount),
      aliveCount: parseInt(litterFormData.aliveCount) || parseInt(litterFormData.puppiesCount),
      partnerName: litterFormData.partnerName || undefined,
      notes: litterFormData.notes || undefined,
      puppies: [],
    };

    const updated = [...litters, litter];
    setLitters(updated);
    localStorage.setItem('litters', JSON.stringify(updated));

    setLitterFormData({
      birthDate: new Date().toISOString().slice(0, 10),
      puppiesCount: '',
      aliveCount: '',
      partnerName: '',
      notes: '',
    });
    setShowAddLitterModal(false);
    setStep(1);
  };

  const nextStep = () => {
    if (step < 3) setStep(s => s + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-6">
      {stepLabels.map((label, idx) => {
        const n = idx + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={n} className="flex-1">
            <div
              className={`h-2 rounded-full transition-all ${active ? 'bg-brand-dark' : done ? 'bg-emerald-400' : 'bg-gray-200'}`}
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Pet Selection */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <label className="block text-sm font-semibold text-gray-900 mb-2">Wybierz zwierzę</label>
        <select
          value={selectedPet || ''}
          onChange={(e) => setSelectedPet(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 font-medium focus:outline-none focus:border-brand-dark"
        >
          {pets.map(pet => (
            <option key={pet.id} value={pet.id}>
              {pet.name} ({pet.species === 'dog' ? 'Pies' : 'Kot'})
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-2xl border border-gray-200/70 shadow-sm p-1">
        {[
          { id: 'cycles', label: 'Cykle', icon: Calendar },
          { id: 'pregnancies', label: 'Ciąże', icon: Heart },
          { id: 'litters', label: 'Mioty', icon: Baby }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-brand-dark text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Heat Cycles Tab */}
      {activeTab === 'cycles' && (
        <div className="space-y-5">
          <button
            onClick={() => setShowAddCycleModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-brand-dark text-white font-semibold hover:bg-brand-dark transition-all"
          >
            <Plus className="w-6 h-6" />
            Dodaj cykl
          </button>

          {filteredCycles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
                <Calendar className="w-7 h-7 text-brand" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Brak cykli</h3>
              <p className="text-gray-500">Dodaj pierwszy cykl rujowy</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredCycles.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map((cycle) => (
                <div
                  key={cycle.id}
                  className="bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-brand-dark/30 transition-all duration-300 overflow-hidden"
                >
                  <div className="h-1.5 bg-gradient-to-r from-brand-dark to-brand"></div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm text-gray-500">Początek cyklu</div>
                        <div className="text-lg font-bold text-gray-900">
                          {new Date(cycle.startDate).toLocaleDateString('pl-PL')}
                        </div>
                      </div>
                      {cycle.mated && (
                        <div className="px-3 py-1 rounded-full bg-brand-light text-brand-dark text-xs font-semibold">
                          Krycie
                        </div>
                      )}
                    </div>

                    {cycle.endDate && (
                      <div className="mb-3">
                        <div className="text-sm text-gray-500">Koniec cyklu</div>
                        <div className="font-semibold text-gray-900">
                          {new Date(cycle.endDate).toLocaleDateString('pl-PL')}
                        </div>
                      </div>
                    )}

                    {cycle.mated && cycle.partnerName && (
                      <div className="mb-3">
                        <div className="text-sm text-gray-500">Partner</div>
                        <div className="font-semibold text-gray-900">{cycle.partnerName}</div>
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
            onClick={() => setShowAddPregnancyModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-brand-dark text-white font-semibold hover:bg-brand-dark transition-all"
          >
            <Plus className="w-6 h-6" />
            Dodaj ciążę
          </button>

          {filteredPregnancies.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
                <Heart className="w-7 h-7 text-brand" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Brak ciąż</h3>
              <p className="text-gray-500">Dodaj pierwszą ciążę</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredPregnancies.filter(p => p.status === 'ongoing').map((pregnancy) => {
                const daysLeft = getDaysUntilDue(pregnancy.expectedDueDate);
                return (
                  <div
                    key={pregnancy.id}
                    className="bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-brand-dark/30 transition-all duration-300 overflow-hidden"
                  >
                    <div className="h-1.5 bg-gradient-to-r from-brand-dark to-brand"></div>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-sm text-gray-500">Przewidywany poród</div>
                          <div className="text-lg font-bold text-gray-900">
                            {new Date(pregnancy.expectedDueDate).toLocaleDateString('pl-PL')}
                          </div>
                        </div>
                        {pregnancy.confirmed && (
                          <div className="px-3 py-1 rounded-full bg-brand-light text-brand-dark text-xs font-semibold">
                            Potwierdzona
                          </div>
                        )}
                      </div>

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

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-gray-500">Data krycia</div>
                          <div className="font-semibold text-gray-900">
                            {new Date(pregnancy.matingDate).toLocaleDateString('pl-PL')}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Wizyty u wet.</div>
                          <div className="font-semibold text-gray-900">{pregnancy.vetVisits}</div>
                        </div>
                      </div>

                      {pregnancy.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-sm text-gray-600">{pregnancy.notes}</p>
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
            onClick={() => setShowAddLitterModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-brand-dark text-white font-semibold hover:bg-brand-dark transition-all"
          >
            <Plus className="w-6 h-6" />
            Dodaj miot
          </button>

          {filteredLitters.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
                <Baby className="w-7 h-7 text-brand" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Brak miotów</h3>
              <p className="text-gray-500">Dodaj pierwszy miot</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredLitters.sort((a, b) => new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime()).map((litter) => (
                <div
                  key={litter.id}
                  className="bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-brand-dark/30 transition-all duration-300 overflow-hidden"
                >
                  <div className="h-1.5 bg-gradient-to-r from-brand-dark to-brand"></div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm text-gray-500">Data urodzenia</div>
                        <div className="text-lg font-bold text-gray-900">
                          {new Date(litter.birthDate).toLocaleDateString('pl-PL')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-brand-dark">{litter.aliveCount}</div>
                        <div className="text-xs text-gray-500">szczeniąt</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div>
                        <div className="text-gray-500">Całkowita liczba</div>
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

      {/* Add Cycle Modal */}
      {showAddCycleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">Dodaj cykl rujowy</h3>
              <button
                onClick={() => {
                  setShowAddCycleModal(false);
                  setStep(1);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
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
                  onClick={() => {
                    setShowAddCycleModal(false);
                    setStep(1);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleAddCycle}
                  disabled={!cycleFormData.startDate}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-5 h-5" />
                  Dodaj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Pregnancy Modal */}
      {showAddPregnancyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">Dodaj ciążę</h3>
              <button
                onClick={() => {
                  setShowAddPregnancyModal(false);
                  setStep(1);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
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
                  onClick={() => {
                    setShowAddPregnancyModal(false);
                    setStep(1);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleAddPregnancy}
                  disabled={!pregnancyFormData.matingDate || !pregnancyFormData.expectedDueDate}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-5 h-5" />
                  Dodaj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Litter Modal */}
      {showAddLitterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">Dodaj miot</h3>
              <button
                onClick={() => {
                  setShowAddLitterModal(false);
                  setStep(1);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
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
                <label className="block text-sm font-semibold text-gray-900 mb-2">Liczba szczeniąt</label>
                <input
                  type="number"
                  value={litterFormData.puppiesCount}
                  onChange={(e) => setLitterFormData({ ...litterFormData, puppiesCount: e.target.value })}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Liczba żywych szczeniąt</label>
                <input
                  type="number"
                  value={litterFormData.aliveCount}
                  onChange={(e) => setLitterFormData({ ...litterFormData, aliveCount: e.target.value })}
                  placeholder="0"
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
                  onClick={() => {
                    setShowAddLitterModal(false);
                    setStep(1);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleAddLitter}
                  disabled={!litterFormData.birthDate || !litterFormData.puppiesCount}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-5 h-5" />
                  Dodaj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
