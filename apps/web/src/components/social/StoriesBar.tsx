'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Film,
  ImagePlus,
  Loader2,
  Minus,
  Music,
  Pause,
  Play,
  Plus,
  Send,
  Smile,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { storiesApi } from '@/lib/api';
import { STORY_TRACKS } from '@/lib/story-music';
import { Avatar, downscaleImage, getTimeAgo } from './shared';

// Portal do document.body — edytor/viewer relacji MUSI być nad BottomNav (z-50)
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

interface StoryTextEl {
  content: string;
  x: number;
  y: number;
  color: string;
  size: 'sm' | 'md' | 'lg';
}

interface StorySticker {
  emoji: string;
  x: number;
  y: number;
  scale: number;
  kind?: 'emoji' | 'badge';
  label?: string;
  color?: string;
}

interface StoryMeta {
  texts?: StoryTextEl[];
  stickers?: StorySticker[];
  music?: { title: string; artist: string; url?: string } | null;
  template?: { from: string; to: string; textColor: string };
  duration?: number;
}

interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  image: string | null;
  mediaType?: 'image' | 'video' | null;
  text: string;
  bgColor: string;
  meta?: StoryMeta | null;
  viewCount: number;
  seenByMe: boolean;
  createdAt: string;
  expiresAt: string;
}

interface AuthorStories {
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  stories: Story[];
  allSeen: boolean;
}

const STORY_BG = ['#1B6B4A', '#0F3D2E', '#2E8B62', '#7C3AED', '#DB2777', '#EA580C', '#2563EB'];

// Szablony tekstowych relacji — gradient + sugerowany kolor tekstu
const STORY_TEMPLATES = [
  { id: 'forest', name: 'Las', from: '#1B6B4A', to: '#0F3D2E', textColor: '#ffffff' },
  { id: 'sunset', name: 'Zachód', from: '#EA580C', to: '#DB2777', textColor: '#ffffff' },
  { id: 'ocean', name: 'Ocean', from: '#2563EB', to: '#0F3D2E', textColor: '#ffffff' },
  { id: 'violet', name: 'Fiolet', from: '#7C3AED', to: '#4C1D95', textColor: '#ffffff' },
  { id: 'berry', name: 'Malina', from: '#DB2777', to: '#7C3AED', textColor: '#ffffff' },
  { id: 'mint', name: 'Mięta', from: '#34d399', to: '#1B6B4A', textColor: '#ffffff' },
  { id: 'night', name: 'Noc', from: '#111827', to: '#374151', textColor: '#ffffff' },
  { id: 'sand', name: 'Piasek', from: '#fbbf24', to: '#EA580C', textColor: '#111827' },
  { id: 'sky', name: 'Niebo', from: '#60a5fa', to: '#2563EB', textColor: '#ffffff' },
];

// Odznaki-naklejki (emoji + podpis w pigułce)
const STORY_BADGES = [
  { emoji: '🐾', label: 'Mój pupil', color: '#7C3AED' },
  { emoji: '🎂', label: 'Urodziny', color: '#DB2777' },
  { emoji: '🏠', label: 'Nowy dom', color: '#059669' },
  { emoji: '❤️', label: 'Adopcja', color: '#DB2777' },
  { emoji: '🚶', label: 'Spacer', color: '#2563EB' },
  { emoji: '🏆', label: 'Osiągnięcie', color: '#EA580C' },
  { emoji: '✨', label: 'Nowość', color: '#7C3AED' },
  { emoji: '💤', label: 'Drzemka', color: '#111827' },
  { emoji: '🩺', label: 'Wizyta u weta', color: '#059669' },
  { emoji: '🎓', label: 'Trening', color: '#EA580C' },
];

const DEFAULT_IMAGE_DURATION_S = 7;
const MAX_IMAGE_DURATION_S = 15;
const MAX_VIDEO_DURATION_S = 60;

const groupByAuthor = (stories: Story[], myId: string): AuthorStories[] => {
  const map = new Map<string, AuthorStories>();
  for (const s of stories) {
    if (!map.has(s.authorId)) {
      map.set(s.authorId, {
        authorId: s.authorId,
        authorName: s.authorName,
        authorAvatar: s.authorAvatar,
        stories: [],
        allSeen: true,
      });
    }
    const a = map.get(s.authorId)!;
    a.stories.push(s);
    if (!s.seenByMe) a.allSeen = false;
  }
  const list = Array.from(map.values()).map((a) => ({
    ...a,
    stories: [...a.stories].sort((x, y) => +new Date(x.createdAt) - +new Date(y.createdAt)),
  }));
  list.sort((a, b) => {
    if (a.authorId === myId) return -1;
    if (b.authorId === myId) return 1;
    if (a.allSeen !== b.allSeen) return a.allSeen ? 1 : -1;
    return +new Date(b.stories[0].createdAt) - +new Date(a.stories[0].createdAt);
  });
  return list;
};

