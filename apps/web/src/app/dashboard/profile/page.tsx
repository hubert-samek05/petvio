'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  LogOut,
  Mail,
  Phone,
  Calendar,
  Edit2,
  KeyRound,
  X,
  Check,
  Loader2,
  AlertTriangle,
  RefreshCcw,
  PawPrint,
  MessageSquare,
  HeartHandshake,
  Share2,
  Heart,
  Camera,
  ShieldCheck,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SocialFeed from '@/components/social/SocialFeed';
import { SocialApi } from '@/components/social/shared';
import { authApi, postsApi } from '@/lib/api';

interface ProfileUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role?: string;
  createdAt?: string;
}

interface ProfileStats {
  pets: number;
  forum_posts: number;
  adoption_posts: number;
  lost_reports: number;
  shares_given: number;
  shares_received: number;
}

const downscaleImage = (file: File, maxW = 320): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [editData, setEditData] = useState({ firstName: '', lastName: '', phone: '', avatarUrl: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', repeatPassword: '' });
  const [deletePassword, setDeletePassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const loadProfile = async () => {
    try {
      const res = await authApi.getMe();
      setUser(res.user);
      setStats(res.stats);
      localStorage.setItem('user', JSON.stringify(res.user));
      setLoadError('');
    } catch (e) {
      console.error('Profile load error:', e);
      const userData = localStorage.getItem('user');
      if (userData) {
        try { setUser(JSON.parse(userData)); } catch {}
      }
      setLoadError('Nie udało się pobrać profilu z serwera — wyświetlam dane zapisane lokalnie.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    const anyModal = showEditModal || showPasswordModal || showDeleteModal;
    if (anyModal) {
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
  }, [showEditModal, showPasswordModal, showDeleteModal]);

  useEffect(() => {
    const anyModal = showEditModal || showPasswordModal || showDeleteModal;
    if (!anyModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEditModal(false);
        setShowPasswordModal(false);
        setShowDeleteModal(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showEditModal, showPasswordModal, showDeleteModal]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSaveProfile = async () => {
    if (!editData.firstName.trim() || !editData.lastName.trim()) {
      setModalError('Imię i nazwisko są wymagane.');
      return;
    }
    setSubmitting(true);
    setModalError('');
    try {
      const res = await authApi.updateProfile({
        firstName: editData.firstName.trim(),
        lastName: editData.lastName.trim(),
        phone: editData.phone.trim(),
        avatarUrl: editData.avatarUrl !== undefined ? editData.avatarUrl : undefined,
      });
      setUser(res.user);
      localStorage.setItem('user', JSON.stringify(res.user));
      setShowEditModal(false);
      flash('Profil został zaktualizowany.');
    } catch (e: any) {
      setModalError(e?.response?.data?.error?.message || 'Nie udało się zapisać profilu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword.length < 8) {
      setModalError('Nowe hasło musi mieć minimum 8 znaków.');
      return;
    }
    if (passwordData.newPassword !== passwordData.repeatPassword) {
      setModalError('Nowe hasła nie są identyczne.');
      return;
    }
    setSubmitting(true);
    setModalError('');
    try {
      await authApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', repeatPassword: '' });
      flash('Hasło zostało zmienione.');
    } catch (e: any) {
      setModalError(e?.response?.data?.error?.message || 'Nie udało się zmienić hasła.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setModalError('Podaj hasło, aby potwierdzić.');
      return;
    }
    setSubmitting(true);
    setModalError('');
    try {
      await authApi.deleteAccount(deletePassword);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    } catch (e: any) {
      setModalError(e?.response?.data?.error?.message || 'Nie udało się usunąć konta.');
      setSubmitting(false);
    }
  };

  const initials = user
    ? `${(user.firstName || 'U')[0]}${(user.lastName || '')[0] || ''}`.toUpperCase()
    : 'U';

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
    : null;

  const wallApi: SocialApi = {
    getPosts: () => postsApi.getPosts({ author: 'me' }),
    createPost: postsApi.createPost,
    updatePost: postsApi.updatePost,
    deletePost: postsApi.deletePost,
    reactPost: postsApi.reactPost,
    getComments: postsApi.getComments,
    addComment: postsApi.addComment,
    deleteComment: postsApi.deleteComment,
  };

  const statItems = [
    { icon: PawPrint, label: 'Pupile', value: stats?.pets ?? 0, href: '/dashboard/pets' },
    { icon: MessageSquare, label: 'Posty na forum', value: stats?.forum_posts ?? 0, href: '/dashboard/forum' },
    { icon: HeartHandshake, label: 'Ogłoszenia adopcji', value: stats?.adoption_posts ?? 0, href: '/dashboard/adoptions' },
    { icon: Heart, label: 'Zgłoszenia zaginięć', value: stats?.lost_reports ?? 0, href: '/dashboard/lost-pets' },
    { icon: Share2, label: 'Udostępnione osobom', value: stats?.shares_given ?? 0, href: '/dashboard/sharing' },
    { icon: ShieldCheck, label: 'Udostępnione mi', value: stats?.shares_received ?? 0, href: '/dashboard/sharing' },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader icon={User} title="Profil" description="Twoje dane i ustawienia konta" />
        <div className="pv-card p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-brand animate-spin" />
          <p className="text-sm text-gray-500 mt-3">Ładowanie profilu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={User} title="Profil" description="Twoje dane i ustawienia konta" />

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm flex items-center gap-2">
          <Check className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {loadError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {loadError}
          <button onClick={loadProfile} className="ml-auto font-semibold underline">Ponów</button>
        </div>
      )}

      {/* Karta profilu */}
      <div className="pv-card p-5 sm:p-8 animate-slide-up">
        <div className="flex flex-wrap items-center gap-4 sm:gap-5 mb-6 sm:mb-8">
          <div className="relative flex-shrink-0">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl object-cover shadow-lg" />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white font-semibold text-xl sm:text-2xl shadow-lg">
                {initials}
              </div>
            )}
            <button
              onClick={() => {
                setEditData({
                  firstName: user?.firstName || '',
                  lastName: user?.lastName || '',
                  phone: user?.phone || '',
                  avatarUrl: user?.avatarUrl || '',
                });
                setModalError('');
                setShowEditModal(true);
              }}
              className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-xl bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand-dark transition-all"
              aria-label="Zmień zdjęcie"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="min-w-0 flex-1 basis-48 sm:basis-0">
            <h2 className="font-serif text-xl sm:text-2xl font-normal text-gray-900 break-words">
              {user ? `${user.firstName} ${user.lastName}` : '—'}
            </h2>
            <p className="text-gray-500 flex items-center gap-1.5 break-all">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" /> {user?.email || ''}
            </p>
            {memberSince && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" /> W PetVio od {memberSince}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setEditData({
                firstName: user?.firstName || '',
                lastName: user?.lastName || '',
                phone: user?.phone || '',
                avatarUrl: user?.avatarUrl || '',
              });
              setModalError('');
              setShowEditModal(true);
            }}
            className="pv-btn w-full sm:w-auto px-5 py-2.5 border border-gray-200 text-gray-700 hover:border-brand-dark hover:text-brand-dark text-sm"
          >
            <Edit2 className="w-4 h-4" /> Edytuj profil
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <div className="p-4 sm:p-5 rounded-2xl bg-brand-mint/60 border border-brand-light/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Imię</p>
            <p className="font-semibold text-gray-900 break-words">{user?.firstName || '—'}</p>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-brand-mint/60 border border-brand-light/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Nazwisko</p>
            <p className="font-semibold text-gray-900 break-words">{user?.lastName || '—'}</p>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-brand-mint/60 border border-brand-light/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Adres e-mail</p>
            <p className="font-semibold text-gray-900 break-all">{user?.email || '—'}</p>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-brand-mint/60 border border-brand-light/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Telefon</p>
            <p className="font-semibold text-gray-900 break-words">{user?.phone || '—'}</p>
          </div>
        </div>
      </div>

      {/* Moja tablica */}
      <div className="pv-card p-5 sm:p-6">
        <h3 className="pv-section-title mb-1">Moja tablica</h3>
        <p className="text-sm text-gray-500 mb-5">Twoje posty — publikowane też na Tablicy społeczności</p>
        <SocialFeed
          api={wallApi}
          user={user}
          myId={user ? String(user.id) : ''}
          emptyTitle="Nie masz jeszcze postów"
          emptyText="Opublikuj pierwszy post — pojawi się też na Tablicy społeczności."
        />
      </div>

      {/* Statystyki */}
      <div className="pv-card p-6">
        <h3 className="pv-section-title mb-1">Twoja aktywność</h3>
        <p className="text-sm text-gray-500 mb-5">Podsumowanie Twojego konta w PetVio</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {statItems.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                onClick={() => router.push(s.href)}
                className="p-4 rounded-2xl border border-gray-100 hover:border-brand-dark/40 hover:bg-brand-mint/30 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-5 h-5 text-brand-dark" />
                  <span className="text-xl font-bold text-gray-900 group-hover:text-brand-dark">{s.value}</span>
                </div>
                <div className="text-xs text-gray-500 font-medium">{s.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bezpieczeństwo */}
      <div className="pv-card p-6">
        <h3 className="pv-section-title mb-1">Bezpieczeństwo</h3>
        <p className="text-sm text-gray-500 mb-5">Zarządzanie sesją i hasłem</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              setPasswordData({ currentPassword: '', newPassword: '', repeatPassword: '' });
              setModalError('');
              setShowPasswordModal(true);
            }}
            className="pv-btn px-5 py-2.5 border border-gray-200 text-gray-700 hover:border-brand-dark hover:text-brand-dark text-sm"
          >
            <KeyRound className="w-4 h-4" /> Zmień hasło
          </button>
          <button
            onClick={handleLogout}
            className="pv-btn px-5 py-2.5 border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 text-sm"
          >
            <LogOut className="w-4 h-4" /> Wyloguj się
          </button>
        </div>
      </div>

      {/* Strefa ryzyka */}
      <div className="pv-card p-6 border-red-100">
        <h3 className="pv-section-title mb-1 text-red-600">Strefa ryzyka</h3>
        <p className="text-sm text-gray-500 mb-5">
          Usunięcie konta jest nieodwracalne — znikną wszystkie pupile, wpisy, ogłoszenia i udostępnienia.
        </p>
        <button
          onClick={() => {
            setDeletePassword('');
            setModalError('');
            setShowDeleteModal(true);
          }}
          className="pv-btn px-5 py-2.5 bg-red-600 text-white hover:bg-red-700 text-sm"
        >
          <Trash2 className="w-4 h-4" /> Usuń konto
        </button>
      </div>

      {/* Modal edycji */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">Edytuj profil</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{modalError}</div>
              )}

              <div className="flex flex-col items-center gap-3">
                {editData.avatarUrl ? (
                  <img src={editData.avatarUrl} alt="Avatar" className="w-24 h-24 rounded-3xl object-cover border border-gray-200" />
                ) : (
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white font-semibold text-3xl">
                    {(editData.firstName[0] || 'U').toUpperCase()}
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 cursor-pointer transition-all">
                    {editData.avatarUrl ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          setEditData({ ...editData, avatarUrl: await downscaleImage(file) });
                        } catch {
                          setModalError('Nie udało się wczytać zdjęcia.');
                        }
                      }}
                    />
                  </label>
                  {editData.avatarUrl && (
                    <button
                      onClick={() => setEditData({ ...editData, avatarUrl: '' })}
                      className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-all"
                    >
                      Usuń
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Imię</label>
                  <input
                    type="text"
                    value={editData.firstName}
                    onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Nazwisko</label>
                  <input
                    type="text"
                    value={editData.lastName}
                    onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Telefon (opcjonalnie)</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    placeholder="+48 123 456 789"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Zapisz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal zmiany hasła */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Zmień hasło</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowPasswords((v) => !v)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label={showPasswords ? 'Ukryj hasła' : 'Pokaż hasła'}
                  title={showPasswords ? 'Ukryj hasła' : 'Pokaż hasła'}
                >
                  {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                <button onClick={() => setShowPasswordModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{modalError}</div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Obecne hasło</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Nowe hasło</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="min. 8 znaków"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Powtórz nowe hasło</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordData.repeatPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, repeatPassword: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={submitting || !passwordData.currentPassword || !passwordData.newPassword}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
                  Zmień
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal usunięcia konta */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-red-600">Usuń konto</h3>
              <button onClick={() => setShowDeleteModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                Ta operacja jest nieodwracalna. Zostaną usunięte: pupile, wpisy zdrowotne, ogłoszenia, posty na forum, udostępnienia i wszystkie pozostałe dane konta.
              </div>

              {modalError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{modalError}</div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Potwierdź hasłem</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-red-400"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={submitting || !deletePassword}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  Usuń na stałe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
