'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  UserPlus,
  Mail,
  Shield,
  Check,
  X,
  Clock,
  Trash2,
  Edit2,
  Eye,
  EyeOff
} from 'lucide-react';

interface SharedUser {
  id: string;
  email: string;
  name?: string;
  role: 'petsitter' | 'family' | 'vet' | 'other';
  status: 'pending' | 'accepted' | 'rejected';
  permissions: {
    health: boolean;
    activity: boolean;
    nutrition: boolean;
    budget: boolean;
    breeding: boolean;
    forum: boolean;
    statistics: boolean;
  };
  invitedAt: string;
  acceptedAt?: string;
  petIds: string[];
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

export default function Sharing() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SharedUser | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'family' as 'petsitter' | 'family' | 'vet' | 'other',
    petIds: [] as string[],
    permissions: {
      health: true,
      activity: true,
      nutrition: true,
      budget: false,
      breeding: false,
      forum: true,
      statistics: false,
    },
  });

  useEffect(() => {
    if (showInviteModal) {
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
  }, [showInviteModal]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUser(user);

      const mockPets: Pet[] = [
        { id: '1', name: 'Burek', species: 'dog' },
        { id: '2', name: 'Mia', species: 'cat' },
      ];
      setPets(mockPets);

      const savedShared = localStorage.getItem('sharedUsers');
      if (savedShared) {
        setSharedUsers(JSON.parse(savedShared));
      } else {
        const mockShared: SharedUser[] = [
          {
            id: '1',
            email: 'anna.kowalska@example.com',
            name: 'Anna Kowalska',
            role: 'family',
            status: 'accepted',
            permissions: {
              health: true,
              activity: true,
              nutrition: true,
              budget: true,
              breeding: false,
              forum: true,
              statistics: true,
            },
            invitedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
            acceptedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
            petIds: ['1', '2'],
          },
          {
            id: '2',
            email: 'petsitter@example.com',
            role: 'petsitter',
            status: 'pending',
            permissions: {
              health: true,
              activity: true,
              nutrition: true,
              budget: false,
              breeding: false,
              forum: false,
              statistics: false,
            },
            invitedAt: new Date(Date.now() - 3600000).toISOString(),
            petIds: ['1'],
          }
        ];
        setSharedUsers(mockShared);
        localStorage.setItem('sharedUsers', JSON.stringify(mockShared));
      }
    }
  }, []);

  const handleSendInvite = () => {
    if (!inviteData.email || inviteData.petIds.length === 0) return;

    const newUser: SharedUser = {
      id: Date.now().toString(),
      email: inviteData.email,
      role: inviteData.role,
      status: 'pending',
      permissions: inviteData.permissions,
      invitedAt: new Date().toISOString(),
      petIds: inviteData.petIds,
    };

    const updated = [...sharedUsers, newUser];
    setSharedUsers(updated);
    localStorage.setItem('sharedUsers', JSON.stringify(updated));

    setInviteData({
      email: '',
      role: 'family',
      petIds: [],
      permissions: {
        health: true,
        activity: true,
        nutrition: true,
        budget: false,
        breeding: false,
        forum: true,
        statistics: false,
      },
    });
    setShowInviteModal(false);

    alert(`Zaproszenie wysłane na adres ${inviteData.email}`);
  };

  const handleUpdatePermissions = () => {
    if (!editingUser) return;

    const updated = sharedUsers.map(u => u.id === editingUser.id ? {
      ...u,
      permissions: inviteData.permissions,
      petIds: inviteData.petIds,
    } : u);

    setSharedUsers(updated);
    localStorage.setItem('sharedUsers', JSON.stringify(updated));

    setEditingUser(null);
    setInviteData({
      email: '',
      role: 'family',
      petIds: [],
      permissions: {
        health: true,
        activity: true,
        nutrition: true,
        budget: false,
        breeding: false,
        forum: true,
        statistics: false,
      },
    });
    setShowInviteModal(false);
  };

  const handleRemoveUser = (userId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć dostęp dla tego użytkownika?')) return;

    const updated = sharedUsers.filter(u => u.id !== userId);
    setSharedUsers(updated);
    localStorage.setItem('sharedUsers', JSON.stringify(updated));
  };

  const togglePermission = (key: keyof typeof inviteData.permissions) => {
    setInviteData({
      ...inviteData,
      permissions: {
        ...inviteData.permissions,
        [key]: !inviteData.permissions[key],
      },
    });
  };

  const togglePet = (petId: string) => {
    const petIds = inviteData.petIds.includes(petId)
      ? inviteData.petIds.filter(id => id !== petId)
      : [...inviteData.petIds, petId];
    setInviteData({ ...inviteData, petIds });
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Teraz';
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffHours < 24) return `${diffHours} godz. temu`;
    if (diffDays < 7) return `${diffDays} dni temu`;
    return then.toLocaleDateString('pl-PL');
  };

  const pendingUsers = sharedUsers.filter(u => u.status === 'pending');
  const acceptedUsers = sharedUsers.filter(u => u.status === 'accepted');

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-brand-dark">{acceptedUsers.length}</div>
          <div className="text-xs text-gray-500 mt-1">Aktywni</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{pendingUsers.length}</div>
          <div className="text-xs text-gray-500 mt-1">Oczekujący</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{sharedUsers.length}</div>
          <div className="text-xs text-gray-500 mt-1">Łącznie</div>
        </div>
      </div>

      {/* Invite Button */}
      <button
        onClick={() => setShowInviteModal(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-brand-dark text-white font-semibold hover:bg-brand-dark transition-all"
      >
        <UserPlus className="w-6 h-6" />
        Zaproś użytkownika
      </button>

      {/* Pending Invitations */}
      {pendingUsers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 px-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Oczekujące zaproszenia ({pendingUsers.length})
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {pendingUsers.map((user) => {
              const role = roles.find(r => r.id === user.role);
              const userPets = pets.filter(p => user.petIds.includes(p.id));

              return (
                <div
                  key={user.id}
                  className="bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-lg transition-all p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                        <Mail className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{user.email}</div>
                        <div className="text-sm text-gray-500">{role?.name}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setInviteData({
                            email: user.email,
                            role: user.role,
                            petIds: user.petIds,
                            permissions: user.permissions,
                          });
                          setShowInviteModal(true);
                        }}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-dark transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveUser(user.id)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                      Oczekuje na akceptację
                    </span>
                    <span className="text-xs text-gray-500">{getTimeAgo(user.invitedAt)}</span>
                  </div>

                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Zwierzęta:</span> {userPets.map(p => p.name).join(', ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Users */}
      {acceptedUsers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 px-1 flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-dark" />
            Aktywni użytkownicy ({acceptedUsers.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {acceptedUsers.map((user) => {
              const role = roles.find(r => r.id === user.role);
              const userPets = pets.filter(p => user.petIds.includes(p.id));
              const activePermissions = Object.entries(user.permissions).filter(([_, v]) => v).length;

              return (
                <div
                  key={user.id}
                  className="bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-brand-dark/30 transition-all duration-300 overflow-hidden"
                >
                  <div className="h-1.5 bg-gradient-to-r from-brand-dark to-brand"></div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white font-semibold">
                          {user.name?.[0] || user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{user.name || user.email}</div>
                          <div className="text-sm text-gray-500">{role?.name}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setInviteData({
                              email: user.email,
                              role: user.role,
                              petIds: user.petIds,
                              permissions: user.permissions,
                            });
                            setShowInviteModal(true);
                          }}
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-dark transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveUser(user.id)}
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
                          {userPets.map(pet => (
                            <span key={pet.id} className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">
                              {pet.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Uprawnienia:</span>
                        <span className="ml-2 font-semibold text-gray-900">{activePermissions} / {permissionsList.length}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Dołączył {user.acceptedAt && getTimeAgo(user.acceptedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {sharedUsers.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
            <UserPlus className="w-7 h-7 text-brand" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Brak współdzielonych użytkowników</h3>
          <p className="text-gray-500">Zaproś rodzinę, petsittera lub weterynarza do współpracy</p>
        </div>
      )}

      {/* Invite/Edit Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">
                {editingUser ? 'Edytuj uprawnienia' : 'Zaproś użytkownika'}
              </h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setEditingUser(null);
                  setInviteData({
                    email: '',
                    role: 'family',
                    petIds: [],
                    permissions: {
                      health: true,
                      activity: true,
                      nutrition: true,
                      budget: false,
                      breeding: false,
                      forum: true,
                      statistics: false,
                    },
                  });
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
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
                        <div className="text-xs text-gray-500">{pet.species === 'dog' ? 'Pies' : 'Kot'}</div>
                      </div>
                    </label>
                  ))}
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
                        checked={inviteData.permissions[perm.id as keyof typeof inviteData.permissions]}
                        onChange={() => togglePermission(perm.id as keyof typeof inviteData.permissions)}
                        className="w-5 h-5 rounded border-gray-300 text-brand-dark focus:ring-brand-dark"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{perm.name}</div>
                        <div className="text-xs text-gray-500">{perm.description}</div>
                      </div>
                      {inviteData.permissions[perm.id as keyof typeof inviteData.permissions] ? (
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
                    setEditingUser(null);
                    setInviteData({
                      email: '',
                      role: 'family',
                      petIds: [],
                      permissions: {
                        health: true,
                        activity: true,
                        nutrition: true,
                        budget: false,
                        breeding: false,
                        forum: true,
                        statistics: false,
                      },
                    });
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={editingUser ? handleUpdatePermissions : handleSendInvite}
                  disabled={!inviteData.email && !editingUser || inviteData.petIds.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-5 h-5" />
                  {editingUser ? 'Zapisz zmiany' : 'Wyślij zaproszenie'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
