'use client';

import { useEffect, useState } from 'react';
import { Clapperboard, X } from 'lucide-react';
import { postsApi } from '@/lib/api';
import { Avatar, SocialPost, getTimeAgo } from './shared';

export default function ReelsRail({ myId }: { myId: string }) {
  const [reels, setReels] = useState<SocialPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState<SocialPost | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await postsApi.getPosts({ type: 'reel' });
        setReels((res.posts || []).slice(0, 12));
      } catch {
        setReels([]);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (playing) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [playing]);

  if (!loaded || reels.length === 0) return null;

  return (
    <>
      <div className="pv-card p-4 sm:p-5">
        <h3 className="pv-section-title mb-3 flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-violet-500" /> Rolki
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {reels.map((r) => (
            <button
              key={r.id}
              onClick={() => setPlaying(r)}
              className="relative w-28 sm:w-32 aspect-[9/16] rounded-2xl overflow-hidden bg-gray-900 flex-shrink-0 group"
            >
              <video src={r.video!} preload="metadata" muted playsInline className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
              <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                <Clapperboard className="w-3.5 h-3.5 text-white" />
              </span>
              <div className="absolute bottom-2 inset-x-2 text-left">
                <p className="text-white text-[11px] font-semibold truncate">{r.authorName}</p>
                <p className="text-white/70 text-[10px]">{getTimeAgo(r.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Odtwarzacz rolki */}
      {playing && (
        <div
          className="fixed inset-0 z-50 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPlaying(null)}
        >
          <div
            className="relative w-full max-w-sm max-h-[88vh] bg-black rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 inset-x-3 z-20 flex items-center gap-2.5">
              <Avatar name={playing.authorName} url={playing.authorAvatar} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate drop-shadow">{playing.authorName}</p>
                <p className="text-white/70 text-xs">{getTimeAgo(playing.createdAt)}</p>
              </div>
              <button
                onClick={() => setPlaying(null)}
                className="p-2 rounded-full bg-black/30 text-white/80 hover:bg-black/50"
                aria-label="Zamknij"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <video src={playing.video!} controls autoPlay playsInline className="w-full max-h-[88vh]" />
            {playing.content && (
              <p className="absolute bottom-0 inset-x-0 p-4 pt-10 text-white text-sm bg-gradient-to-t from-black/80 to-transparent whitespace-pre-wrap break-words">
                {playing.content}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
