'use client';

import { useRef, useState } from 'react';
import { ChevronDown, Clapperboard, Footprints, Globe, ImagePlus, Loader2, Lock, MapPin, Music, Palette, Send, Smile, Users, X } from 'lucide-react';
import { Avatar, ComposerPayload, FEELINGS, POST_BACKGROUNDS, PostMusic, WalkShare, downscaleImage } from './shared';
import WalkMap from './WalkMap';
import WalkPicker from './WalkPicker';

const MAX_IMAGES = 4;
const MAX_VIDEO_MB = 5;

export default function PostComposer({
  user,
  placeholder = 'Co słychać u Twojego pupila?',
  submitLabel = 'Opublikuj',
  initialContent = '',
  initialImages = [],
  initialMusic = null,
  initialFeeling = null,
  initialLocation = '',
  initialBackground = null,
  onSubmit,
  onCancel,
  bare = false,
  attachments = true,
  showVisibility = false,
  pageId = null,
}: {
  user: { firstName?: string; avatarUrl?: string | null } | null;
  placeholder?: string;
  submitLabel?: string;
  initialContent?: string;
  initialImages?: string[];
  initialMusic?: PostMusic | null;
  initialFeeling?: string | null;
  initialLocation?: string;
  initialBackground?: string | null;
  onSubmit: (payload: ComposerPayload) => Promise<boolean | void>;
  onCancel?: () => void;
  bare?: boolean;
  attachments?: boolean;
  showVisibility?: boolean;
  pageId?: number | null;
}) {
  const [content, setContent] = useState(initialContent);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'only_me'>('public');
  const [images, setImages] = useState<string[]>(initialImages);
  const [video, setVideo] = useState<string | null>(null);
  const [music, setMusic] = useState<PostMusic | null>(initialMusic);
  const [musicDraft, setMusicDraft] = useState<PostMusic>({ title: '', artist: '', url: '' });
  const [musicOpen, setMusicOpen] = useState(false);
  const [walk, setWalk] = useState<WalkShare | null>(null);
  const [walkPickerOpen, setWalkPickerOpen] = useState(false);
  const [feeling, setFeeling] = useState<string | null>(initialFeeling);
  const [location, setLocation] = useState(initialLocation);
  const [background, setBackground] = useState<string | null>(initialBackground);
  const [feelingOpen, setFeelingOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const addImages = async (files: FileList | null) => {
    if (!files) return;
    const room = MAX_IMAGES - images.length;
    for (const file of Array.from(files).slice(0, room)) {
      try {
        const url = await downscaleImage(file);
        setImages((l) => (l.length < MAX_IMAGES ? [...l, url] : l));
      } catch {
        setError('Nie udało się wczytać jednego ze zdjęć.');
      }
    }
  };

  const addVideo = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`Rolka może mieć maks. ${MAX_VIDEO_MB} MB — skróć filmik lub zmniejsz jakość.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setVideo(reader.result as string);
      setError('');
    };
    reader.onerror = () => setError('Nie udało się wczytać filmiku.');
    reader.readAsDataURL(file);
  };

  const hasAttachment = images.length > 0 || !!video || !!music || !!walk;

  const submit = async () => {
    if ((!content.trim() && !hasAttachment) || busy) return;
    setBusy(true);
    setError('');
    try {
      const ok = await onSubmit({
        content: content.trim(),
        images,
        video,
        music,
        walkId: walk ? Number(walk.id) : null,
        visibility,
        pageId,
        feeling,
        location: location.trim() || null,
        background: hasAttachment ? null : background,
      });
      if (ok !== false) {
        setContent('');
        setImages([]);
        setVideo(null);
        setMusic(null);
        setMusicDraft({ title: '', artist: '', url: '' });
        setWalk(null);
        setFeeling(null);
        setLocation('');
        setBackground(null);
        setFeelingOpen(false);
        setLocationOpen(false);
      }
    } catch {
      setError('Nie udało się zapisać. Spróbuj ponownie.');
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <>
      <div className="flex gap-3">
        <Avatar name={user?.firstName || 'U'} url={user?.avatarUrl} />
        <div className="flex-1 min-w-0 space-y-2">
          {background && !hasAttachment ? (
            <div
              className="rounded-2xl p-6 min-h-[140px] flex items-center justify-center"
              style={{ background: POST_BACKGROUNDS.find((b) => b.id === background)?.gradient }}
            >
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                rows={3}
                className="w-full bg-transparent text-center text-white text-lg sm:text-xl font-semibold placeholder-white/70 focus:outline-none resize-none"
              />
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              rows={content.length > 120 ? 4 : 2}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:border-brand-dark focus:ring-4 focus:ring-brand/10 resize-none text-gray-800"
            />
          )}
          {(feeling || location.trim()) && (
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-600">
              {feeling && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-medium text-xs">
                  <Smile className="w-3.5 h-3.5" /> {feeling}
                  <button onClick={() => setFeeling(null)} className="ml-0.5 hover:text-amber-900" aria-label="Usuń aktywność"><X className="w-3 h-3" /></button>
                </span>
              )}
              {location.trim() && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 font-medium text-xs">
                  <MapPin className="w-3.5 h-3.5" /> {location.trim()}
                  <button onClick={() => setLocation('')} className="ml-0.5 hover:text-sky-900" aria-label="Usuń lokalizację"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Panel aktywności */}
      {feelingOpen && (
        <div className="pl-12 sm:pl-[52px]">
          <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Jak się czujesz / co robisz?</p>
            <div className="flex flex-wrap gap-1.5">
              {FEELINGS.map((f) => (
                <button
                  key={f}
                  onClick={() => { setFeeling(f); setFeelingOpen(false); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    feeling === f ? 'bg-amber-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Panel lokalizacji */}
      {locationOpen && (
        <div className="pl-12 sm:pl-[52px]">
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-gray-50 border border-gray-100">
            <MapPin className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Gdzie jesteś? (np. Warszawa, Park Skaryszewski)"
              maxLength={120}
              autoFocus
              className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark text-sm bg-white"
            />
            <button
              onClick={() => setLocationOpen(false)}
              className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-100 flex-shrink-0"
            >
              Gotowe
            </button>
          </div>
        </div>
      )}

      {/* Wybór tła — tylko dla postów tekstowych */}
      {!hasAttachment && (
        <div className="pl-12 sm:pl-[52px] flex items-center gap-1.5 flex-wrap">
          <Palette className="w-4 h-4 text-gray-400" />
          <button
            onClick={() => setBackground(null)}
            title="Brak tła"
            className={`w-7 h-7 rounded-lg border-2 transition-all ${!background ? 'border-brand-dark scale-110' : 'border-gray-200 bg-white'}`}
          />
          {POST_BACKGROUNDS.map((b) => (
            <button
              key={b.id}
              onClick={() => setBackground(b.id)}
              title={b.label}
              className={`w-7 h-7 rounded-lg border-2 transition-all ${background === b.id ? 'border-brand-dark scale-110' : 'border-transparent'}`}
              style={{ background: b.gradient }}
            />
          ))}
        </div>
      )}

      {/* Podgląd zdjęć */}
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap pl-12 sm:pl-[52px]">
          {images.map((img, i) => (
            <div key={i} className="relative">
              <img src={img} alt="" className="w-20 h-20 rounded-2xl object-cover border border-gray-200" />
              <button
                onClick={() => setImages((l) => l.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gray-900/80 text-white flex items-center justify-center hover:bg-gray-900"
                aria-label="Usuń zdjęcie"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Podgląd rolki */}
      {video && (
        <div className="pl-12 sm:pl-[52px]">
          <div className="relative inline-block">
            <video src={video} className="max-h-56 rounded-2xl border border-gray-200 bg-black" controls />
            <button
              onClick={() => setVideo(null)}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gray-900/80 text-white flex items-center justify-center hover:bg-gray-900"
              aria-label="Usuń rolkę"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Podgląd muzyki */}
      {music && (
        <div className="pl-12 sm:pl-[52px]">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-brand-mint/50 border border-brand/20 max-w-md">
            <Music className="w-5 h-5 text-brand-dark flex-shrink-0" />
            <span className="flex-1 min-w-0 text-sm font-semibold text-gray-900 truncate">
              {music.artist}{music.artist && music.title ? ' — ' : ''}{music.title}
            </span>
            <button
              onClick={() => setMusic(null)}
              className="p-1 rounded-lg text-gray-400 hover:text-red-600 flex-shrink-0"
              aria-label="Usuń muzykę"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Podgląd spaceru */}
      {walk && (
        <div className="pl-12 sm:pl-[52px]">
          <div className="relative max-w-md">
            <WalkMap walk={walk} compact />
            <button
              onClick={() => setWalk(null)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-gray-900/70 text-white flex items-center justify-center hover:bg-gray-900"
              aria-label="Usuń spacer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Panel dodawania muzyki */}
      {musicOpen && !music && (
        <div className="pl-12 sm:pl-[52px] space-y-2 p-4 rounded-2xl bg-gray-50 border border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Czego słuchasz?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={musicDraft.artist}
              onChange={(e) => setMusicDraft({ ...musicDraft, artist: e.target.value })}
              placeholder="Wykonawca"
              maxLength={120}
              className="px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark text-sm"
            />
            <input
              type="text"
              value={musicDraft.title}
              onChange={(e) => setMusicDraft({ ...musicDraft, title: e.target.value })}
              placeholder="Tytuł utworu"
              maxLength={120}
              className="px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark text-sm"
            />
          </div>
          <input
            type="url"
            value={musicDraft.url}
            onChange={(e) => setMusicDraft({ ...musicDraft, url: e.target.value })}
            placeholder="Link (YouTube / Spotify) — opcjonalnie"
            maxLength={500}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!musicDraft.title.trim() && !musicDraft.artist.trim()) return;
                setMusic({ title: musicDraft.title.trim(), artist: musicDraft.artist.trim(), url: musicDraft.url?.trim() });
                setMusicOpen(false);
              }}
              disabled={!musicDraft.title.trim() && !musicDraft.artist.trim()}
              className="px-4 py-2 rounded-xl pv-btn-primary text-xs disabled:opacity-50"
            >
              Dodaj muzykę
            </button>
            <button
              onClick={() => setMusicOpen(false)}
              className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-100"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 pl-12 sm:pl-[52px]">{error}</p>}

      <div className="flex items-center gap-1 sm:gap-2 pl-12 sm:pl-[52px] flex-wrap">
        {attachments && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={images.length >= MAX_IMAGES || !!video}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-brand-mint/60 hover:text-brand-dark disabled:opacity-40 transition-all"
            >
              <ImagePlus className="w-5 h-5 text-brand-dark" />
              <span className="hidden sm:inline">Zdjęcie{images.length > 0 ? ` (${images.length}/${MAX_IMAGES})` : ''}</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addImages(e.target.files);
                e.target.value = '';
              }}
            />

            <button
              onClick={() => videoRef.current?.click()}
              disabled={!!video || images.length > 0}
              title="Dodaj rolkę (max 5 MB)"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-brand-mint/60 hover:text-brand-dark disabled:opacity-40 transition-all"
            >
              <Clapperboard className="w-5 h-5 text-violet-500" />
              <span className="hidden sm:inline">Rolka</span>
            </button>
            <input
              ref={videoRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                addVideo(e.target.files?.[0]);
                e.target.value = '';
              }}
            />

            <button
              onClick={() => setMusicOpen((v) => !v)}
              disabled={!!music}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-brand-mint/60 hover:text-brand-dark disabled:opacity-40 transition-all"
            >
              <Music className="w-5 h-5 text-amber-500" />
              <span className="hidden sm:inline">Muzyka</span>
            </button>

            <button
              onClick={() => setWalkPickerOpen(true)}
              disabled={!!walk}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-brand-mint/60 hover:text-brand-dark disabled:opacity-40 transition-all"
            >
              <Footprints className="w-5 h-5 text-emerald-600" />
              <span className="hidden sm:inline">Spacer</span>
            </button>
          </>
        )}

        <button
          onClick={() => { setFeelingOpen((v) => !v); setLocationOpen(false); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            feeling || feelingOpen ? 'bg-amber-50 text-amber-700' : 'text-gray-500 hover:bg-brand-mint/60 hover:text-brand-dark'
          }`}
        >
          <Smile className="w-5 h-5 text-amber-500" />
          <span className="hidden sm:inline">Aktywność</span>
        </button>

        <button
          onClick={() => { setLocationOpen((v) => !v); setFeelingOpen(false); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            location.trim() || locationOpen ? 'bg-sky-50 text-sky-700' : 'text-gray-500 hover:bg-brand-mint/60 hover:text-brand-dark'
          }`}
        >
          <MapPin className="w-5 h-5 text-sky-500" />
          <span className="hidden sm:inline">Miejsce</span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          {showVisibility && (
            <div className="relative">
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                title="Kto widzi ten post"
                className="appearance-none pl-8 pr-7 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 focus:outline-none focus:border-brand-dark cursor-pointer"
              >
                <option value="public">Publiczne</option>
                <option value="friends">Znajomi</option>
                <option value="only_me">Tylko ja</option>
              </select>
              {visibility === 'public' && <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />}
              {visibility === 'friends' && <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />}
              {visibility === 'only_me' && <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />}
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-all"
            >
              Anuluj
            </button>
          )}
          <button
            onClick={submit}
            disabled={(!content.trim() && !hasAttachment) || busy}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full pv-btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitLabel}
          </button>
        </div>
      </div>

      {walkPickerOpen && (
        <WalkPicker
          onClose={() => setWalkPickerOpen(false)}
          onPick={(w) => {
            setWalk(w);
            setWalkPickerOpen(false);
          }}
        />
      )}
    </>
  );

  if (bare) return <div className="space-y-3">{body}</div>;
  return <div className="pv-card pv-feed-card p-4 sm:p-5 space-y-3">{body}</div>;
}
