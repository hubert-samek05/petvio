'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Bell,
  Plus,
  Share2,
  MessageCircle,
  MessagesSquare,
  HeartHandshake,
  Stethoscope,
  CheckCheck,
  Calendar,
  X,
  UserPlus,
  UserCheck,
  Eye,
  Newspaper,
  Heart,
  Users,
  ShieldCheck,
  Clock,
  XCircle,
  Trophy,
} from 'lucide-react';
import { notificationsApi, messagesApi } from '@/lib/api';
import GlobalSearch from '@/components/GlobalSearch';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

interface Reminder {
  id: string;
  title: string;
  petName: string;
  petId: string;
  recordType: string;
  nextDate: string;
}

const typeIcon: Record<string, any> = {
  share_invite: Share2,
  share_accepted: Share2,
  share_rejected: Share2,
  forum_comment: MessageCircle,
  adoption: HeartHandshake,
  lost_pet: HeartHandshake,
  message: MessagesSquare,
  friend_request: UserPlus,
  friend_accepted: UserCheck,
  follow: Eye,
  wall_post: Newspaper,
  post_comment: MessageCircle,
  post_reaction: Heart,
  group_request: Users,
  group_approved: Users,
  group_role: ShieldCheck,
  group_post_pending: Clock,
  group_post_approved: CheckCheck,
  group_post_rejected: XCircle,
  group_event: Calendar,
  group_contest: Trophy,
  group_contest_entry: Trophy,
  group_contest_win: Trophy,
};

