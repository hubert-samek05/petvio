'use client';

import { petApi, sharingApi } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useState, useEffect } from 'react';
import {
  UserPlus,
  Mail,
  Shield,
  Check,
  X,
  Clock,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  PawPrint,
  Loader2,
  AlertTriangle,
  RefreshCcw,
  HeartPulse,
  Stethoscope,
  Calendar,
  Inbox,
} from 'lucide-react';
import { usePlan } from '@/lib/plan';

interface SharedUser {
  id: string;
  email: string;
  name?: string | null;
  role: 'petsitter' | 'family' | 'vet' | 'other';
  status: 'pending' | 'accepted' | 'rejected';
  permissions: Record<string, boolean>;
  invitedAt: string;
  acceptedAt?: string | null;
  petIds: string[];
  petNames: string[];
}

interface PendingInvite {
  id: string;
  ownerName: string;
  ownerEmail: string;
  role: string;
  petNames: string[];
  invitedAt: string;
}

interface SharedPet {
  id: string;
  shareId: string;
  name: string;
  species: string;
  breed?: string;
  birthDate?: string;
  gender?: string;
  weight?: number | null;
  photoUrl?: string;
  permissions: Record<string, boolean>;
  role: string;
  ownerName: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
}

const roles = [
  { id: 'family', name: 'Rodzina', description: 'Członek rodziny' },
  { id: 'petsitter', name: 'Petsitter', description: 'Opiekun zwierzęcia' },
  { id: 'vet', name: 'Weterynarz', description: 'Lekarz weterynarii' },
  { id: 'other', name: 'Inny', description: 'Inna osoba' },
];

const permissionsList = [
  { id: 'health', name: 'Zdrowie', description: 'Książeczka zdrowia, wizyty, leki' },
  { id: 'activity', name: 'Aktywność', description: 'Spacery, trening' },
  { id: 'nutrition', name: 'Żywienie', description: 'Diety, przepisy' },
  { id: 'budget', name: 'Finanse', description: 'Budżet, zapasy, zakupy' },
  { id: 'breeding', name: 'Rozród', description: 'Cykle, ciąże, mioty' },
  { id: 'forum', name: 'Forum', description: 'Społeczność' },
  { id: 'statistics', name: 'Statystyki', description: 'Raporty i analizy' },
];

const DEFAULT_PERMS: Record<string, boolean> = {
  health: true, activity: true, nutrition: true, budget: false, breeding: false, forum: true, statistics: false,
};

const recordTypeLabel: Record<string, string> = {
  vaccination: 'Szczepienie',
  checkup: 'Kontrola',
  medication: 'Leki',
  surgery: 'Zabieg',
  other: 'Inne',
};

