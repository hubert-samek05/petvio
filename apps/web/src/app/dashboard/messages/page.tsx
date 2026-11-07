'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  BellOff,
  BellRing,
  Check,
  CheckCheck,
  Edit3,
  Folder,
  FolderInput,
  Inbox,
  Loader2,
  MessageCircle,
  MoreVertical,
  Pin,
  PinOff,
  Plus,
  Search,
  Send,
  Settings2,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Avatar, getTimeAgo } from '@/components/social/shared';
import { friendsApi, messagesApi } from '@/lib/api';

interface Other {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface Conversation {
  id: string;
  other: Other;
  lastMessage: { body: string; mine: boolean; createdAt: string } | null;
  unread: number;
  folderId: string | null;
  pinned: boolean;
  muted: boolean;
}

interface Folder {
  id: string;
  name: string;
  convCount: number;
}

interface Msg {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-dark focus:ring-4 focus:ring-brand/10';

function MessagesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [convFilter, setConvFilter] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [other, setOther] = useState<Other | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [otherRead, setOtherRead] = useState(0);
  const [otherReadAt, setOtherReadAt] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newQuery, setNewQuery] = useState('');
  const [newResults, setNewResults] = useState<any[]>([]);
  const [newError, setNewError] = useState('');
  const [newBusy, setNewBusy] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [confirmState, setConfirmState] = useState<
    | { kind: 'folder'; id: string; name: string }
    | { kind: 'block'; id: string; name: string }
    | { kind: 'conv'; id: string; name: string }
    | null
  >(null);
  const [folderInput, setFolderInput] = useState('');
  const [folderAdding, setFolderAdding] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null); // kebab na liście rozmów
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [folderPicker, setFolderPicker] = useState<string | null>(null); // convId wyboru folderu
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacy, setPrivacy] = useState<{ messages_from: string }>({ messages_from: 'everyone' });
  const [blocked, setBlocked] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMsgId = useRef(0);

  const myId = user ? String(user.id ?? '') : '';

  const loadConvs = async () => {
    try {
      const res = await messagesApi.conversations();
      setConvs(res.conversations || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const res = await messagesApi.folders();
      setFolders(res.folders || []);
    } catch {}
  };

  const openConv = async (id: string) => {
    setActiveId(id);
    setChatMenuOpen(false);
    setSendError('');
    setChatLoading(true);
    lastMsgId.current = 0;
    try {
      const res = await messagesApi.messages(id);
      setMessages(res.messages || []);
      setHasMore((res.messages || []).length === 60);
      setOther(res.other || null);
      setOtherRead(res.otherReadMessageId || 0);
      setOtherReadAt(res.otherReadAt || null);
      const last = res.messages?.[res.messages.length - 1];
      if (last) {
        lastMsgId.current = parseInt(last.id, 10);
        messagesApi.markRead(id, parseInt(last.id, 10)).catch(() => {});
        setConvs((l) => l.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
      }
    } catch {
      setMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try { setUser(JSON.parse(userData)); } catch {}
    }
    loadConvs();
    loadFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const conv = searchParams.get('conv');
    if (conv) openConv(conv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const t = setInterval(loadConvs, 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const t = setInterval(async () => {
      try {
        const res = await messagesApi.messages(activeId, lastMsgId.current);
        setOtherRead(res.otherReadMessageId || 0);
        if (res.otherReadAt) setOtherReadAt(res.otherReadAt);
        if (res.messages?.length) {
          setMessages((l) => [...l, ...res.messages]);
          lastMsgId.current = parseInt(res.messages[res.messages.length - 1].id, 10);
          messagesApi.markRead(activeId, lastMsgId.current).catch(() => {});
        }
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeId]);

  // ESC zamyka modale i menu
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setNewOpen(false);
      setPrivacyOpen(false);
      setMenuFor(null);
      setChatMenuOpen(false);
      setFolderPicker(null);
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, []);

  // zamknięcie menu po kliknięciu poza
  useEffect(() => {
    if (!menuFor && !chatMenuOpen && !folderPicker) return;
    const close = () => { setMenuFor(null); setChatMenuOpen(false); setFolderPicker(null); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuFor, chatMenuOpen, folderPicker]);

  // szukanie osób do nowej rozmowy
  useEffect(() => {
    if (newQuery.trim().length < 2) {
      setNewResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await friendsApi.search(newQuery.trim());
        setNewResults(res.people || []);
      } catch {
        setNewResults([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [newQuery]);

  const startConv = async (userId: string) => {
    if (newBusy) return;
    setNewBusy(true);
    setNewError('');
    try {
      const res = await messagesApi.open(userId);
      setNewOpen(false);
      setNewQuery('');
      await loadConvs();
      openConv(res.conversation.id);
    } catch (e: any) {
      setNewError(e?.response?.data?.error?.message || 'Nie możesz rozpocząć rozmowy z tą osobą.');
    } finally {
      setNewBusy(false);
    }
  };

  const loadOlder = async () => {
    if (!activeId || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const res = await messagesApi.messages(activeId, 0, parseInt(messages[0].id, 10));
      const older: Msg[] = res.messages || [];
      setMessages((l) => [...older, ...l]);
      if (older.length < 60) setHasMore(false);
    } catch {} finally {
      setLoadingOlder(false);
    }
  };

  const send = async () => {
    const body = input.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    setSendError('');
    try {
      const res = await messagesApi.send(activeId, body);
      setMessages((l) => [...l, res.message]);
      lastMsgId.current = parseInt(res.message.id, 10);
      setInput('');
      loadConvs();
    } catch (e: any) {
      setSendError(e?.response?.data?.error?.message || 'Nie udało się wysłać wiadomości.');
    } finally {
      setSending(false);
    }
  };

  const flag = async (convId: string, data: { pinned?: boolean; muted?: boolean }) => {
    try {
      await messagesApi.setFlags(convId, data);
      await loadConvs();
    } catch {}
  };

  const moveToFolder = async (convId: string, folderId: string | null) => {
    try {
      await messagesApi.setFolder(convId, folderId);
      await Promise.all([loadConvs(), loadFolders()]);
    } catch {}
    setFolderPicker(null);
  };

  const addFolder = async () => {
    const name = folderInput.trim();
    if (!name) return;
    try {
      await messagesApi.createFolder(name);
      setFolderInput('');
      setFolderAdding(false);
      await loadFolders();
    } catch {}
  };

  const delFolder = async (id: string) => {
    try {
      await messagesApi.deleteFolder(id);
      if (activeFolder === id) setActiveFolder(null);
      await Promise.all([loadConvs(), loadFolders()]);
    } catch {}
  };

  const blockOther = async (otherId: string) => {
    try {
      await friendsApi.block(otherId);
      setActiveId(null);
      router.replace('/dashboard/messages');
      await loadConvs();
    } catch {}
  };

  const hideConv = async (convId: string) => {
    try {
      await messagesApi.hide(convId);
      if (activeId === convId) {
        setActiveId(null);
        router.replace('/dashboard/messages');
      }
      await loadConvs();
    } catch {}
  };

  const runConfirm = async () => {
    if (!confirmState) return;
    const c = confirmState;
    setConfirmState(null);
    if (c.kind === 'folder') await delFolder(c.id);
    else if (c.kind === 'block') await blockOther(c.id);
    else await hideConv(c.id);
  };

  const openPrivacy = async () => {
    setPrivacyOpen(true);
    try {
      const [s, b] = await Promise.all([friendsApi.getSettings(), friendsApi.blocked()]);
      setPrivacy({ messages_from: s.settings?.messages_from || 'everyone' });
      setBlocked(b.blocked || []);
    } catch {}
  };

  const activeConv = convs.find((c) => c.id === activeId);
  const chatName = other?.name || activeConv?.other?.name || 'Rozmowa';
  const chatAvatar = other?.avatarUrl || activeConv?.other?.avatarUrl;
  const chatUserId = other?.id || activeConv?.other?.id;

  const visibleConvs = convs.filter((c) => {
    if (activeFolder && c.folderId !== activeFolder) return false;
    if (convFilter.trim() && !c.other.name.toLowerCase().includes(convFilter.trim().toLowerCase())) return false;
    return true;
  });

  const folderUnread = (fId: string | null) =>
    convs.filter((c) => (fId ? c.folderId === fId : true) && !c.muted).reduce((s, c) => s + c.unread, 0);

  const FolderBtn = ({ id, name, icon, count, deletable }: { id: string | null; name: string; icon: React.ReactNode; count: number; deletable?: boolean }) => {
    const un = folderUnread(id);
    return (
      <div className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all ${
        activeFolder === id ? 'bg-brand-mint/60 text-brand-dark' : 'text-gray-600 hover:bg-gray-50'
      }`} onClick={() => setActiveFolder(id)}>
        {icon}
        <span className="flex-1 min-w-0 text-sm font-medium truncate">{name}</span>
        {un > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{un}</span>
        )}
        <span className="text-[11px] text-gray-400">{count}</span>
        {deletable && (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmState({ kind: 'folder', id: id!, name }); }}
            className="hidden group-hover:block p-1 text-gray-400 hover:text-red-500"
            aria-label="Usuń folder"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  const ConvMenu = ({ c }: { c: Conversation }) => (
    <div className="absolute right-2 top-9 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-30 animate-fade-in" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => flag(c.id, { pinned: !c.pinned })}
        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
        {c.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
        {c.pinned ? 'Odepnij rozmowę' : 'Przypnij rozmowę'}
      </button>
      <button onClick={() => flag(c.id, { muted: !c.muted })}
        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
        {c.muted ? <BellRing className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        {c.muted ? 'Wyłącz wyciszenie' : 'Wycisz powiadomienia'}
      </button>
      <button onClick={() => setFolderPicker(folderPicker === c.id ? null : c.id)}
        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
        <FolderInput className="w-4 h-4" /> Przenieś do folderu
      </button>
      {folderPicker === c.id && (
        <div className="border-t border-gray-100 bg-gray-50/60">
          <button onClick={() => moveToFolder(c.id, null)}
            className="w-full px-6 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 flex items-center gap-2">
            <Inbox className="w-3.5 h-3.5" /> Skrzynka
          </button>
          {folders.map((f) => (
            <button key={f.id} onClick={() => moveToFolder(c.id, f.id)}
              className="w-full px-6 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 flex items-center gap-2">
              <Folder className="w-3.5 h-3.5" /> {f.name}
              {c.folderId === f.id && <span className="ml-auto text-brand-dark">✓</span>}
            </button>
          ))}
        </div>
      )}
      <button onClick={() => { setMenuFor(null); setConfirmState({ kind: 'conv', id: c.id, name: c.other.name }); }}
        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
        <Trash2 className="w-4 h-4" /> Usuń rozmowę
      </button>
      <button onClick={() => setConfirmState({ kind: 'block', id: c.other.id, name: c.other.name })}
        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 border-t border-gray-100">
        <Ban className="w-4 h-4" /> Zablokuj {c.other.name.split(' ')[0]}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MessageCircle}
        title="Messenger"
        description="Prywatne rozmowy z innymi opiekunami zwierząt"
      />

      <div className="pv-card overflow-hidden" style={{ height: 'calc(100vh - 230px)', minHeight: 480 }}>
        <div className="flex h-full">
          {/* SIDEBAR — foldery i filtry (desktop) */}
          <aside className="hidden md:flex flex-col w-52 border-r border-gray-100 flex-shrink-0 bg-gray-50/50">
            <div className="p-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Czaty</h3>
              <button onClick={openPrivacy} className="p-1.5 rounded-lg text-gray-400 hover:bg-white hover:text-brand-dark transition-all" title="Prywatność wiadomości" aria-label="Prywatność">
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
              <FolderBtn id={null} name="Skrzynka" icon={<Inbox className="w-4 h-4 flex-shrink-0" />} count={convs.length} />
              {folders.map((f) => (
                <FolderBtn key={f.id} id={f.id} name={f.name} icon={<Folder className="w-4 h-4 flex-shrink-0" />} count={f.convCount} deletable />
              ))}
              {folderAdding ? (
                <div className="flex gap-1.5 px-1 pt-1">
                  <input
                    type="text"
                    value={folderInput}
                    onChange={(e) => setFolderInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFolder()}
                    placeholder="Nazwa folderu"
                    maxLength={60}
                    autoFocus
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-brand-dark"
                  />
                  <button onClick={addFolder} className="px-2 rounded-lg bg-brand-dark text-white text-xs font-bold">+</button>
                </div>
              ) : (
                <button onClick={() => setFolderAdding(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-brand-dark hover:bg-brand-mint/40 transition-all">
                  <Plus className="w-4 h-4" /> Nowy folder
                </button>
              )}
            </div>
            <div className="p-3 border-t border-gray-100">
              <button onClick={() => setNewOpen(true)}
                className="w-full pv-btn-primary px-3 py-2.5 text-xs flex items-center justify-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" /> Nowa rozmowa
              </button>
            </div>
          </aside>

          {/* Lista rozmów */}
          <div className={`w-full md:w-64 lg:w-72 xl:w-80 border-r border-gray-100 flex-col flex-shrink-0 ${activeId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-3.5 border-b border-gray-100 space-y-2.5 flex-shrink-0">
              <div className="flex items-center justify-between md:hidden">
                <h3 className="font-semibold text-gray-900 text-sm">Rozmowy</h3>
                <div className="flex gap-1.5">
                  <button onClick={openPrivacy} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Prywatność">
                    <Settings2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setNewOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-mint/60 text-brand-dark text-xs font-semibold">
                    <Edit3 className="w-3.5 h-3.5" /> Nowa
                  </button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={convFilter}
                  onChange={(e) => setConvFilter(e.target.value)}
                  placeholder="Szukaj rozmowy..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-brand-dark"
                />
              </div>
              {/* foldery — chips na mobile */}
              <div className="md:hidden flex gap-1.5 overflow-x-auto pb-0.5">
                <button onClick={() => setActiveFolder(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                    activeFolder === null ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-gray-600 border-gray-200'
                  }`}>
                  Skrzynka
                </button>
                {folders.map((f) => (
                  <button key={f.id} onClick={() => setActiveFolder(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                      activeFolder === f.id ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-gray-600 border-gray-200'
                    }`}>
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="py-16 text-center"><Loader2 className="w-6 h-6 mx-auto text-brand animate-spin" /></div>
              ) : visibleConvs.length === 0 ? (
                <div className="py-16 text-center px-6">
                  <MessageCircle className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                  <p className="text-sm text-gray-500">{activeFolder ? 'Folder jest pusty' : 'Brak rozmów'}</p>
                  <p className="text-xs text-gray-400 mt-1">Kliknij „Nowa", aby napisać do kogoś pierwszy raz.</p>
                </div>
              ) : (
                visibleConvs.map((c) => (
                  <div key={c.id} className="relative">
                    <button
                      onClick={() => openConv(c.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        activeId === c.id ? 'bg-brand-mint/50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar name={c.other.name} url={c.other.avatarUrl} />
                        {c.unread > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 border-2 border-white text-white text-[10px] font-bold flex items-center justify-center">
                            {c.unread > 9 ? '9+' : c.unread}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5">
                          {c.pinned && <Pin className="w-3 h-3 text-brand-dark flex-shrink-0" />}
                          <p className={`text-sm truncate ${c.unread > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                            {c.other.name}
                          </p>
                          {c.muted && <BellOff className="w-3 h-3 text-gray-300 flex-shrink-0" />}
                          {c.lastMessage && (
                            <span className="ml-auto text-[10px] text-gray-400 flex-shrink-0">{getTimeAgo(c.lastMessage.createdAt)}</span>
                          )}
                        </div>
                        <p className={`text-xs truncate ${c.unread > 0 ? 'font-semibold text-gray-700' : 'text-gray-400'}`}>
                          {c.lastMessage ? `${c.lastMessage.mine ? 'Ty: ' : ''}${c.lastMessage.body}` : 'Rozpocznij rozmowę'}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === c.id ? null : c.id); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-300 hover:bg-white hover:text-gray-600"
                      aria-label="Opcje rozmowy"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuFor === c.id && <ConvMenu c={c} />}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Czat */}
          <div className={`flex-1 flex-col min-w-0 ${activeId ? 'flex' : 'hidden md:flex'}`}>
            {!activeId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-brand-mint to-brand-light/40 flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-brand-dark" />
                </div>
                <h3 className="pv-section-title mb-1">Twoje wiadomości</h3>
                <p className="text-sm text-gray-500 max-w-xs">
                  Wybierz rozmowę z listy albo napisz do kogoś nowego. Rozmowy możesz porządkować w foldery.
                </p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0 bg-white">
                  <button
                    onClick={() => { setActiveId(null); router.replace('/dashboard/messages'); }}
                    className="md:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100"
                    aria-label="Wróć do listy"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {chatUserId ? (
                    <Link href={`/dashboard/community/user/${chatUserId}`} className="flex items-center gap-3 min-w-0 group flex-1">
                      <Avatar name={chatName} url={chatAvatar} size="sm" />
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-900 text-sm truncate block group-hover:text-brand-dark transition-colors">
                          {chatName}
                        </span>
                        {activeConv?.muted && <span className="text-[10px] text-gray-400 flex items-center gap-1"><BellOff className="w-3 h-3" /> wyciszona</span>}
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar name={chatName} url={chatAvatar} size="sm" />
                      <span className="font-semibold text-gray-900 text-sm truncate">{chatName}</span>
                    </div>
                  )}
                  <div className="relative flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setChatMenuOpen(!chatMenuOpen); }}
                      className="p-2 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Opcje">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {chatMenuOpen && activeConv && (
                      <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-30 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        {chatUserId && (
                          <Link href={`/dashboard/community/user/${chatUserId}`}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                            <Users className="w-4 h-4" /> Zobacz profil
                          </Link>
                        )}
                        <button onClick={() => flag(activeConv.id, { pinned: !activeConv.pinned })}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                          {activeConv.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                          {activeConv.pinned ? 'Odepnij' : 'Przypnij rozmowę'}
                        </button>
                        <button onClick={() => flag(activeConv.id, { muted: !activeConv.muted })}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                          {activeConv.muted ? <BellRing className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                          {activeConv.muted ? 'Wyłącz wyciszenie' : 'Wycisz'}
                        </button>
                        <button onClick={() => setFolderPicker(activeConv.id)}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                          <FolderInput className="w-4 h-4" /> Do folderu
                        </button>
                        <button onClick={() => { setChatMenuOpen(false); setConfirmState({ kind: 'conv', id: activeConv.id, name: chatName }); }}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                          <Trash2 className="w-4 h-4" /> Usuń rozmowę
                        </button>
                        {chatUserId && (
                          <button onClick={() => setConfirmState({ kind: 'block', id: chatUserId, name: chatName })}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 border-t border-gray-100">
                            <Ban className="w-4 h-4" /> Zablokuj
                          </button>
                        )}
                      </div>
                    )}
                    {folderPicker === activeConv?.id && (
                      <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-30 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Przenieś do</p>
                        <button onClick={() => moveToFolder(activeConv.id, null)}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                          <Inbox className="w-4 h-4" /> Skrzynka
                        </button>
                        {folders.map((f) => (
                          <button key={f.id} onClick={() => moveToFolder(activeConv.id, f.id)}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                            <Folder className="w-4 h-4" /> {f.name}
                            {activeConv.folderId === f.id && <span className="ml-auto text-brand-dark">✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Wiadomości */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 bg-gradient-to-b from-brand-cream/40 to-white">
                  {chatLoading ? (
                    <div className="py-16 text-center"><Loader2 className="w-6 h-6 mx-auto text-brand animate-spin" /></div>
                  ) : messages.length === 0 ? (
                    <div className="py-16 text-center">
                      <p className="text-sm text-gray-400">Napisz pierwszą wiadomość do {chatName.split(' ')[0]} 👋</p>
                    </div>
                  ) : (
                    <>
                    {hasMore && (
                      <div className="text-center pb-2">
                        <button
                          onClick={loadOlder}
                          disabled={loadingOlder}
                          className="px-4 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-500 hover:border-brand-dark hover:text-brand-dark disabled:opacity-50 transition-all"
                        >
                          {loadingOlder ? 'Wczytywanie…' : 'Wczytaj starsze wiadomości'}
                        </button>
                      </div>
                    )}
                    {messages.map((m, i) => {
                      const mine = m.senderId === myId;
                      const showAvatar = !mine && (i === 0 || messages[i - 1].senderId !== m.senderId);
                      const lastOfGroup = i === messages.length - 1 || messages[i + 1].senderId !== m.senderId;
                      const isLastMine = mine && !messages.slice(i + 1).some((x) => x.senderId === myId);
                      const seen = isLastMine && parseInt(m.id, 10) <= otherRead;
                      const time = new Date(m.createdAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={m.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                          {!mine && <div className="w-7 flex-shrink-0">{showAvatar && <Avatar name={chatName} url={chatAvatar} size="sm" />}</div>}
                          <div className={`max-w-[75%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                                mine
                                  ? 'bg-gradient-to-br from-brand-dark to-brand text-white rounded-br-md'
                                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
                              }`}
                              title={new Date(m.createdAt).toLocaleString('pl-PL')}
                            >
                              {m.body}
                            </div>
                            {(lastOfGroup || isLastMine) && (
                              <span className={`mt-0.5 px-1 text-[10px] flex items-center gap-1 ${mine ? 'text-gray-400' : 'text-gray-300'}`}>
                                {time}
                                {isLastMine && (
                                  seen ? (
                                    <>
                                      <CheckCheck className="w-3 h-3 text-brand-dark" />
                                      {otherReadAt
                                        ? `Wyświetlono ${new Date(otherReadAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
                                        : 'Wyświetlono'}
                                    </>
                                  ) : (
                                    <><Check className="w-3 h-3" /> Doręczono</>
                                  )
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    </>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Pole wysyłania */}
                <div className="p-3 border-t border-gray-100 flex-shrink-0 bg-white">
                  {sendError && (
                    <p className="mb-2 text-xs text-red-500 flex items-center gap-1.5"><Ban className="w-3.5 h-3.5" /> {sendError}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && send()}
                      placeholder={`Napisz do ${chatName.split(' ')[0]}...`}
                      maxLength={2000}
                      className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:border-brand-dark focus:ring-4 focus:ring-brand/10"
                    />
                    <button
                      onClick={send}
                      disabled={!input.trim() || sending}
                      className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center hover:bg-brand transition-all active:scale-90 disabled:opacity-40 flex-shrink-0"
                      aria-label="Wyślij"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal nowej rozmowy — input NA GÓRZE, widoczny nad klawiaturą */}
      {newOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in px-4 pt-[10vh]" onClick={() => setNewOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[60vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Nowa wiadomość</h3>
              <button onClick={() => setNewOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Zamknij">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={newQuery}
                  onChange={(e) => setNewQuery(e.target.value)}
                  placeholder="Szukaj osoby..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-dark focus:ring-4 focus:ring-brand/10"
                />
              </div>
              {newError && (
                <p className="mt-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5 flex-shrink-0" /> {newError}
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto min-h-[100px]">
              {newQuery.trim().length < 2 ? (
                <p className="px-4 pb-6 text-sm text-gray-400 text-center">Wpisz co najmniej 2 znaki, aby szukać</p>
              ) : newResults.length === 0 ? (
                <p className="px-4 pb-6 text-sm text-gray-400 text-center">Brak wyników</p>
              ) : (
                newResults.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => startConv(p.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-brand-mint/40 transition-colors disabled:opacity-50"
                    disabled={newBusy}
                  >
                    <Avatar name={p.name} url={p.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-sm text-gray-900 truncate block">{p.name}</span>
                      {p.relation === 'friend' && <span className="text-[11px] text-emerald-600">znajomy/a</span>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal prywatności wiadomości */}
      {privacyOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in px-4 pt-[8vh] sm:pt-0 pb-24" onClick={() => setPrivacyOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[70vh] sm:max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-brand-dark" /> Prywatność wiadomości
              </h3>
              <button onClick={() => setPrivacyOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Zamknij">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Kto może do Ciebie pisać</p>
                <div className="flex gap-2">
                  {[
                    { id: 'everyone', name: 'Wszyscy' },
                    { id: 'friends', name: 'Tylko znajomi' },
                  ].map((o) => (
                    <button key={o.id}
                      onClick={async () => {
                        setPrivacy({ messages_from: o.id });
                        try { await friendsApi.updateSettings({ messages_from: o.id as any }); } catch {}
                      }}
                      className={`flex-1 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                        privacy.messages_from === o.id ? 'border-brand-dark bg-brand-mint/40 text-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {o.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Zablokowani ({blocked.length})</p>
                {blocked.length === 0 ? (
                  <p className="text-sm text-gray-400">Brak zablokowanych osób.</p>
                ) : (
                  <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {blocked.map((b) => (
                      <div key={b.id} className="flex items-center gap-3 px-4 py-2.5">
                        <Avatar name={b.name} url={b.avatarUrl} size="sm" />
                        <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">{b.name}</span>
                        <button
                          onClick={async () => {
                            try {
                              await friendsApi.unblock(b.id);
                              setBlocked((l) => l.filter((x) => x.id !== b.id));
                            } catch {}
                          }}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:border-brand-dark hover:text-brand-dark transition-all">
                          Odblokuj
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmState}
        title={
          confirmState?.kind === 'folder' ? 'Usunąć folder?'
          : confirmState?.kind === 'block' ? `Zablokować ${confirmState.name.split(' ')[0]}?`
          : 'Usunąć rozmowę?'
        }
        description={
          confirmState?.kind === 'folder'
            ? `Rozmowy z folderu „${confirmState.name}” wrócą do Skrzynki.`
            : confirmState?.kind === 'block'
            ? `${confirmState.name} nie będzie mógł(a) pisać do Ciebie ani zapraszać Cię do znajomych.`
            : `Rozmowa z ${confirmState?.name || ''} zniknie z Twojej listy — wróci, gdy ktoś napisze nową wiadomość.`
        }
        confirmLabel={confirmState?.kind === 'block' ? 'Zablokuj' : 'Usuń'}
        onConfirm={runConfirm}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="pv-card p-16 text-center"><Loader2 className="w-8 h-8 mx-auto text-brand animate-spin" /></div>}>
      <MessagesInner />
    </Suspense>
  );
}