const typeColor: Record<string, string> = {
  share_invite: 'bg-emerald-100 text-emerald-600',
  share_accepted: 'bg-emerald-100 text-emerald-600',
  share_rejected: 'bg-red-100 text-red-500',
  forum_comment: 'bg-blue-100 text-blue-600',
  adoption: 'bg-brand-light text-brand-dark',
  lost_pet: 'bg-amber-100 text-amber-600',
  message: 'bg-emerald-100 text-emerald-600',
  friend_request: 'bg-brand-light text-brand-dark',
  friend_accepted: 'bg-emerald-100 text-emerald-600',
  follow: 'bg-blue-100 text-blue-600',
  wall_post: 'bg-brand-light text-brand-dark',
  post_comment: 'bg-blue-100 text-blue-600',
  post_reaction: 'bg-red-100 text-red-500',
  group_request: 'bg-violet-100 text-violet-600',
  group_approved: 'bg-emerald-100 text-emerald-600',
  group_role: 'bg-amber-100 text-amber-600',
  group_post_pending: 'bg-amber-100 text-amber-600',
  group_post_approved: 'bg-emerald-100 text-emerald-600',
  group_post_rejected: 'bg-red-100 text-red-500',
  group_event: 'bg-violet-100 text-violet-600',
  group_contest: 'bg-amber-100 text-amber-600',
  group_contest_entry: 'bg-amber-100 text-amber-600',
  group_contest_win: 'bg-amber-100 text-amber-600',
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

const reminderLabel = (nextDate: string) => {
  const days = Math.ceil((new Date(nextDate).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (days < 0) return `po terminie (${Math.abs(days)} dni)`;
  if (days === 0) return 'dziś';
  if (days === 1) return 'jutro';
  return `za ${days} dni`;
};

export default function DashboardTopbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [dateStr, setDateStr] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [open, setOpen] = useState(false);
  const [panelLoading, setPanelLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async (showSpinner = false) => {
    if (showSpinner) setPanelLoading(true);
    try {
      const res = await notificationsApi.getAll();
      setNotifications(res.notifications || []);
      setReminders(res.reminders || []);
      setUnreadCount(res.unreadCount ?? 0);
    } catch {
      // cicho przy błędzie — dzwonek nie może wywalać topbaru
    } finally {
      setPanelLoading(false);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try { setUser(JSON.parse(userData)); } catch {}
    }
    setDateStr(
      new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
    );
    loadNotifications();
    const loadMsgs = () => messagesApi.unread().then((r) => setUnreadMsgs(r.unread || 0)).catch(() => {});
    loadMsgs();
    const interval = setInterval(() => { loadNotifications(); loadMsgs(); }, 60000);
    const onPush = () => loadNotifications();
    window.addEventListener('pv:notification', onPush);
    return () => {
      clearInterval(interval);
      window.removeEventListener('pv:notification', onPush);
    };
  }, []);

  // Zamknij panel po kliknięciu poza nim / Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const togglePanel = () => {
    const next = !open;
    setOpen(next);
    if (next) loadNotifications(true);
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.read) {
      setNotifications((l) => l.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      notificationsApi.markRead(n.id).catch(() => {});
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const handleMarkAll = async () => {
    setNotifications((l) => l.map((x) => ({ ...x, read: true })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead();
    } catch {}
  };

  const initials = user
    ? `${(user.firstName || 'U')[0]}${(user.lastName || '')[0] || ''}`.toUpperCase()
    : 'U';

  const totalBadge = unreadCount + reminders.length;

  return (
    <header className="sticky top-0 z-30 pt-[env(safe-area-inset-top)] lg:pl-72 pv-glass border-b border-white/60 shadow-[0_1px_12px_rgba(15,61,46,0.05)]">
      <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-10 h-16 lg:h-20">
        {/* Logo mobilne — oryginalne */}
        <Link href="/dashboard" className="lg:hidden flex items-center flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Petvio"
            width={1408}
            height={768}
            className="h-11 w-auto object-contain"
            priority
          />
        </Link>

        {/* Wyszukiwarka desktop */}
        <GlobalSearch />

        {/* Data — tylko mobile, wyśrodkowana */}
        <div className="sm:hidden flex-1 text-center">
          <p className="text-xs font-medium text-gray-400 capitalize leading-tight">{dateStr}</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <Link
            href="/dashboard/pets/new"
            className="pv-btn-primary hidden md:inline-flex px-4 py-2.5 text-sm"
          >
            <Plus className="w-4 h-4" />
            Dodaj zwierzę
          </Link>

          {/* Messenger */}
          <Link
            href="/dashboard/messages"
            aria-label="Messenger"
            className="relative w-10 h-10 rounded-full bg-white border border-gray-200/80 text-gray-500 flex items-center justify-center hover:text-brand-dark hover:border-brand/40 active:scale-90 transition-all"
          >
            <MessagesSquare className="w-[18px] h-[18px]" />
            {unreadMsgs > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 border-2 border-white text-white text-[10px] font-bold flex items-center justify-center">
                {unreadMsgs > 9 ? '9+' : unreadMsgs}
              </span>
            )}
          </Link>

          {/* Powiadomienia */}
          <div className="relative" ref={panelRef}>
            <button
              onClick={togglePanel}
              aria-label="Powiadomienia"
              aria-expanded={open}
              className={`relative w-10 h-10 rounded-full bg-white border flex items-center justify-center active:scale-90 transition-all ${
                open
                  ? 'border-brand/50 text-brand-dark ring-4 ring-brand/10'
                  : 'border-gray-200/80 text-gray-500 hover:text-brand-dark hover:border-brand/40'
              }`}
            >
              <Bell className="w-[18px] h-[18px]" />
              {totalBadge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 border-2 border-white text-white text-[10px] font-bold flex items-center justify-center">
                  {totalBadge > 9 ? '9+' : totalBadge}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-[min(92vw,380px)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm">Powiadomienia</h3>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAll}
                        className="text-xs font-medium text-brand-dark hover:underline flex items-center gap-1 px-2 py-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Oznacz wszystkie
                      </button>
                    )}
                    <button
                      onClick={() => setOpen(false)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
                      aria-label="Zamknij"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  {panelLoading ? (
                    <div className="py-10 text-center text-sm text-gray-400">Ładowanie...</div>
                  ) : (
                    <>
                      {/* Nadchodzące terminy */}
                      {reminders.length > 0 && (
                        <div>
                          <p className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                            Nadchodzące terminy
                          </p>
                          {reminders.map((r) => {
                            const overdue = new Date(r.nextDate).getTime() < new Date().setHours(0, 0, 0, 0);
                            return (
                              <button
                                key={r.id}
                                onClick={() => {
                                  setOpen(false);
                                  router.push('/dashboard/health-calendar');
                                }}
                                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                              >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${overdue ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-600'}`}>
                                  <Calendar className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {r.title} — {r.petName}
                                  </p>
                                  <p className={`text-xs ${overdue ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                                    {reminderLabel(r.nextDate)} • {new Date(r.nextDate).toLocaleDateString('pl-PL')}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Powiadomienia z bazy */}
                      {notifications.length > 0 && (
                        <div className={reminders.length > 0 ? 'border-t border-gray-100' : ''}>
                          <p className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                            Powiadomienia
                          </p>
                          {notifications.map((n) => {
                            const Icon = typeIcon[n.type] || Bell;
                            const color = typeColor[n.type] || 'bg-gray-100 text-gray-500';
                            return (
                              <button
                                key={n.id}
                                onClick={() => handleNotificationClick(n)}
                                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                                  n.read ? 'hover:bg-gray-50 opacity-60' : 'bg-brand-mint/40 hover:bg-brand-mint/60'
                                }`}
                              >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className={`text-sm truncate ${n.read ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>
                                      {n.title}
                                    </p>
                                    {!n.read && <span className="w-2 h-2 rounded-full bg-brand-dark flex-shrink-0" />}
                                  </div>
                                  {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                                  <p className="text-[11px] text-gray-400 mt-1">{getTimeAgo(n.createdAt)}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {notifications.length === 0 && reminders.length === 0 && (
                        <div className="py-10 text-center">
                          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-brand-mint/60 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-brand-dark" />
                          </div>
                          <p className="text-sm font-medium text-gray-700">Wszystko przeczytane</p>
                          <p className="text-xs text-gray-400 mt-1">Nowe powiadomienia pojawią się tutaj</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/dashboard/profile"
            aria-label="Profil"
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 active:scale-90 transition-transform ring-2 ring-white shadow-md overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1B6B4A, #0F3D2E)' }}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