export default function Sharing() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { info: planInfo, openUpgrade } = usePlan();
  const shareUsage = planInfo?.usage.shares;
  const shareAtLimit = !!shareUsage && shareUsage.max !== null && shareUsage.used >= shareUsage.max;
  const [editingUser, setEditingUser] = useState<SharedUser | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [respondBusy, setRespondBusy] = useState<string | null>(null);
  const [viewingPet, setViewingPet] = useState<SharedPet | null>(null);
  const [petDetail, setPetDetail] = useState<any>(null);
  const [petDetailLoading, setPetDetailLoading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<SharedUser | null>(null);
  const [removing, setRemoving] = useState(false);
  const [listError, setListError] = useState('');

  // ESC zamyka modale
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setViewingPet(null);
      setPetDetail(null);
      if (!submitting) {
        setShowInviteModal(false);
        resetInviteForm();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submitting]);

  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'family' as 'petsitter' | 'family' | 'vet' | 'other',
    petIds: [] as string[],
    permissions: { ...DEFAULT_PERMS },
  });

  const loadAll = async () => {
    try {
      const [sharesRes, sharedRes] = await Promise.all([
        sharingApi.getAll(),
        sharingApi.getSharedPets(),
      ]);
      setSharedUsers(sharesRes.shared || []);
      setPendingInvites(sharesRes.pendingInvites || []);
      setSharedWithMe(sharedRes.pets || []);
      setLoadError('');
    } catch (e) {
      console.error('Sharing load error:', e);
      setLoadError('Nie udało się pobrać udostępnień. Sprawdź połączenie.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showInviteModal || viewingPet) {
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
  }, [showInviteModal, viewingPet]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try { setCurrentUser(JSON.parse(userData)); } catch {}
    }

    petApi
      .getAll()
      .then((res) => {
        const list = (res.pets || res || []).map((p: any) => ({
          id: String(p.id),
          name: p.name,
          species: p.species,
        }));
        setPets(list);
      })
      .catch(() => setPets([]));

    loadAll();
  }, []);

  const resetInviteForm = () => {
    setInviteData({ email: '', role: 'family', petIds: [], permissions: { ...DEFAULT_PERMS } });
    setFormError('');
    setEditingUser(null);
  };

  const handleSendInvite = async () => {
    const email = inviteData.email.trim().toLowerCase();
    if (!email || inviteData.petIds.length === 0) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Podaj prawidłowy adres email.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await sharingApi.invite({
        email,
        role: inviteData.role,
        petIds: inviteData.petIds,
        permissions: inviteData.permissions,
      });
      setShowInviteModal(false);
      resetInviteForm();
      await loadAll();
    } catch (e: any) {
      setFormError(e?.response?.data?.error?.message || 'Nie udało się wysłać zaproszenia.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateShare = async () => {
    if (!editingUser) return;
    setSubmitting(true);
    setFormError('');
    try {
      await sharingApi.update(editingUser.id, {
        petIds: inviteData.petIds,
        permissions: inviteData.permissions,
      });
      setShowInviteModal(false);
      resetInviteForm();
      await loadAll();
    } catch (e: any) {
      setFormError(e?.response?.data?.error?.message || 'Nie udało się zapisać zmian.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveUser = async (user: SharedUser) => {
    setRemoving(true);
    setListError('');
    try {
      await sharingApi.remove(user.id);
      setSharedUsers((u) => u.filter((x) => x.id !== user.id));
      setConfirmRemove(null);
    } catch (e: any) {
      setListError(e?.response?.data?.error?.message || 'Nie udało się usunąć udostępnienia.');
      setConfirmRemove(null);
    } finally {
      setRemoving(false);
    }
  };

  const handleRespond = async (invite: PendingInvite, accept: boolean) => {
    setRespondBusy(invite.id);
    setListError('');
    try {
      await sharingApi.respond(invite.id, accept);
      setPendingInvites((l) => l.filter((i) => i.id !== invite.id));
      await loadAll();
    } catch (e: any) {
      setListError(e?.response?.data?.error?.message || 'Nie udało się odpowiedzieć na zaproszenie.');
    } finally {
      setRespondBusy(null);
    }
  };

  const openSharedPet = async (pet: SharedPet) => {
    setViewingPet(pet);
    setPetDetail(null);
    setPetDetailLoading(true);
    try {
      const res = await sharingApi.getSharedPetDetail(pet.id);
      setPetDetail(res);
    } catch (e) {
      console.error('Shared pet detail error:', e);
    } finally {
      setPetDetailLoading(false);
    }
  };

  const togglePermission = (key: string) => {
    setInviteData({
      ...inviteData,
      permissions: { ...inviteData.permissions, [key]: !inviteData.permissions[key] },
    });
  };

  const togglePet = (petId: string) => {
    const petIds = inviteData.petIds.includes(petId)
      ? inviteData.petIds.filter((id) => id !== petId)
      : [...inviteData.petIds, petId];
    setInviteData({ ...inviteData, petIds });
  };

  const getTimeAgo = (date: string) => {
    const diffMs = Date.now() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Teraz';
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffHours < 24) return `${diffHours} godz. temu`;
    if (diffDays < 7) return `${diffDays} dni temu`;
    return new Date(date).toLocaleDateString('pl-PL');
  };

  const pendingUsers = sharedUsers.filter((u) => u.status === 'pending');
  const acceptedUsers = sharedUsers.filter((u) => u.status === 'accepted');
  const rejectedUsers = sharedUsers.filter((u) => u.status === 'rejected');

  const petAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const years = Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 86400000));
    return years <= 0 ? '<1 rok' : `${years} lat`;
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="pv-card p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-brand-dark">{acceptedUsers.length}</div>
          <div className="text-xs text-gray-500 mt-1">Aktywni</div>
        </div>
        <div className="pv-card p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-amber-600">{pendingUsers.length}</div>
          <div className="text-xs text-gray-500 mt-1">Oczekujące</div>
        </div>
        <div className="pv-card p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-emerald-600">{sharedWithMe.length}</div>
          <div className="text-xs text-gray-500 mt-1">Udostępnione mi</div>
        </div>
        <div className="pv-card p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{pendingInvites.length}</div>
          <div className="text-xs text-gray-500 mt-1">Dla mnie</div>
        </div>
      </div>

      {/* Incoming invites — dla mnie */}
      {pendingInvites.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 px-1 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-emerald-600" />
            Zaproszenia dla Ciebie ({pendingInvites.length})
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {pendingInvites.map((inv) => {
              const role = roles.find((r) => r.id === inv.role);
              return (
                <div key={inv.id} className="pv-card p-4 sm:p-5 border-l-4 border-emerald-500">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 break-words">{inv.ownerName}</div>
                      <div className="text-sm text-gray-500 break-words">
                        {role?.name || inv.role} • {inv.petNames.join(', ')}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{getTimeAgo(inv.invitedAt)}</div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleRespond(inv, true)}
                        disabled={respondBusy === inv.id}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all"
                      >
                        {respondBusy === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Akceptuj
                      </button>
                      <button
                        onClick={() => handleRespond(inv, false)}
                        disabled={respondBusy === inv.id}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50 transition-all"
                      >
                        <X className="w-4 h-4" />
                        Odrzuć
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Udostępnione mi — zaakceptowane */}
      {sharedWithMe.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 px-1 flex items-center gap-2">
            <PawPrint className="w-5 h-5 text-brand-dark" />
            Zwierzęta udostępnione mi ({sharedWithMe.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedWithMe.map((pet) => (
              <button
                key={`${pet.shareId}-${pet.id}`}
                onClick={() => openSharedPet(pet)}
                className="pv-card-hover overflow-hidden text-left"
              >
                <div className="h-1.5 bg-gradient-to-r from-emerald-600 to-teal-500"></div>
                <div className="p-4 flex items-center gap-3">
                  {pet.photoUrl ? (
                    <img src={pet.photoUrl} alt={pet.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <PawPrint className="w-7 h-7 text-emerald-600" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900">{pet.name}</div>
                    <div className="text-xs text-gray-500">
                      {pet.species === 'dog' ? 'Pies' : pet.species === 'cat' ? 'Kot' : pet.species}
                      {pet.breed ? ` • ${pet.breed}` : ''}
                    </div>
                    <div className="text-xs text-emerald-600 font-medium mt-0.5">od {pet.ownerName}</div>
                  </div>
                </div>
                <div className="px-4 pb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(pet.permissions || {})
                      .filter(([, v]) => v)
                      .map(([k]) => (
                        <span key={k} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-medium">
                          {permissionsList.find((p) => p.id === k)?.name || k}
                        </span>
                      ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Invite Button */}
      {shareUsage && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-cream/70 border border-brand-light/60 px-4 py-3">
          <p className="text-xs font-semibold text-gray-600">
            Osoby w współdzieleniu: {shareUsage.used} z {shareUsage.max === null ? '∞' : shareUsage.max}
            <span className="text-gray-400 font-medium"> · plan {planInfo?.planName}</span>
          </p>
          {shareAtLimit && (
            <button
              type="button"
              onClick={() => openUpgrade({ code: 'SHARE_LIMIT', limit: shareUsage.max ?? undefined, plan: planInfo?.plan })}
              className="text-[11px] font-bold text-brand-dark bg-white border border-brand-light rounded-full px-3 py-1.5 hover:bg-brand-mint transition-colors flex-shrink-0"
            >
              Zwiększ limit
            </button>
          )}
        </div>
      )}
      <button
        onClick={() => {
          if (shareAtLimit) {
            openUpgrade({ code: 'SHARE_LIMIT', limit: shareUsage?.max ?? undefined, plan: planInfo?.plan });
            return;
          }
          resetInviteForm();
          setShowInviteModal(true);
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl pv-btn-primary"
      >
        <UserPlus className="w-6 h-6" />
        Zaproś użytkownika
      </button>

      {listError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          {listError}
        </div>
      )}

      {loading ? (
        <div className="pv-card p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-brand animate-spin" />
          <p className="text-sm text-gray-500 mt-3">Ładowanie udostępnień...</p>
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
          {/* Pending outgoing */}
          {pendingUsers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 px-1 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Oczekujące zaproszenia ({pendingUsers.length})
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {pendingUsers.map((user) => {
                  const role = roles.find((r) => r.id === user.role);
                  return (
                    <div key={user.id} className="pv-card hover:shadow-lg transition-all p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <Mail className="w-6 h-6 text-amber-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 break-all">{user.email}</div>
                            <div className="text-sm text-gray-500">{role?.name}</div>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setInviteData({
                                email: user.email,
                                role: user.role,
                                petIds: user.petIds,
                                permissions: { ...DEFAULT_PERMS, ...user.permissions },
                              });
                              setShowInviteModal(true);
                            }}
                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-dark transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmRemove(user)}
                            className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                          Oczekuje na akceptację
                        </span>
                        <span className="text-xs text-gray-500">{getTimeAgo(user.invitedAt)}</span>
                        <span className="text-xs text-gray-400">— zaproszenie czeka w zakładce „Współdzielenie" odbiorcy (mail po dodaniu klucza Resend)</span>
                      </div>

                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Zwierzęta:</span> {(user.petNames || []).join(', ') || '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Accepted */}
          {acceptedUsers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 px-1 flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-dark" />
                Aktywni użytkownicy ({acceptedUsers.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {acceptedUsers.map((user) => {
                  const role = roles.find((r) => r.id === user.role);
                  const activePermissions = Object.entries(user.permissions || {}).filter(([, v]) => v).length;

                  return (
                    <div key={user.id} className="pv-card-hover overflow-hidden">
                      <div className="h-1.5 bg-gradient-to-r from-brand-dark to-brand"></div>
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white font-semibold flex-shrink-0">
                              {(user.name?.[0] || user.email[0]).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900 break-all">{user.name || user.email}</div>
                              <div className="text-sm text-gray-500">{role?.name}</div>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setInviteData({
                                  email: user.email,
                                  role: user.role,
                                  petIds: user.petIds,
                                  permissions: { ...DEFAULT_PERMS, ...user.permissions },
                                });
                                setShowInviteModal(true);
                              }}
                              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-dark transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmRemove(user)}
                              className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-500">Zwierzęta:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(user.petNames || []).map((name, i) => (
                                <span key={i} className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Uprawnienia:</span>
                            <span className="ml-2 font-semibold text-gray-900">{activePermissions} / {permissionsList.length}</span>
                          </div>
                          <div className="text-xs text-gray-400">
                            Zaakceptowano {user.acceptedAt ? getTimeAgo(user.acceptedAt) : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rejected */}
          {rejectedUsers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 px-1 flex items-center gap-2">
                <X className="w-4 h-4" />
                Odrzucone ({rejectedUsers.length})
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {rejectedUsers.map((user) => (
                  <div key={user.id} className="pv-card p-4 flex items-center justify-between gap-2 opacity-70">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-700 text-sm break-all">{user.email}</div>
                      <div className="text-xs text-gray-400">{roles.find((r) => r.id === user.role)?.name} • odrzucone {user.acceptedAt ? getTimeAgo(user.acceptedAt) : ''}</div>
                    </div>
                    <button
                      onClick={() => setConfirmRemove(user)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {sharedUsers.length === 0 && sharedWithMe.length === 0 && pendingInvites.length === 0 && (
            <div className="pv-card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
                <UserPlus className="w-7 h-7 text-brand" />
              </div>
              <h3 className="pv-section-title mb-2">Brak współdzielonych użytkowników</h3>
              <p className="text-gray-500">Zaproś rodzinę, petsittera lub weterynarza do współpracy</p>
            </div>
          )}
        </>
      )}

      {/* Invite/Edit Modal */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in px-3 sm:px-4 pt-[4vh] sm:pt-4 pb-20 sm:pb-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setShowInviteModal(false);
              resetInviteForm();
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">
                {editingUser ? 'Edytuj udostępnienie' : 'Zaproś użytkownika'}
              </h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  resetInviteForm();
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                  {formError}
                </div>
              )}

              {!editingUser && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Adres email</label>
                  <input
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    placeholder="np. anna@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Zaproszenie pojawi się w zakładce Współdzielenie odbiorcy. Powiadomienie email zostanie wysłane po podaniu klucza Resend.
                  </p>
                </div>
              )}

              {!editingUser && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Rola</label>
                  <div className="grid grid-cols-2 gap-2">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setInviteData({ ...inviteData, role: role.id as any })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          inviteData.role === role.id
                            ? 'bg-brand-dark text-white border-brand-dark'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-brand-dark/40'
                        }`}
                      >
                        <div className="font-semibold text-sm">{role.name}</div>
                        <div className={`text-xs ${inviteData.role === role.id ? 'text-white/80' : 'text-gray-500'}`}>
                          {role.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Zwierzęta</label>
                <div className="space-y-2">
                  {pets.map((pet) => (
                    <label
                      key={pet.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-brand-dark/40 cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={inviteData.petIds.includes(pet.id)}
                        onChange={() => togglePet(pet.id)}
                        className="w-5 h-5 rounded border-gray-300 text-brand-dark focus:ring-brand-dark"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{pet.name}</div>
                        <div className="text-xs text-gray-500">{pet.species === 'dog' ? 'Pies' : pet.species === 'cat' ? 'Kot' : pet.species}</div>
                      </div>
                    </label>
                  ))}
                  {pets.length === 0 && (
                    <p className="text-sm text-gray-500">Nie masz jeszcze zwierząt — dodaj pupila w zakładce Pupile.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Uprawnienia</label>
                <div className="space-y-2">
                  {permissionsList.map((perm) => (
                    <label
                      key={perm.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-brand-dark/40 cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={!!inviteData.permissions[perm.id]}
                        onChange={() => togglePermission(perm.id)}
                        className="w-5 h-5 rounded border-gray-300 text-brand-dark focus:ring-brand-dark"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{perm.name}</div>
                        <div className="text-xs text-gray-500">{perm.description}</div>
                      </div>
                      {inviteData.permissions[perm.id] ? (
                        <Eye className="w-5 h-5 text-brand-dark" />
                      ) : (
                        <EyeOff className="w-5 h-5 text-gray-300" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    resetInviteForm();
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={editingUser ? handleUpdateShare : handleSendInvite}
                  disabled={submitting || (!editingUser && !inviteData.email.trim()) || inviteData.petIds.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  {editingUser ? 'Zapisz zmiany' : 'Wyślij zaproszenie'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared pet detail modal */}
      {viewingPet && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in px-3 sm:px-4 pt-[4vh] sm:pt-4 pb-20 sm:pb-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setViewingPet(null);
              setPetDetail(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">{viewingPet.name}</h3>
              <button
                onClick={() => {
                  setViewingPet(null);
                  setPetDetail(null);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {petDetailLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-8 h-8 mx-auto text-brand animate-spin" />
                </div>
              ) : petDetail ? (
                <>
                  <div className="flex items-center gap-4">
                    {petDetail.pet.photo_url ? (
                      <img src={petDetail.pet.photo_url} alt={petDetail.pet.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <PawPrint className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">{petDetail.pet.name}</h2>
                      <p className="text-sm text-gray-500">
                        {petDetail.pet.species === 'dog' ? 'Pies' : petDetail.pet.species === 'cat' ? 'Kot' : petDetail.pet.species}
                        {petDetail.pet.breed ? ` • ${petDetail.pet.breed}` : ''}
                        {petDetail.pet.gender ? ` • ${petDetail.pet.gender === 'male' ? 'Samiec' : 'Samica'}` : ''}
                      </p>
                      <p className="text-sm text-gray-500">
                        {petAge(petDetail.pet.birth_date) ? `Wiek: ${petAge(petDetail.pet.birth_date)}` : ''}
                        {petDetail.pet.weight ? ` • ${petDetail.pet.weight} kg` : ''}
                      </p>
                      <p className="text-xs text-emerald-600 font-medium mt-1">Właściciel: {viewingPet.ownerName}</p>
                    </div>
                  </div>

                  {petDetail.pet.microchip_number && (
                    <div className="p-3 rounded-xl bg-gray-50 text-sm">
                      <span className="text-gray-500">Chip:</span>{' '}
                      <span className="font-medium text-gray-900">{petDetail.pet.microchip_number}</span>
                    </div>
                  )}

                  {petDetail.permissions?.health && petDetail.healthRecords ? (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-brand-dark" />
                        Książeczka zdrowia ({petDetail.healthRecords.length})
                      </h4>
                      {petDetail.healthRecords.length === 0 ? (
                        <p className="text-sm text-gray-500">Brak wpisów zdrowotnych.</p>
                      ) : (
                        <div className="space-y-2">
                          {petDetail.healthRecords.map((r: any) => (
                            <div key={r.id} className="p-3 rounded-xl bg-gray-50 flex items-start gap-3">
                              <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center flex-shrink-0">
                                <HeartPulse className="w-4 h-4 text-brand-dark" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="font-medium text-gray-900 text-sm break-words">{r.title}</span>
                                  <span className="text-xs text-gray-400 whitespace-nowrap">
                                    {r.record_date ? new Date(r.record_date).toLocaleDateString('pl-PL') : ''}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {recordTypeLabel[r.record_type] || r.record_type}
                                  {r.veterinarian ? ` • ${r.veterinarian}` : ''}
                                </div>
                                {r.description && <p className="text-xs text-gray-600 mt-1">{r.description}</p>}
                                {r.next_date && (
                                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Następny termin: {new Date(r.next_date).toLocaleDateString('pl-PL')}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                      <EyeOff className="w-4 h-4" />
                      Właściciel nie udostępnił książeczki zdrowia.
                    </p>
                  )}
                </>
              ) : (
                <div className="py-8 text-center text-gray-500 text-sm">Nie udało się pobrać profilu.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmRemove}
        title="Odebrać dostęp?"
        description={
          confirmRemove
            ? `Osoba ${confirmRemove.name || confirmRemove.email} straci dostęp do: ${(confirmRemove.petNames || []).join(', ') || 'wybranych pupili'}.`
            : ''
        }
        confirmLabel="Odbierz dostęp"
        cancelLabel="Anuluj"
        loading={removing}
        onConfirm={() => confirmRemove && handleRemoveUser(confirmRemove)}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
