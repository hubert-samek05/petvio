'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Search,
  Globe,
  Lock,
  Loader2,
  AlertTriangle,
  RefreshCcw,
  X,
  Check,
  ImagePlus,
  UserPlus,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { groupsApi } from '@/lib/api';
import { GROUP_CATEGORIES, groupCategoryName, PetGroup } from '@/lib/group-constants';
import { downscaleImage } from '@/components/social/shared';
import GroupWhatsNew from '@/components/groups/GroupWhatsNew';

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<PetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [form, setForm] = useState({ name: '', description: '', category: 'general', privacy: 'public' });
  const [cover, setCover] = useState<string | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const loadGroups = async () => {
    try {
      const res = await groupsApi.getGroups({ search: search || undefined, filter });
      setGroups(res.groups || []);
      setLoadError('');
    } catch {
      setLoadError('Nie udało się pobrać grup. Sprawdź połączenie.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(loadGroups, search ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter]);

  useEffect(() => {
    if (showCreate) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [showCreate]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setFormError('Nazwa grupy jest wymagana.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const res = await groupsApi.createGroup({ ...form, coverUrl: cover });
      setShowCreate(false);
      setForm({ name: '', description: '', category: 'general', privacy: 'public' });
      setCover(null);
      router.push(`/dashboard/groups/${res.group.id}`);
    } catch (e: any) {
      setFormError(e?.response?.data?.error?.message || 'Nie udało się utworzyć grupy.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e: React.MouseEvent, g: PetGroup) => {
    e.stopPropagation();
    try {
      const res = await groupsApi.joinGroup(g.id);
      setGroups((l) =>
        l.map((x) =>
          x.id === g.id
            ? { ...x, myStatus: res.status, myRole: res.status === 'active' ? 'member' : null, memberCount: res.status === 'active' ? x.memberCount + 1 : x.memberCount }
            : x
        )
      );
    } catch (err: any) {
      setActionError(err?.response?.data?.error?.message || 'Nie udało się dołączyć do grupy.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Grupy"
        description="Społeczności wokół wspólnych pasji — twórz, dołączaj i dyskutuj"
      />

      {/* Szukaj + utwórz */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj grup..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm pl-11 pr-4 py-3 font-medium focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="pv-btn-primary px-5 py-3 rounded-2xl text-sm flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" /> Utwórz grupę
        </button>
        <GroupWhatsNew />
      </div>

      {actionError && (
        <div className="pv-card p-3.5 flex items-center justify-between gap-3 border-l-4 border-red-400">
          <p className="text-sm text-red-600">{actionError}</p>
          <button onClick={() => setActionError('')} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Zamknij">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtry */}
      <div className="flex gap-2">
        {([
          { id: 'all', name: 'Odkrywaj' },
          { id: 'mine', name: 'Moje grupy' },
        ] as const).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl border font-medium text-sm transition-all ${
              filter === f.id
                ? 'bg-brand-dark text-white border-brand-dark'
                : 'bg-white text-gray-700 border-gray-200 hover:border-brand-dark/40'
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="pv-card p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-brand animate-spin" />
          <p className="text-sm text-gray-500 mt-3">Ładowanie grup...</p>
        </div>
      ) : loadError ? (
        <div className="pv-card p-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-3" />
          <p className="text-gray-700 mb-4">{loadError}</p>
          <button
            onClick={() => {
              setLoading(true);
              loadGroups();
            }}
            className="pv-btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" /> Spróbuj ponownie
          </button>
        </div>
      ) : groups.length === 0 ? (
        <div className="pv-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
            <Users className="w-7 h-7 text-brand" />
          </div>
          <h3 className="pv-section-title mb-2">
            {filter === 'mine' ? 'Nie należysz do żadnej grupy' : 'Brak grup'}
          </h3>
          <p className="text-gray-500">
            {search ? 'Brak grup pasujących do wyszukiwania' : 'Utwórz pierwszą grupę i zbuduj społeczność!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map((g) => {
            const member = g.myStatus === 'active';
            return (
              <div
                key={g.id}
                onClick={() => router.push(`/dashboard/groups/${g.id}`)}
                className="pv-card-hover overflow-hidden cursor-pointer flex flex-col"
              >
                {/* Cover */}
                {g.coverUrl ? (
                  <img src={g.coverUrl} alt="" className="w-full h-28 object-cover" />
                ) : (
                  <div
                    className="w-full h-28 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #1B6B4A 0%, #0F3D2E 100%)' }}
                  >
                    <Users className="w-10 h-10 text-white/30" />
                  </div>
                )}

                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-semibold text-gray-900 truncate flex-1">{g.name}</h3>
                    {g.privacy === 'private' ? (
                      <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    {groupCategoryName(g.category)} · {g.memberCount}{' '}
                    {g.memberCount === 1 ? 'członek' : g.memberCount < 5 ? 'członków' : 'członków'}
                  </p>
                  {g.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">{g.description}</p>
                  )}

                  <div className="mt-auto pt-2" onClick={(e) => e.stopPropagation()}>
                    {member ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/groups/${g.id}`)}
                          className="flex-1 pv-btn px-4 py-2.5 bg-brand-mint text-brand-dark text-sm"
                        >
                          Otwórz grupę
                        </button>
                        {g.myRole !== 'member' && (
                          <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-brand-dark/10 text-brand-dark text-xs font-semibold flex-shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {g.myRole === 'owner' ? 'Właściciel' : 'Moderator'}
                          </span>
                        )}
                      </div>
                    ) : g.myStatus === 'pending' ? (
                      <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-amber-50 text-amber-700 text-sm font-medium border border-amber-200">
                        <Clock className="w-4 h-4" /> Oczekuje na akceptację
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleJoin(e, g)}
                        className="w-full pv-btn-primary px-4 py-2.5 text-sm flex items-center justify-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        {g.privacy === 'private' ? 'Poproś o dołączenie' : 'Dołącz do grupy'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal tworzenia grupy */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">Utwórz grupę</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{formError}</div>
              )}

              {/* Okładka */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Zdjęcie w tle (opcjonalnie)
                </label>
                <button
                  onClick={() => coverRef.current?.click()}
                  className="w-full h-24 rounded-2xl border-2 border-dashed border-gray-200 hover:border-brand-dark/50 flex items-center justify-center overflow-hidden transition-all relative"
                >
                  {cover ? (
                    <img src={cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center gap-2 text-sm text-gray-400">
                      <ImagePlus className="w-5 h-5" /> Dodaj okładkę
                    </span>
                  )}
                </button>
                <input
                  ref={coverRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setCover(await downscaleImage(f, 1200));
                    e.target.value = '';
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Nazwa grupy
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="np. Miłośnicy golden retrieverów"
                  maxLength={120}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Opis
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="O czym jest ta grupa? Dla kogo?"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Kategoria
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                >
                  {GROUP_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Prywatność
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => setForm({ ...form, privacy: 'public' })}
                    className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                      form.privacy === 'public' ? 'border-brand-dark bg-brand-mint/40' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Globe className={`w-5 h-5 mt-0.5 flex-shrink-0 ${form.privacy === 'public' ? 'text-brand-dark' : 'text-gray-400'}`} />
                    <span>
                      <span className="block font-semibold text-gray-900 text-sm">Publiczna</span>
                      <span className="block text-xs text-gray-500 mt-0.5">
                        Każdy może zobaczyć posty i dołączyć od razu
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => setForm({ ...form, privacy: 'private' })}
                    className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                      form.privacy === 'private' ? 'border-brand-dark bg-brand-mint/40' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Lock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${form.privacy === 'private' ? 'text-brand-dark' : 'text-gray-400'}`} />
                    <span>
                      <span className="block font-semibold text-gray-900 text-sm">Prywatna</span>
                      <span className="block text-xs text-gray-500 mt-0.5">
                        Posty widzą tylko członkowie, dołączenie wymaga akceptacji
                      </span>
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleCreate}
                  disabled={submitting || !form.name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Utwórz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
