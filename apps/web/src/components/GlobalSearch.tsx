'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { searchSections } from '@/lib/sections';

export default function GlobalSearch() {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const results = searchSections(term);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setTerm('');
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      go(results[active].href);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative hidden sm:block flex-1 max-w-md">
      <div className="flex items-center gap-2.5 bg-white border border-gray-200/80 rounded-full px-4 py-2.5 text-sm text-gray-400 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10 transition-all">
        <Search className="w-4 h-4 flex-shrink-0" />
        <input
          type="text"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Szukaj w Petvio..."
          aria-label="Szukaj w Petvio"
          className="w-full bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
        />
      </div>
      {open && term.trim() && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">Brak wyników dla „{term.trim()}”</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.href}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r.href)}
                className={`w-full text-left px-4 py-2.5 text-sm text-gray-700 ${i === active ? 'bg-brand-mint text-brand-dark' : 'hover:bg-gray-50'}`}
              >
                {r.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
