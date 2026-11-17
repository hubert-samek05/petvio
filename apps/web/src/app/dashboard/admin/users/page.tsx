'use client';
import PageHeader from '@/components/PageHeader';

import { useEffect, useState } from 'react';
import { Users, Search, Edit, Trash2, Shield, User, X, Dog, Crown, Activity, Smartphone, Apple, Globe } from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(loadUsers, 300);
    return () => clearTimeout(t);
  }, [page, search]);

  const loadUsers = async () => {
    try {
      const response = await api.get(`/api/users?page=${page}&limit=20&search=${search}`);
      const usersData = response.data?.users || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
      setTotal(response.data?.total || 0);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const errMsg = (e: any, fallback: string) =>
    e?.response?.data?.error || e?.response?.data?.error?.message || fallback;

  const PlatformBadges = ({ platforms }: { platforms?: string[] }) => {
    if (!platforms || platforms.length === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium" title="Brak zarejestrowanego urządzenia mobilnego — użytkownik tylko webowy lub bez zgody na powiadomienia">
          <Globe className="w-3 h-3" /> Web / —
        </span>
      );
    }
    return (
      <div className="flex gap-1">
        {platforms.map((p) => (
          <span key={p} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-light text-brand-dark text-xs font-medium">
            {p === 'ios' ? <Apple className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
            {p === 'ios' ? 'iOS' : p === 'android' ? 'Android' : p}
          </span>
        ))}
      </div>
    );
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunąć tego użytkownika? Operacja usunie też jego zwierzęta, posty i inne dane.')) return;

    try {
      await api.delete(`/api/users/${id}`);
      setShowDetail(false);
      loadUsers();
    } catch (error: any) {
      alert(errMsg(error, 'Nie udało się usunąć użytkownika'));
    }
  };

  const openDetail = async (user: any) => {
    setShowDetail(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await api.get(`/api/users/${user.id}/detail`);
      setDetail(res.data);
    } catch (error: any) {
      alert(errMsg(error, 'Nie udało się pobrać szczegółów'));
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEdit = async (user: any) => {
    try {
      const res = await api.get(`/api/users/${user.id}/detail`);
      const u = res.data.user;
      setSelectedUser({
        ...u,
        plan_expires_at: u.plan_expires_at ? u.plan_expires_at.slice(0, 10) : '',
        birthday: u.birthday ? u.birthday.slice(0, 10) : '',
      });
      setActionError('');
      setShowEditModal(true);
    } catch (error: any) {
      alert(errMsg(error, 'Nie udało się pobrać danych użytkownika'));
    }
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      setActionError('');
      await api.put(`/api/users/${selectedUser.id}`, {
        first_name: selectedUser.first_name,
        last_name: selectedUser.last_name,
        email: selectedUser.email,
        phone: selectedUser.phone,
        city: selectedUser.city,
        bio: selectedUser.bio,
        birthday: selectedUser.birthday || null,
        role: selectedUser.role,
        plan: selectedUser.plan,
        plan_source: selectedUser.plan_source,
        plan_billing: selectedUser.plan_billing,
        plan_expires_at: selectedUser.plan_expires_at || null,
      });
      setShowEditModal(false);
      loadUsers();
    } catch (error: any) {
      setActionError(errMsg(error, 'Nie udało się zapisać zmian'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
            <PageHeader title="Zarządzanie użytkownikami" description="Przeglądaj i edytuj konta użytkowników" />
      <div className="pv-card">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Szukaj użytkownika..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-dark"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Użytkownik</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rola</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Telefon</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Platforma</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data rejestracji</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Ładowanie...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Brak użytkowników</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(user)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role === 'admin' ? 'Administrator' : 'Użytkownik'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{user.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <PlatformBadges platforms={user.platforms} />
                      {user.last_seen_at && (
                        <p className="text-xs text-gray-400 mt-1" title="Ostatnia aktywność w aplikacji mobilnej">
                          {new Date(user.last_seen_at).toLocaleDateString('pl-PL')}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(user.created_at).toLocaleDateString('pl-PL')}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-gray-400 hover:text-brand-dark hover:bg-brand-mint rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > 20 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Pokazano {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} z {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Poprzednia
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= total}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Następna
              </button>
            </div>
          </div>
        )}
      </div>

      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Szczegóły użytkownika</h2>
              <button onClick={() => setShowDetail(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading || !detail ? (
              <div className="p-12 text-center text-gray-500">Ładowanie...</div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-brand-light flex items-center justify-center">
                    <User className="w-8 h-8 text-brand-dark" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{detail.user.first_name} {detail.user.last_name}</p>
                    <p className="text-gray-500">{detail.user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${detail.user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                        {detail.user.role === 'admin' ? 'Administrator' : 'Użytkownik'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-brand-light text-brand-dark text-xs font-medium">
                        Plan: {detail.user.plan || 'brak'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-gray-500">Telefon</p><p className="font-medium">{detail.user.phone || '-'}</p></div>
                  <div><p className="text-gray-500">Miasto</p><p className="font-medium">{detail.user.city || '-'}</p></div>
                  <div><p className="text-gray-500">Data rejestracji</p><p className="font-medium">{new Date(detail.user.created_at).toLocaleString('pl-PL')}</p></div>
                  <div><p className="text-gray-500">Logowanie przez</p><p className="font-medium">{detail.user.auth_provider || 'email'}</p></div>
                  <div><p className="text-gray-500">Plan wygasa</p><p className="font-medium">{detail.user.plan_expires_at ? new Date(detail.user.plan_expires_at).toLocaleDateString('pl-PL') : 'bezterminowo'}</p></div>
                  <div><p className="text-gray-500">Źródło planu</p><p className="font-medium">{detail.user.plan_source || '-'}{detail.user.plan_billing ? ` (${detail.user.plan_billing})` : ''}</p></div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Dog className="w-5 h-5 text-brand-dark" /> Zwierzęta ({detail.pets.length})</h3>
                  {detail.pets.length === 0 ? (
                    <p className="text-sm text-gray-500">Brak zwierząt</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.pets.map((pet: any) => (
                        <div key={pet.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center overflow-hidden">
                            {pet.photo_url ? (
                              <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                            ) : (
                              <Dog className="w-5 h-5 text-brand-dark" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{pet.name}</p>
                            <p className="text-xs text-gray-500">
                              {pet.species === 'dog' ? 'Pies' : pet.species === 'cat' ? 'Kot' : pet.species}
                              {pet.breed ? ` • ${pet.breed}` : ''}
                              {pet.birth_date ? ` • ur. ${new Date(pet.birth_date).toLocaleDateString('pl-PL')}` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Activity className="w-5 h-5 text-brand-dark" /> Aktywność</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Zwierzęta', value: detail.stats.pets },
                      { label: 'Spacery', value: detail.stats.walks },
                      { label: 'Posty forum', value: detail.stats.forum_posts },
                      { label: 'Posty', value: detail.stats.posts },
                      { label: 'Wiadomości', value: detail.stats.messages },
                      { label: 'Zgłoszenia spec.', value: detail.stats.specialist_submissions },
                    ].map((s) => (
                      <div key={s.label} className="p-3 bg-gray-50 rounded-lg text-center">
                        <p className="text-lg font-bold text-gray-900">{s.value}</p>
                        <p className="text-xs text-gray-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Smartphone className="w-5 h-5 text-brand-dark" /> Urządzenia</h3>
                  {detail.devices.length === 0 ? (
                    <p className="text-sm text-gray-500">Brak zarejestrowanych urządzeń mobilnych — użytkownik korzysta tylko z wersji webowej albo nie wyraził zgody na powiadomienia w aplikacji.</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.devices.map((d: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                          <span className="inline-flex items-center gap-2 font-medium text-gray-900">
                            {d.platform === 'ios' ? <Apple className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                            {d.platform === 'ios' ? 'iOS' : d.platform === 'android' ? 'Android' : d.platform}
                          </span>
                          <span className="text-xs text-gray-500">
                            ostatnia aktywność: {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString('pl-PL') : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Crown className="w-5 h-5 text-brand-dark" /> Historia subskrypcji</h3>
                  {detail.subscriptionEvents.length === 0 ? (
                    <p className="text-sm text-gray-500">Brak zdarzeń subskrypcji</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.subscriptionEvents.map((ev: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{ev.event_type}{ev.plan ? ` — ${ev.plan}` : ''}{ev.billing ? ` (${ev.billing})` : ''}</p>
                            <p className="text-xs text-gray-500">{ev.source}</p>
                          </div>
                          <div className="text-right">
                            {ev.amount_grosz > 0 && <p className="font-medium">{(ev.amount_grosz / 100).toLocaleString('pl-PL')} zł</p>}
                            <p className="text-xs text-gray-500">{new Date(ev.created_at).toLocaleDateString('pl-PL')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2 border-t border-gray-200">
                  <button
                    onClick={() => { setShowDetail(false); handleEdit(detail.user); }}
                    className="flex-1 px-4 py-2 bg-brand-dark text-white rounded-lg hover:bg-brand"
                  >
                    Edytuj
                  </button>
                  <button
                    onClick={() => handleDelete(detail.user.id)}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    Usuń konto
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Edytuj użytkownika</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{actionError}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Imię</label>
                  <input type="text" value={selectedUser.first_name || ''} onChange={(e) => setSelectedUser({ ...selectedUser, first_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nazwisko</label>
                  <input type="text" value={selectedUser.last_name || ''} onChange={(e) => setSelectedUser({ ...selectedUser, last_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={selectedUser.email || ''} onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input type="text" value={selectedUser.phone || ''} onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Miasto</label>
                  <input type="text" value={selectedUser.city || ''} onChange={(e) => setSelectedUser({ ...selectedUser, city: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data urodzenia</label>
                  <input type="date" value={selectedUser.birthday || ''} onChange={(e) => setSelectedUser({ ...selectedUser, birthday: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rola</label>
                  <select value={selectedUser.role} onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="user">Użytkownik</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea value={selectedUser.bio || ''} onChange={(e) => setSelectedUser({ ...selectedUser, bio: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Crown className="w-5 h-5 text-brand-dark" /> Subskrypcja</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                    <select value={selectedUser.plan || 'mini'} onChange={(e) => setSelectedUser({ ...selectedUser, plan: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="mini">Mini rodzina</option>
                      <option value="family">Duża rodzina</option>
                      <option value="xl">Bardzo duża rodzina</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Źródło</label>
                    <select value={selectedUser.plan_source || 'free'} onChange={(e) => setSelectedUser({ ...selectedUser, plan_source: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="free">Darmowy</option>
                      <option value="stripe">Stripe</option>
                      <option value="admin">Ręcznie (admin)</option>
                      <option value="grandfather">Grandfathered</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rozliczenie</label>
                    <select value={selectedUser.plan_billing || ''} onChange={(e) => setSelectedUser({ ...selectedUser, plan_billing: e.target.value || null })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="">Brak</option>
                      <option value="monthly">Miesięczne</option>
                      <option value="yearly">Roczne</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan wygasa</label>
                    <input type="date" value={selectedUser.plan_expires_at || ''} onChange={(e) => setSelectedUser({ ...selectedUser, plan_expires_at: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
              <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">
                Anuluj
              </button>
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 px-4 py-2 bg-brand-dark text-white rounded-lg hover:bg-brand disabled:opacity-50">
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
