'use client';

import { useState } from 'react';
import { Music, ExternalLink, Play } from 'lucide-react';
import { PostMusic } from './shared';

// Zamienia link YT/Spotify na URL embedowalny; null = bez embedu
const embedUrl = (url?: string): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v') || u.pathname.match(/\/shorts\/([\w-]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (u.hostname === 'open.spotify.com') {
      const m = u.pathname.match(/^\/(track|album|playlist|episode|show)\/([\w]+)/);
      return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0` : null;
    }
  } catch {}
  return null;
};

export default function MusicCard({ music }: { music: PostMusic }) {
  const [showEmbed, setShowEmbed] = useState(false);
  const embed = embedUrl(music.url);

  return (
    <div className="rounded-2xl border border-brand/20 bg-gradient-to-r from-brand-mint/50 to-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="w-10 h-10 rounded-xl bg-brand-dark flex items-center justify-center flex-shrink-0">
          <Music className="w-5 h-5 text-white" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-brand-dark font-semibold">Słucha teraz</p>
          <p className="font-semibold text-gray-900 text-sm truncate">
            {music.artist}{music.artist && music.title ? ' — ' : ''}{music.title}
          </p>
        </div>
        {embed && (
          <button
            onClick={() => setShowEmbed((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-brand/30 text-brand-dark text-xs font-medium hover:bg-brand-mint/50 transition-all flex-shrink-0"
          >
            <Play className="w-3.5 h-3.5" /> {showEmbed ? 'Ukryj' : 'Odtwórz'}
          </button>
        )}
        {music.url && (
          <a
            href={music.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-gray-400 hover:text-brand-dark hover:bg-white transition-all flex-shrink-0"
            aria-label="Otwórz link"
            title="Otwórz link"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
      {showEmbed && embed && (
        <div className="border-t border-brand/10">
          <iframe
            src={embed}
            className="w-full"
            height={embed.includes('spotify') ? 152 : 280}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Odtwarzacz muzyki"
          />
        </div>
      )}
    </div>
  );
}