// ---------- Podgląd relacji ----------
function StoryViewer({
  author,
  startIndex,
  myId,
  onClose,
  onDeleted,
}: {
  author: AuthorStories;
  startIndex: number;
  myId: string;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const story = author.stories[idx];
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const markViewed = (s: Story) => {
    if (!s.seenByMe) storiesApi.view(s.id).catch(() => {});
  };

  const goNext = () => {
    if (idx < author.stories.length - 1) setIdx(idx + 1);
    else onClose();
  };

  // Czas wyświetlania: meta.duration; fallback — film 60 s, obraz/tekst 6 s
  const dur = Math.min(
    story.meta?.duration || (story.mediaType === 'video' ? MAX_VIDEO_DURATION_S : 6),
    story.mediaType === 'video' ? MAX_VIDEO_DURATION_S : MAX_IMAGE_DURATION_S
  );

  useEffect(() => {
    markViewed(story);
    // Dla filmu czekamy na 'ended' albo limit — timer to awaryjny cap
    timer.current = setTimeout(goNext, dur * 1000);
    if (story.mediaType === 'video') {
      const v = videoRef.current;
      if (v) {
        const durMs = (v.duration && isFinite(v.duration) ? v.duration : MAX_VIDEO_DURATION_S) * 1000;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(goNext, Math.min(durMs, MAX_VIDEO_DURATION_S * 1000) + 400);
      }
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    try {
      await storiesApi.delete(story.id);
      onDeleted(story.id);
      if (author.stories.length <= 1) onClose();
    } catch {}
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-[100] bg-gray-900/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="relative w-full max-w-sm aspect-[9/16] max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Muzyka relacji — gra w pętli podczas oglądania */}
        {story.meta?.music?.url && (
          <audio key={story.id} src={story.meta.music.url} autoPlay loop />
        )}
        {/* Paski postępu — czas zgodny z długością relacji */}
        <div className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] inset-x-3 z-20 flex gap-1">
          {author.stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
              <div
                className={`h-full bg-white ${i < idx ? 'w-full' : i === idx ? 'story-progress' : 'w-0'}`}
                style={i === idx ? { animationDuration: `${dur}s` } : undefined}
              />
            </div>
          ))}
        </div>

        {/* Nagłówek */}
        <div className="absolute top-[calc(env(safe-area-inset-top)+1.75rem)] inset-x-4 z-20 flex items-center gap-2.5">
          <Avatar name={author.authorName} url={author.authorAvatar} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate drop-shadow">{author.authorName}</p>
            <p className="text-white/70 text-xs">{getTimeAgo(story.createdAt)}</p>
          </div>
          {story.authorId === myId && (
            <span className="inline-flex items-center gap-1 text-white/80 text-xs bg-black/30 rounded-full px-2 py-1">
              <Eye className="w-3.5 h-3.5" /> {story.viewCount}
            </span>
          )}
          {story.authorId === myId && (
            <button
              onClick={handleDelete}
              className={`p-2 rounded-full transition-all ${
                confirmDelete ? 'bg-red-500 text-white' : 'bg-black/30 text-white/80 hover:bg-black/50 hover:text-white'
              }`}
              aria-label={confirmDelete ? 'Potwierdź usunięcie' : 'Usuń relację'}
              title={confirmDelete ? 'Kliknij ponownie, by usunąć' : 'Usuń relację'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/30 text-white/80 hover:bg-black/50 hover:text-white"
            aria-label="Zamknij"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Treść */}
        {story.image && story.mediaType === 'video' ? (
          <video ref={videoRef} src={story.image} className="w-full h-full object-cover" autoPlay loop playsInline muted={false} controls={false} />
        ) : story.image ? (
          <img src={story.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center p-8"
            style={{
              background: story.meta?.template
                ? `linear-gradient(160deg, ${story.meta.template.from}, ${story.meta.template.to})`
                : `linear-gradient(160deg, ${story.bgColor}, #0F3D2E)`,
            }}
          >
            {!story.meta?.texts?.length && (
              <p
                className="text-xl sm:text-2xl font-semibold text-center break-words drop-shadow"
                style={{ color: story.meta?.template?.textColor || '#ffffff' }}
              >
                {story.text}
              </p>
            )}
          </div>
        )}

        {/* Nakładki edytora (tekst / emoji / muzyka) */}
        {story.meta?.texts?.map((t, i) => (
          <p
            key={`t${i}`}
            className="absolute font-bold drop-shadow-lg break-words pointer-events-none"
            style={{
              left: `${t.x}%`,
              top: `${t.y}%`,
              transform: 'translate(-50%, -50%)',
              color: t.color,
              fontSize: t.size === 'lg' ? '1.75rem' : t.size === 'sm' ? '0.95rem' : '1.3rem',
              maxWidth: '90%',
              textAlign: 'center',
              WebkitTextStroke: t.color === '#ffffff' ? '0' : '0.5px rgba(0,0,0,0.25)',
            }}
          >
            {t.content}
          </p>
        ))}
        {story.meta?.stickers?.map((s, i) => (
          s.kind === 'badge' ? (
            <span
              key={`s${i}`}
              className="absolute pointer-events-none select-none inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white font-bold shadow-lg"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                transform: `translate(-50%, -50%) scale(${s.scale})`,
                fontSize: '1rem',
                background: s.color || '#7C3AED',
              }}
            >
              <span className="text-xl leading-none">{s.emoji}</span>
              {s.label && <span className="whitespace-nowrap">{s.label}</span>}
            </span>
          ) : (
            <span
              key={`s${i}`}
              className="absolute pointer-events-none select-none"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                transform: `translate(-50%, -50%) scale(${s.scale})`,
                fontSize: '3rem',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
              }}
            >
              {s.emoji}
            </span>
          )
        ))}
        {story.meta?.music && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white pointer-events-none">
            <Music className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold truncate max-w-[200px]">
              {story.meta.music.artist}{story.meta.music.artist && story.meta.music.title ? ' — ' : ''}{story.meta.music.title}
            </span>
          </div>
        )}

        {/* Nawigacja */}
        {idx > 0 && (
          <button
            onClick={() => setIdx(idx - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
            aria-label="Poprzednia"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {idx < author.stories.length - 1 && (
          <button
            onClick={() => setIdx(idx + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
            aria-label="Następna"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
    </Portal>
  );
}

// ---------- Edytor relacji (canvas jak na Instagramie/Facebooku) ----------
const TEXT_COLORS = ['#ffffff', '#111827', '#fbbf24', '#f87171', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'];
const TEXT_SIZES: { id: 'sm' | 'md' | 'lg'; label: string }[] = [
  { id: 'sm', label: 'S' },
  { id: 'md', label: 'M' },
  { id: 'lg', label: 'L' },
];
const STORY_EMOJI = [
  '🐶', '🐱', '🐰', '🐦', '🐹', '🐴', '🐢', '🐠',
  '🐾', '🦴', '🎾', '🐕', '🐈', '🦮', '🐕‍🦺', '🧸',
  '❤️', '😍', '🥰', '😂', '😎', '🤩', '😢', '😴',
  '🎉', '🎂', '⭐', '🔥', '✨', '🌈', '☀️', '🌸',
  '🏆', '👑', '💪', '📸', '🎵', '🚶', '🏃', '🏖️',
];
const MAX_STORY_VIDEO_MB = 5;
let elSeq = 0;
const nextId = () => `e${++elSeq}_${Date.now()}`;

type TextEl = StoryTextEl & { id: string };
type StickerEl = StorySticker & { id: string };
type Sel = { kind: 'text' | 'sticker'; id: string } | null;

function StoryComposer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLAudioElement>(null);
  const drag = useRef<{ kind: 'text' | 'sticker'; id: string } | null>(null);
  const [mode, setMode] = useState<'media' | 'text'>('media');
  const [media, setMedia] = useState<{ url: string; type: 'image' | 'video'; duration?: number } | null>(null);
  const [texts, setTexts] = useState<TextEl[]>([]);
  const [stickers, setStickers] = useState<StickerEl[]>([]);
  const [music, setMusic] = useState<{ title: string; artist: string; url: string } | null>(null);
  const [musicTab, setMusicTab] = useState<'library' | 'upload'>('library');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState(STORY_BG[0]);
  const [template, setTemplate] = useState<typeof STORY_TEMPLATES[number] | null>(STORY_TEMPLATES[0]);
  const [duration, setDuration] = useState(DEFAULT_IMAGE_DURATION_S);
  const [sel, setSel] = useState<Sel>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiTab, setEmojiTab] = useState<'emoji' | 'badge'>('emoji');
  const [musicOpen, setMusicOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selText = sel?.kind === 'text' ? texts.find((t) => t.id === sel.id) : null;
  const selSticker = sel?.kind === 'sticker' ? stickers.find((s) => s.id === sel.id) : null;

  // ESC zamyka edytor; klik w tło NIE zamyka (wcześniej wyrzucało po pickerze plików)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Stop podglądu muzyki przy zamknięciu
  useEffect(() => () => previewRef.current?.pause(), []);

  const stopPreview = () => {
    previewRef.current?.pause();
    setPreviewUrl(null);
  };

  const togglePreview = (url: string) => {
    const a = previewRef.current;
    if (!a) return;
    if (previewUrl === url) {
      a.pause();
      setPreviewUrl(null);
      return;
    }
    a.src = url;
    a.play().catch(() => {});
    setPreviewUrl(url);
  };

  const pickMedia = async (f: File | undefined) => {
    if (!f) return;
    setError('');
    if (f.type.startsWith('video/')) {
      if (f.size > MAX_STORY_VIDEO_MB * 1024 * 1024) {
        setError(`Filmik może mieć maks. ${MAX_STORY_VIDEO_MB} MB.`);
        return;
      }
      const objectUrl = URL.createObjectURL(f);
      const probe = document.createElement('video');
      probe.preload = 'metadata';
      probe.src = objectUrl;
      probe.onloadedmetadata = () => {
        const dur = probe.duration;
        URL.revokeObjectURL(objectUrl);
        if (isFinite(dur) && dur > MAX_VIDEO_DURATION_S) {
          setError(`Filmik może trwać maks. ${MAX_VIDEO_DURATION_S} s — Twój ma ${Math.round(dur)} s.`);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => setMedia({ url: reader.result as string, type: 'video', duration: isFinite(dur) ? dur : undefined });
        reader.onerror = () => setError('Nie udało się wczytać filmiku.');
        reader.readAsDataURL(f);
      };
      probe.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        // Nie dało się odczytać metadanych — przepuszczamy, limit pilnuje odtwarzanie
        const reader = new FileReader();
        reader.onload = () => setMedia({ url: reader.result as string, type: 'video' });
        reader.onerror = () => setError('Nie udało się wczytać filmiku.');
        reader.readAsDataURL(f);
      };
      return;
    }
    try {
      setMedia({ url: await downscaleImage(f, 900), type: 'image' });
    } catch {
      // Fallback: niektóre formaty (np. HEIC) nie dekodują się w canvas — bierzemy surowy data URL
      const reader = new FileReader();
      reader.onload = () => setMedia({ url: reader.result as string, type: 'image' });
      reader.onerror = () => setError('Nie udało się wczytać zdjęcia.');
      reader.readAsDataURL(f);
    }
  };

  const pickAudio = (f: File | undefined) => {
    if (!f) return;
    setError('');
    if (!f.type.startsWith('audio/')) {
      setError('Wybierz plik audio (mp3, wav, m4a…).');
      return;
    }
    if (f.size > 4.5 * 1024 * 1024) {
      setError('Plik audio może mieć maks. 4,5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setMusic({ title: f.name.replace(/\.[^.]+$/, '').slice(0, 100), artist: 'Twój utwór', url: reader.result as string });
      setMusicOpen(false);
      stopPreview();
    };
    reader.onerror = () => setError('Nie udało się wczytać pliku audio.');
    reader.readAsDataURL(f);
  };

  const pickTrack = (t: { title: string; url: string }) => {
    setMusic({ title: t.title, artist: 'PetVio', url: t.url });
    setMusicOpen(false);
    stopPreview();
  };

  const addText = () => {
    const t: TextEl = { id: nextId(), content: '', x: 50, y: 50, color: '#ffffff', size: 'md' };
    setTexts((l) => [...l, t]);
    setSel({ kind: 'text', id: t.id });
    setEmojiOpen(false);
    setMusicOpen(false);
  };

  const addSticker = (emoji: string) => {
    const s: StickerEl = { id: nextId(), emoji, x: 50, y: 50, scale: 1 };
    setStickers((l) => [...l, s]);
    setSel({ kind: 'sticker', id: s.id });
    setEmojiOpen(false);
  };

  const addBadge = (b: { emoji: string; label: string; color: string }) => {
    const s: StickerEl = { id: nextId(), emoji: b.emoji, label: b.label, color: b.color, kind: 'badge', x: 50, y: 50, scale: 1 };
    setStickers((l) => [...l, s]);
    setSel({ kind: 'sticker', id: s.id });
    setEmojiOpen(false);
  };

  // Przeciąganie elementów po canvasie
  const startDrag = (e: React.PointerEvent, kind: 'text' | 'sticker', id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSel({ kind, id });
    setEmojiOpen(false);
    setMusicOpen(false);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { kind, id };
  };
  const onDragMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    const x = Math.min(95, Math.max(5, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.min(95, Math.max(5, ((e.clientY - r.top) / r.height) * 100));
    if (d.kind === 'text') setTexts((l) => l.map((t) => (t.id === d.id ? { ...t, x, y } : t)));
    else setStickers((l) => l.map((s) => (s.id === d.id ? { ...s, x, y } : s)));
  };
  const endDrag = () => {
    drag.current = null;
  };

  const removeSel = () => {
    if (!sel) return;
    if (sel.kind === 'text') setTexts((l) => l.filter((t) => t.id !== sel.id));
    else setStickers((l) => l.filter((s) => s.id !== sel.id));
    setSel(null);
  };

  const canPublish = (mode === 'media' && !!media) || (mode === 'text' && texts.some((t) => t.content.trim()));

  const submit = async () => {
    if (busy || !canPublish) return;
    setBusy(true);
    setError('');
    try {
      const cleanTexts = texts
        .map(({ content, x, y, color, size }) => ({ content: content.trim(), x, y, color, size }))
        .filter((t) => t.content);
      const meta: StoryMeta = {};
      if (cleanTexts.length) meta.texts = cleanTexts;
      if (stickers.length) meta.stickers = stickers.map(({ id, ...s }) => s);
      if (music) meta.music = music;
      if (mode === 'text' && template) meta.template = { from: template.from, to: template.to, textColor: template.textColor };
      // Zdjęcie/tekst: 3–15 s (wybór twórcy); film: długość wykryta przy wgraniu, cap 60 s
      if (media?.type === 'video' && mode === 'media') {
        meta.duration = Math.min(media.duration || MAX_VIDEO_DURATION_S, MAX_VIDEO_DURATION_S);
      } else {
        meta.duration = Math.min(Math.max(duration, 3), MAX_IMAGE_DURATION_S);
      }
      await storiesApi.create({
        image: mode === 'media' ? media?.url : undefined,
        mediaType: mode === 'media' ? media?.type : undefined,
        text: cleanTexts[0]?.content || '',
        bgColor: template?.from || bgColor,
        meta: Object.keys(meta).length ? meta : undefined,
      });
      onCreated();
    } catch {
      setError('Nie udało się opublikować relacji.');
    } finally {
      setBusy(false);
    }
  };

  const toolBtn = (active: boolean) =>
    `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[10px] font-semibold transition-colors ${
      active ? 'bg-brand-light text-brand-dark' : 'text-gray-500 hover:text-gray-800'
    }`;

  return (
    <Portal>
    <div className="fixed inset-0 z-[100] bg-[#F6F4EE] flex flex-col overflow-hidden">
      {/* Nagłówek — jasny, spójny z aplikacją; safe-area chroni przed notchem/status barem */}
      <div
        className="flex items-center justify-between px-3 pb-3 bg-white border-b border-gray-200 shrink-0"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
      >
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500" aria-label="Zamknij">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-gray-900 font-semibold text-sm">Nowa relacja</h3>
        <button
          onClick={submit}
          disabled={busy || !canPublish}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-dark text-white text-sm font-semibold disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Udostępnij
        </button>
      </div>

      {/* Środek — przewijalny */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center gap-3 px-4 py-4">
        {/* Canvas 9:16 */}
        <div
          ref={canvasRef}
          onClick={() => { setSel(null); setEmojiOpen(false); }}
          className="relative w-full max-w-[300px] aspect-[9/16] max-h-[52vh] rounded-3xl overflow-hidden shadow-xl touch-none select-none shrink-0"
          style={
            mode === 'text'
              ? {
                  background: template
                    ? `linear-gradient(160deg, ${template.from}, ${template.to})`
                    : `linear-gradient(160deg, ${bgColor}, #0F3D2E)`,
                }
              : { background: '#111' }
          }
        >
          {/* Muzyka relacji — podgląd gra podczas edycji */}
          {music?.url && <audio src={music.url} autoPlay loop />}

          {mode === 'media' && media?.type === 'video' && (
            <video src={media.url} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline />
          )}
          {mode === 'media' && media?.type === 'image' && (
            <img src={media.url} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
          )}
          {mode === 'media' && !media && (
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70 hover:text-white transition-colors"
            >
              <ImagePlus className="w-10 h-10" />
              <span className="text-sm font-medium">Wybierz zdjęcie lub filmik</span>
              <span className="text-xs text-white/40">albo przełącz na tryb tekstu poniżej</span>
            </button>
          )}

          {/* Nakładki — tekst */}
          {texts.map((t) => (
            <p
              key={t.id}
              onPointerDown={(e) => startDrag(e, 'text', t.id)}
              onPointerMove={onDragMove}
              onPointerUp={endDrag}
              className={`absolute font-bold break-words cursor-move ${
                sel?.kind === 'text' && sel.id === t.id ? 'outline outline-2 outline-white/70 rounded-lg px-1' : ''
              }`}
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                transform: 'translate(-50%, -50%)',
                color: t.color,
                fontSize: t.size === 'lg' ? '1.9rem' : t.size === 'sm' ? '1rem' : '1.35rem',
                maxWidth: '90%',
                textAlign: 'center',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                minWidth: '3rem',
                minHeight: '1.5rem',
              }}
            >
              {t.content || '…'}
            </p>
          ))}

          {/* Nakładki — emoji + odznaki */}
          {stickers.map((s) => (
            s.kind === 'badge' ? (
              <span
                key={s.id}
                onPointerDown={(e) => startDrag(e, 'sticker', s.id)}
                onPointerMove={onDragMove}
                onPointerUp={endDrag}
                className={`absolute cursor-move inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white font-bold shadow-lg ${
                  sel?.kind === 'sticker' && sel.id === s.id ? 'outline outline-2 outline-white/70' : ''
                }`}
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  transform: `translate(-50%, -50%) scale(${s.scale})`,
                  fontSize: '1rem',
                  background: s.color || '#7C3AED',
                }}
              >
                <span className="text-xl leading-none">{s.emoji}</span>
                {s.label && <span className="whitespace-nowrap">{s.label}</span>}
              </span>
            ) : (
              <span
                key={s.id}
                onPointerDown={(e) => startDrag(e, 'sticker', s.id)}
                onPointerMove={onDragMove}
                onPointerUp={endDrag}
                className={`absolute cursor-move ${sel?.kind === 'sticker' && sel.id === s.id ? 'outline outline-2 outline-white/70 rounded-lg' : ''}`}
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  transform: `translate(-50%, -50%) scale(${s.scale})`,
                  fontSize: '3rem',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                }}
              >
                {s.emoji}
              </span>
            )
          ))}

          {/* Chip muzyki */}
          {music && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white">
              <Music className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold truncate max-w-[180px]">
                {music.artist}{music.artist && music.title ? ' — ' : ''}{music.title}
              </span>
              <button onClick={() => setMusic(null)} className="text-white/60 hover:text-white" aria-label="Usuń muzykę">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Panel edycji zaznaczonego elementu — jasne karty */}
        <div className="w-full max-w-sm space-y-2">
          {selText && (
            <div className="bg-white border border-gray-200 rounded-2xl p-3 space-y-2 shadow-sm">
              <input
                value={selText.content}
                onChange={(e) => setTexts((l) => l.map((t) => (t.id === selText.id ? { ...t, content: e.target.value } : t)))}
                placeholder="Wpisz tekst…"
                maxLength={150}
                autoFocus={!selText.content}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm font-medium focus:outline-none focus:border-brand"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setTexts((l) => l.map((t) => (t.id === selText.id ? { ...t, color: c } : t)))}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${selText.color === c ? 'border-gray-800 scale-110' : 'border-gray-300'}`}
                      style={{ backgroundColor: c }}
                      aria-label={`Kolor ${c}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {TEXT_SIZES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setTexts((l) => l.map((t) => (t.id === selText.id ? { ...t, size: s.id } : t)))}
                      className={`w-7 h-7 rounded-lg text-xs font-bold ${selText.size === s.id ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                      {s.label}
                    </button>
                  ))}
                  <button onClick={removeSel} className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center" aria-label="Usuń tekst">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {selSticker && (
            <div className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center justify-between shadow-sm">
              <span className="text-gray-500 text-xs font-medium">Rozmiar naklejki</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setStickers((l) => l.map((s) => (s.id === selSticker.id ? { ...s, scale: Math.max(0.5, s.scale - 0.3) } : s)))}
                  className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center"
                  aria-label="Zmniejsz"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setStickers((l) => l.map((s) => (s.id === selSticker.id ? { ...s, scale: Math.min(3, s.scale + 0.3) } : s)))}
                  className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center"
                  aria-label="Powiększ"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={removeSel} className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center" aria-label="Usuń naklejkę">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Panel naklejek — emoji + odznaki */}
          {emojiOpen && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => setEmojiTab('emoji')}
                  className={`flex-1 py-2 text-xs font-semibold ${emojiTab === 'emoji' ? 'text-brand-dark border-b-2 border-brand-dark' : 'text-gray-400'}`}
                >
                  Emoji
                </button>
                <button
                  onClick={() => setEmojiTab('badge')}
                  className={`flex-1 py-2 text-xs font-semibold ${emojiTab === 'badge' ? 'text-brand-dark border-b-2 border-brand-dark' : 'text-gray-400'}`}
                >
                  Odznaki
                </button>
              </div>
              {emojiTab === 'emoji' ? (
                <div className="p-3 grid grid-cols-8 gap-1 max-h-52 overflow-y-auto">
                  {STORY_EMOJI.map((e) => (
                    <button key={e} onClick={() => addSticker(e)} className="text-2xl p-1 rounded-lg hover:bg-gray-100 transition-colors">
                      {e}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-3 flex flex-wrap gap-2 max-h-52 overflow-y-auto">
                  {STORY_BADGES.map((b) => (
                    <button
                      key={b.label}
                      onClick={() => addBadge(b)}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white text-sm font-bold shadow hover:scale-105 transition-transform"
                      style={{ background: b.color }}
                    >
                      <span>{b.emoji}</span> {b.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Panel muzyki — biblioteka + własny plik */}
          {musicOpen && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => setMusicTab('library')}
                  className={`flex-1 py-2 text-xs font-semibold ${musicTab === 'library' ? 'text-brand-dark border-b-2 border-brand-dark' : 'text-gray-400'}`}
                >
                  Biblioteka
                </button>
                <button
                  onClick={() => setMusicTab('upload')}
                  className={`flex-1 py-2 text-xs font-semibold ${musicTab === 'upload' ? 'text-brand-dark border-b-2 border-brand-dark' : 'text-gray-400'}`}
                >
                  Własny plik
                </button>
              </div>
              {musicTab === 'library' ? (
                <div className="max-h-52 overflow-y-auto">
                  {STORY_TRACKS.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                      <button
                        onClick={() => togglePreview(t.url)}
                        className="w-8 h-8 rounded-full bg-brand-light text-brand-dark flex items-center justify-center shrink-0"
                        aria-label={previewUrl === t.url ? 'Zatrzymaj' : 'Odtwórz'}
                      >
                        {previewUrl === t.url ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                        <p className="text-[11px] text-gray-400">{t.mood}</p>
                      </div>
                      <button
                        onClick={() => pickTrack(t)}
                        className="px-3 py-1.5 rounded-full bg-brand-dark text-white text-xs font-semibold"
                      >
                        Wybierz
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center">
                  <button
                    onClick={() => audioFileRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-semibold"
                  >
                    <Upload className="w-4 h-4" /> Wgraj plik audio
                  </button>
                  <p className="text-[11px] text-gray-400 mt-2">mp3, wav, m4a — maks. 4,5 MB</p>
                </div>
              )}
            </div>
          )}

          {/* Szablony tekstowych relacji — gradientowe tła */}
          {mode === 'text' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm space-y-2.5">
              <p className="text-gray-500 text-xs font-medium">Szablon:</p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {STORY_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t)}
                    className={`flex-shrink-0 w-14 rounded-xl overflow-hidden border-2 transition-all ${
                      template?.id === t.id ? 'border-brand-dark scale-105 shadow-md' : 'border-transparent hover:border-gray-300'
                    }`}
                    aria-label={`Szablon ${t.name}`}
                  >
                    <div className="aspect-[9/16] w-full" style={{ background: `linear-gradient(160deg, ${t.from}, ${t.to})` }} />
                    <p className="text-[9px] font-semibold text-center py-0.5 bg-white text-gray-600">{t.name}</p>
                  </button>
                ))}
                <button
                  onClick={() => setTemplate(null)}
                  className={`flex-shrink-0 w-14 rounded-xl overflow-hidden border-2 transition-all ${
                    !template ? 'border-brand-dark scale-105 shadow-md' : 'border-transparent hover:border-gray-300'
                  }`}
                  aria-label="Własny kolor"
                >
                  <div className="aspect-[9/16] w-full flex items-center justify-center bg-gray-100 text-gray-400 text-lg">🎨</div>
                  <p className="text-[9px] font-semibold text-center py-0.5 bg-white text-gray-600">Własny</p>
                </button>
              </div>
              {!template && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs font-medium">Kolor:</span>
                  {STORY_BG.map((c) => (
                    <button
                      key={c}
                      onClick={() => setBgColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${bgColor === c ? 'ring-2 ring-gray-800 ring-offset-2 scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                      aria-label={`Kolor ${c}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Czas wyświetlania — zdjęcie/tekst do 15 s; film pokazuje wykrytą długość */}
          {mode === 'media' && media?.type === 'video' ? (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-600 flex-1">
                Film będzie wyświetlany przez{' '}
                <span className="font-semibold text-brand-dark">
                  {Math.round(Math.min(media.duration || MAX_VIDEO_DURATION_S, MAX_VIDEO_DURATION_S))} s
                </span>
                {' '}(maks. {MAX_VIDEO_DURATION_S} s)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-600 whitespace-nowrap">Czas:</span>
              <input
                type="range"
                min={3}
                max={MAX_IMAGE_DURATION_S}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-dark"
              />
              <span className="text-xs font-semibold text-brand-dark w-8 text-right">{duration} s</span>
            </div>
          )}

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
        </div>
      </div>

      {/* Pasek narzędzi — przyklejony na dole, nad paskiem menu, z safe-area */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-center gap-1.5 max-w-sm mx-auto">
          <button onClick={() => fileRef.current?.click()} className={toolBtn(mode === 'media')}>
            {media?.type === 'video' ? <Film className="w-5 h-5" /> : <ImagePlus className="w-5 h-5" />}
            {media ? (media.type === 'video' ? 'Film ✓' : 'Zdjęcie ✓') : 'Media'}
          </button>
          <button onClick={() => setMode('text')} className={toolBtn(mode === 'text')}>
            <Type className="w-5 h-5" />
            Tekst
          </button>
          <button onClick={addText} className={toolBtn(false)}>
            <span className="w-5 h-5 flex items-center justify-center text-base font-bold">Aa</span>
            Napis
          </button>
          <button onClick={() => { setEmojiOpen((v) => !v); setMusicOpen(false); }} className={toolBtn(emojiOpen)}>
            <Smile className="w-5 h-5" />
            Emoji
          </button>
          <button onClick={() => { setMusicOpen((v) => !v); setEmojiOpen(false); }} className={toolBtn(!!music || musicOpen)}>
            <Music className="w-5 h-5" />
            Muzyka
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          pickMedia(e.target.files?.[0]);
          e.target.value = '';
          setMode('media');
        }}
      />
      <input
        ref={audioFileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          pickAudio(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <audio ref={previewRef} loop onEnded={() => setPreviewUrl(null)} />
    </div>
    </Portal>
  );
}

// ---------- Pasek relacji ----------
export default function StoriesBar({ myId }: { myId: string }) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewer, setViewer] = useState<{ author: AuthorStories; index: number } | null>(null);

  const load = async () => {
    try {
      const res = await storiesApi.getAll();
      setStories(res.stories || []);
    } catch {
      setStories([]);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const authors = groupByAuthor(stories, myId);

  const openAuthor = (a: AuthorStories) => {
    const firstUnseen = a.stories.findIndex((s) => !s.seenByMe);
    setViewer({ author: a, index: firstUnseen === -1 ? 0 : firstUnseen });
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {/* Dodaj relację */}
        <button onClick={() => setComposerOpen(true)} className="flex flex-col items-center gap-1.5 flex-shrink-0 group">
          <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-gray-300 group-hover:border-brand-dark bg-white flex items-center justify-center transition-all">
            <Plus className="w-6 h-6 text-gray-400 group-hover:text-brand-dark transition-colors" />
          </div>
          <span className="text-[11px] font-medium text-gray-500 group-hover:text-brand-dark">Dodaj relację</span>
        </button>

        {authors.map((a) => {
          const thumb = a.stories[a.stories.length - 1];
          return (
            <button key={a.authorId} onClick={() => openAuthor(a)} className="flex flex-col items-center gap-1.5 flex-shrink-0 group">
              <div
                className={`w-16 h-16 rounded-full p-[3px] transition-transform group-hover:scale-105 ${
                  a.allSeen ? 'bg-gray-300' : 'bg-gradient-to-tr from-brand via-brand-dark to-emerald-400'
                }`}
              >
                <div className="w-full h-full rounded-full bg-white p-[2px]">
                  {thumb.image ? (
                    <img src={thumb.image} alt={a.authorName} className="w-full h-full rounded-full object-cover" />
                  ) : a.authorAvatar ? (
                    <img src={a.authorAvatar} alt={a.authorName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white font-semibold text-lg">
                      {(a.authorName[0] || 'U').toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[11px] font-medium text-gray-600 max-w-[68px] truncate">
                {a.authorId === myId ? 'Twoja relacja' : a.authorName.split(' ')[0]}
              </span>
            </button>
          );
        })}

        {loaded && authors.length === 0 && (
          <div className="flex items-center text-xs text-gray-400 pl-2">
            Dodaj pierwszą relację — zniknie po 24 h
          </div>
        )}
      </div>

      {composerOpen && (
        <StoryComposer
          onClose={() => setComposerOpen(false)}
          onCreated={() => {
            setComposerOpen(false);
            load();
          }}
        />
      )}

      {viewer && (
        <StoryViewer
          author={viewer.author}
          startIndex={viewer.index}
          myId={myId}
          onClose={() => setViewer(null)}
          onDeleted={() => {
            setViewer(null);
            load();
          }}
        />
      )}
    </>
  );
}
