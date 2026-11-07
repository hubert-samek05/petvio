'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Clock,
  Edit2,
  Globe,
  Loader2,
  Mail,
  MapPin,
  PawPrint,
  Phone,
  RefreshCcw,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SocialFeed from '@/components/social/SocialFeed';
import BusinessPageModal, { PAGE_CATEGORIES, DAY_LABELS } from '@/components/social/BusinessPageModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Avatar } from '@/components/social/shared';
import { businessPagesApi, postsApi } from '@/lib/api';
import { SocialApi } from '@/components/social/shared';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
// JS getDay(): 0=niedziela → mapowanie na nasz format
const jsDay = () => DAYS[(new Date().getDay() + 6) % 7];

export default function BusinessPageProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = async () => {
    try {
      const res = await businessPagesApi.getById(id);
      setPage(res.page);
      setError('');
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Nie udało się pobrać strony.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      try { setUser(JSON.parse(u)); } catch {}
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const myId = user ? String(user.id ?? '') : '';
  const isOwner = page && myId && page.ownerId === myId;
  const cat = PAGE_CATEGORIES.find((c) => c.id === page?.category);

  const nowStatus = () => {
    if (!page?.openingHours) return null;
    const today = page.openingHours[jsDay()];
    if (!today) return null;
    if (today.closed) return { open: false, label: 'Dziś zamknięte' };
    if (!today.open || !today.close) return null;
    const now = new Date();
    const cur = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const open = cur >= today.open && cur <= today.close;
    return open
      ? { open: true, label: `Otwarte teraz · do ${today.close}` }
      : { open: false, label: `Zamknięte · otwiera ${today.open}` };
  };
  const status = page ? nowStatus() : null;

  const api: SocialApi = {
    getPosts: () => postsApi.getPosts({ page_id: id }),
    createPost: postsApi.createPost,
    updatePost: postsApi.updatePost,
    deletePost: postsApi.deletePost,
    reactPost: postsApi.reactPost,
    getComments: postsApi.getComments,
    addComment: postsApi.addComment,
    deleteComment: postsApi.deleteComment,
  };

  const handleDelete = async () => {
    setDeleteBusy(true);
    try {
      await businessPagesApi.remove(id);
      router.push('/dashboard/community');
    } catch {
      setDeleteBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link href="/dashboard/community" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors">
        <ArrowLeft className="w-4 h-4" /> PetvioBook
      </Link>

      {loading ? (
        <div className="pv-card p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-brand animate-spin" />
        </div>
      ) : error ? (
        <div className="pv-card p-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-3" />
          <p className="text-gray-700 mb-4">{error}</p>
          <button onClick={() => { setLoading(true); load(); }} className="pv-btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" /> Spróbuj ponownie
          </button>
        </div>
      ) : page && (
        <>
          {/* Wizytówka */}
          <div className="pv-card overflow-hidden">
            <div className="h-28 sm:h-36 bg-gradient-to-r from-brand-dark to-brand relative">
              {page.coverUrl && <img src={page.coverUrl} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="-mt-14 sm:-mt-16 relative z-10">
                  {page.avatarUrl ? (
                    <img src={page.avatarUrl} alt={page.name} className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-4 border-white shadow-lg" />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-brand-dark to-brand border-4 border-white shadow-lg flex items-center justify-center text-white text-3xl font-bold">
                      {page.name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{page.name}</h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-brand-light text-brand-dark text-xs font-semibold">
                      {cat?.label || page.category}
                    </span>
                    {status && (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${status.open ? 'text-emerald-600' : 'text-gray-500'}`}>
                        <Clock className="w-3.5 h-3.5" /> {status.label}
                      </span>
                    )}
                  </div>
                  {page.ownerName && (
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <UserIcon className="w-3 h-3" /> Właściciel: {page.ownerName}
                    </p>
                  )}
                </div>
                {isOwner && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setEditOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-all"
                    >
                      <Edit2 className="w-4 h-4" /> Edytuj stronę
                    </button>
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {page.description && (
                <p className="text-sm text-gray-700 mt-4 whitespace-pre-wrap">{page.description}</p>
              )}

              {/* Dane kontaktowe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                {page.address || page.city ? (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 text-sm">
                    <MapPin className="w-4 h-4 text-brand-dark flex-shrink-0" />
                    <span className="text-gray-700">{[page.address, page.city].filter(Boolean).join(', ')}</span>
                  </div>
                ) : null}
                {page.phone && (
                  <a href={`tel:${page.phone}`} className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 text-sm hover:bg-brand-light transition-all">
                    <Phone className="w-4 h-4 text-brand-dark flex-shrink-0" />
                    <span className="text-gray-700">{page.phone}</span>
                  </a>
                )}
                {page.email && (
                  <a href={`mailto:${page.email}`} className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 text-sm hover:bg-brand-light transition-all break-all">
                    <Mail className="w-4 h-4 text-brand-dark flex-shrink-0" />
                    <span className="text-gray-700">{page.email}</span>
                  </a>
                )}
                {page.website && (
                  <a href={page.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 text-sm hover:bg-brand-light transition-all break-all">
                    <Globe className="w-4 h-4 text-brand-dark flex-shrink-0" />
                    <span className="text-gray-700">{page.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
              </div>

              {/* Godziny otwarcia */}
              {Object.keys(page.openingHours || {}).length > 0 && (
                <div className="mt-4 rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Godziny otwarcia
                  </div>
                  <div className="divide-y divide-gray-50">
                    {DAYS.map((d) => {
                      const h = page.openingHours[d];
                      if (!h) return null;
                      const today = d === jsDay();
                      return (
                        <div key={d} className={`flex justify-between px-4 py-2 text-sm ${today ? 'bg-brand-light/40 font-semibold' : ''}`}>
                          <span className="text-gray-600">{DAY_LABELS[d]}{today ? ' (dziś)' : ''}</span>
                          <span className={h.closed ? 'text-red-500' : 'text-gray-900'}>
                            {h.closed ? 'Zamknięte' : `${h.open} – ${h.close}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feed strony */}
          <SocialFeed
            api={api}
            user={isOwner ? { firstName: page.name, avatarUrl: page.avatarUrl } : user}
            myId={myId}
            showComposer={!!isOwner}
            composerPageId={isOwner ? Number(id) : null}
            composerPlaceholder={`Opublikuj jako ${page.name}...`}
            emptyTitle="Strona nie ma jeszcze postów"
            emptyText={isOwner ? 'Opublikuj pierwszy post na swojej stronie!' : 'Ta strona jeszcze nic nie opublikowała.'}
          />
        </>
      )}

      {editOpen && (
        <BusinessPageModal
          initial={page}
          onClose={() => setEditOpen(false)}
          onSaved={(p) => setPage(p)}
        />
      )}

      <ConfirmModal
        isOpen={confirmDelete}
        title="Usunąć stronę firmową?"
        description={`Strona „${page?.name}" zostanie trwale usunięta. Opublikowane posty zostaną na Twoim profilu.`}
        confirmLabel="Usuń stronę"
        loading={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
