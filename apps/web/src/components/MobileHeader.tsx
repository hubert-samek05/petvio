'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function MobileHeader() {
  const [dateString, setDateString] = useState<string>('');
  const [dayString, setDayString] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    setDayString(now.toLocaleDateString('pl-PL', { weekday: 'long' }));
    setDateString(now.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }));
  }, []);

  return (
    <div className="lg:hidden sticky top-0 z-40 h-16 flex items-center justify-between bg-brand-dark px-4 shadow-sm">
      <Link href="/dashboard" className="flex items-center">
        <Image
          src="/logopetvio2.png"
          alt="Petvio"
          width={924}
          height={514}
          className="h-10 w-auto"
          priority
        />
      </Link>

      <div className="text-right text-white/95 leading-tight">
        <p className="text-sm font-semibold capitalize">{dayString}</p>
        <p className="text-xs opacity-90">{dateString}</p>
      </div>
    </div>
  );
}
