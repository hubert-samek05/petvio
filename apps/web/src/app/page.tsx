'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const heroImages = [
    'https://t3.ftcdn.net/jpg/05/99/59/42/360_F_599594224_S3zcoRAsexBiPr7sgVBoi7BxubOznJ2n.jpg',
    'https://www.shutterstock.com/shutterstock/videos/1109391071/thumb/1.jpg',
    'https://media.istockphoto.com/id/1598514657/photo/dog-and-cat-together-under-broun-cozy-blanket.jpg?s=612x612&w=0&k=20&c=M9z0vLDFqVP-lUeZpgOLoAzU5wqWzItc_HgcZfded_o=',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT304d_uOlH5rBORXPPABVBAiL2RX-GteFyCl5oR_FdhaT8Bjms4PI-YF8&s=10'
  ];

  const mobileHeroImages = [
    'https://i.pinimg.com/736x/18/01/fb/1801fb6ad98e489d6b8caf1cfb24beb8.jpg',
    'https://www.shutterstock.com/shutterstock/videos/1109391071/thumb/1.jpg',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS84bTlxl9mFxre9CpawFNpdpic7qchdWwDMPXrF5Y1UJlnPMDU5uz19XM&s=10',
    'https://www.fgs.de/fileadmin/_processed_/1/f/csm_FGS_News_Hund_und_Katze_fdd306d3a3.jpeg'
  ];

  const currentImages = isMobile ? mobileHeroImages : heroImages;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % currentImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentImages]);

  // Carousel touch/swipe functionality
  useEffect(() => {
    const track = carouselRef.current;
    if (!track) return;

    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;
    let autoScrollPosition = 0;
    let animationFrameId: number;
    let isAutoScrolling = true;

    const autoScroll = () => {
      if (!isAutoScrolling || isDragging) {
        animationFrameId = requestAnimationFrame(autoScroll);
        return;
      }
      
      autoScrollPosition -= 0.5;
      
      // Get the track width
      const trackWidth = track.scrollWidth / 2; // Since we have duplicated content
      
      // Reset when we've scrolled past the first set
      if (Math.abs(autoScrollPosition) >= trackWidth) {
        autoScrollPosition = 0;
      }
      
      track.style.transform = `translateX(${autoScrollPosition}px)`;
      animationFrameId = requestAnimationFrame(autoScroll);
    };

    // Start auto-scroll
    animationFrameId = requestAnimationFrame(autoScroll);

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startX = (e as any).pageX;
      scrollLeft = autoScrollPosition;
      isAutoScrolling = false;
      track.classList.add('cursor-grabbing');
      track.classList.remove('cursor-grab');
    };

    const handleMouseLeave = () => {
      if (!isDragging) return;
      isDragging = false;
      isAutoScrolling = true;
      track.classList.remove('cursor-grabbing');
      track.classList.add('cursor-grab');
    };

    const handleMouseUp = () => {
      isDragging = false;
      isAutoScrolling = true;
      track.classList.remove('cursor-grabbing');
      track.classList.add('cursor-grab');
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = (e as any).pageX;
      const walk = (x - startX) * 2;
      autoScrollPosition = scrollLeft + walk;
      track.style.transform = `translateX(${autoScrollPosition}px)`;
    };

    // Touch events for mobile
    const handleTouchStart = (e: TouchEvent) => {
      isDragging = true;
      startX = e.touches[0].pageX;
      scrollLeft = autoScrollPosition;
      isAutoScrolling = false;
    };

    const handleTouchEnd = () => {
      isDragging = false;
      isAutoScrolling = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.touches[0].pageX;
      const walk = (x - startX) * 2;
      autoScrollPosition = scrollLeft + walk;
      track.style.transform = `translateX(${autoScrollPosition}px)`;
    };

    track.addEventListener('mousedown', handleMouseDown);
    track.addEventListener('mouseleave', handleMouseLeave);
    track.addEventListener('mouseup', handleMouseUp);
    track.addEventListener('mousemove', handleMouseMove);
    track.addEventListener('touchstart', handleTouchStart, { passive: false });
    track.addEventListener('touchend', handleTouchEnd);
    track.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      cancelAnimationFrame(animationFrameId);
      track.removeEventListener('mousedown', handleMouseDown);
      track.removeEventListener('mouseleave', handleMouseLeave);
      track.removeEventListener('mouseup', handleMouseUp);
      track.removeEventListener('mousemove', handleMouseMove);
      track.removeEventListener('touchstart', handleTouchStart);
      track.removeEventListener('touchend', handleTouchEnd);
      track.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Announcement Bar */}
      <div className="bg-brand-peach">
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-center gap-2 text-center">
          <svg className="w-4 h-4 text-brand-dark flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-xs md:text-sm text-brand-dark font-medium">
            Dołącz do Petvio i zadbaj o zdrowie swojego pupila. <Link href="/register" className="underline font-semibold">Załóż darmowe konto</Link>
          </p>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-1.5 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center">
            <Image 
              src="/logo.png" 
              alt="Petvio" 
              width={144} 
              height={144}
              className="object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600 font-medium">
            <a href="#funkcje" className="hover:text-brand-dark transition-colors">Funkcje</a>
            <a href="#jak-to-dziala" className="hover:text-brand-dark transition-colors">Jak to działa</a>
            <a href="#opinie" className="hover:text-brand-dark transition-colors">Opinie</a>
            <a href="#kontakt" className="hover:text-brand-dark transition-colors">Kontakt</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-brand-dark transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Zaloguj
            </Link>
            <Link href="/register" className="px-5 py-2.5 bg-brand-dark text-white text-sm font-semibold rounded-full hover:bg-brand transition-colors">
              Wypróbuj za darmo
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-14 md:py-24">
        <div className="absolute -top-24 -right-24 w-[30rem] h-[30rem] bg-brand-light rounded-full blur-3xl opacity-60"></div>
        <div className="max-w-7xl mx-auto px-6 relative grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-4 py-1.5 bg-brand-peach text-brand-dark text-xs font-semibold rounded-full mb-6 tracking-wide">
              APLIKACJA DLA WŁAŚCICIELI ZWIERZĄT
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal text-gray-900 leading-tight mb-6 max-w-xl text-balance">
              Kompleksowa opieka nad Twoim pupilem
            </h1>
            <p className="text-base md:text-lg text-gray-500 leading-relaxed max-w-xl mb-8">
              Zarządzaj zdrowiem, dietą i codzienną opieką swojego zwierzęcia w jednej, eleganckiej aplikacji. Od kalendarza szczepień po tracker spacerów.
            </p>

            <ul className="space-y-3 mb-10">
              {[
                'Cyfrowa książeczka zdrowia i szczepień',
                'Spersonalizowana dieta i kalkulator kalorii',
                'Wsparcie weterynarzy i behawiorystów na czacie',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-gray-700">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-light flex items-center justify-center">
                    <svg className="w-3 h-3 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                  <span className="text-sm md:text-base">{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-4 mb-10">
              <a
                href="#"
                className="inline-flex items-center gap-3 px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/15"
              >
                <svg className="w-7 h-7 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.55C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.75 1.96-.1.06-2.24 1.31-2.22 3.9.03 3.1 2.71 4.13 2.74 4.14-.02.07-.42 1.44-1.4 2.85M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <span className="text-left">
                  <span className="block text-[10px] leading-none text-gray-300">Pobierz w</span>
                  <span className="block text-base font-semibold leading-tight -mt-0.5">App Store</span>
                </span>
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-3 px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/15"
              >
                <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M3.6 2.6c-.3.3-.5.7-.5 1.2v16.4c0 .5.2.9.5 1.2l9-9.4-9-9.4z" fill="#00D8FF"/>
                  <path d="M16.5 12 3.6 2.6c.15-.15.33-.27.52-.35.4-.17.87-.14 1.28.1l10.36 5.98L16.5 12z" fill="#00F076"/>
                  <path d="M16.5 12l-.74 3.67-10.36 5.98c-.41.24-.88.27-1.28.1a1.7 1.7 0 01-.52-.35L16.5 12z" fill="#FF3A44"/>
                  <path d="M20.7 10.66c.7.4.7 1.4 0 1.8l-4.2 2.42-.74-3.67.74-.53 4.2-2.02z" fill="#FFCF00"/>
                </svg>
                <span className="text-left">
                  <span className="block text-[10px] leading-none text-gray-300">Dostępne w</span>
                  <span className="block text-base font-semibold leading-tight -mt-0.5">Google Play</span>
                </span>
              </a>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-3">
                {[
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
                  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80',
                  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80',
                ].map((src, i) => (
                  <div key={i} className="w-9 h-9 rounded-full overflow-hidden border-2 border-white relative">
                    <Image src={src} alt="Użytkownik" fill className="object-cover" />
                  </div>
                ))}
              </div>
              <div>
                <div className="flex text-amber-400 text-sm">★★★★★</div>
                <p className="text-xs text-gray-500">Ocena 4,9/5 od ponad 10 000 właścicieli</p>
              </div>
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="absolute top-8 -left-8 w-72 h-72 bg-brand-light rounded-full -z-10"></div>
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[4/5] max-w-md ml-auto">
              <Image
                src={currentImages[currentImageIndex]}
                alt="Właściciel ze zwierzęciem"
                fill
                className="object-cover transition-opacity duration-700"
              />
            </div>
            <div className="absolute -bottom-8 -left-10 w-44 bg-white rounded-3xl shadow-2xl border border-gray-100 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-gray-700">Zdrowie pupila</span>
                <span className="w-4 h-4 rounded-full bg-brand-light flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full w-4/5 bg-brand-dark rounded-full"></div>
                </div>
                <p className="text-[10px] text-gray-400">Szczepienia aktualne</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-20 px-6 bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <div className="text-center">
              <p className="font-serif text-4xl md:text-6xl font-normal text-brand-dark mb-2">10K+</p>
              <p className="text-gray-500 text-xs md:text-sm tracking-wide uppercase">Aktywnych użytkowników</p>
            </div>
            <div className="text-center">
              <p className="font-serif text-4xl md:text-6xl font-normal text-brand-dark mb-2">50K+</p>
              <p className="text-gray-500 text-xs md:text-sm tracking-wide uppercase">Zwierząt w systemie</p>
            </div>
            <div className="text-center">
              <p className="font-serif text-4xl md:text-6xl font-normal text-brand-dark mb-2">1M+</p>
              <p className="text-gray-500 text-xs md:text-sm tracking-wide uppercase">Zarejestrowanych aktywności</p>
            </div>
            <div className="text-center">
              <p className="font-serif text-4xl md:text-6xl font-normal text-brand-dark mb-2">4.9</p>
              <p className="text-gray-500 text-xs md:text-sm tracking-wide uppercase">Średnia ocena aplikacji</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funkcje" className="py-16 md:py-28 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="inline-block px-4 py-1.5 bg-brand-mint text-brand-dark text-xs font-semibold rounded-full mb-5 tracking-wide">
              CO ZNAJDZIESZ W PETVIO
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-normal text-gray-900 mb-6">
              Wszystko, czego potrzebujesz
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Kompleksowe narzędzia do zarządzania życiem Twojego pupila
            </p>
          </div>

          <div className="space-y-20 md:space-y-28">
            {[
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                ),
                title: 'Zdrowie',
                desc: 'Cyfrowa książeczka zdrowia, kalendarz szczepień, wizyty weterynaryjne i pełna dokumentacja medyczna zawsze pod ręką.',
                bullets: ['Kalendarz szczepień', 'Historia wizyt weterynaryjnych', 'Przypomnienia lekowe', 'Dokumentacja medyczna'],
                tags: ['Szczepienia', 'Wizyty', 'Leki'],
                image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=900&q=80',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zM9 12l2 2 4-4" />
                ),
                title: 'Dietetyka',
                desc: 'Inteligentny skaner karm, kalkulator kalorii i spersonalizowane plany żywieniowe dopasowane do potrzeb pupila.',
                bullets: ['Skaner karm', 'Kalkulator kalorii', 'Planer posiłków', 'Analiza składu'],
                tags: ['Skaner', 'Kalorie', 'Plany'],
                image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                ),
                title: 'Aktywność',
                desc: 'Tracker spacerów, analiza zachowań i profesjonalne porady treningowe, by Twój pupil zawsze był w formie.',
                bullets: ['Tracker spacerów', 'Analiza zachowań', 'Porady treningowe', 'Statystyki aktywności'],
                tags: ['Spacerów', 'Zachowań', 'Trening'],
                image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&q=80',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                ),
                title: 'Miejsca',
                desc: 'Interaktywna mapa miejsc przyjaznych zwierzętom, wyszukiwarka weterynarzy i opinie innych właścicieli.',
                bullets: ['Mapa parków', 'Wyszukiwarka weterynarzy', 'Opinie i recenzje', 'Hotele i petsitterzy'],
                tags: ['Parki', 'Weterynarze', 'Opinie'],
                image: 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=900&q=80',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                ),
                title: 'Organizacja',
                desc: 'Dziennik pupila, budżet domowy i inteligentna lista zakupów, które porządkują codzienną opiekę.',
                bullets: ['Dziennik aktywności', 'Budżet domowy', 'Lista zakupów', 'Kalendarz wydarzeń'],
                tags: ['Dziennik', 'Budżet', 'Zakupy'],
                image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                ),
                title: 'Społeczność',
                desc: 'Forum właścicieli, blog edukacyjny, adopcje zwierząt i system Pet Alert dla zwiększenia bezpieczeństwa.',
                bullets: ['Forum właścicieli', 'Blog edukacyjny', 'Adopcje zwierząt', 'System Pet Alert'],
                tags: ['Forum', 'Blog', 'Pet Alert'],
                image: 'https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&w=900&q=80',
              },
            ].map((f, i) => (
              <div key={f.title} className={`grid md:grid-cols-2 gap-10 md:gap-16 items-center ${i % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''}`}>
                <div className="relative">
                  <div className={`absolute w-40 h-40 bg-brand-mint rounded-full -z-10 ${i % 2 === 1 ? '-right-6 -bottom-6' : '-left-6 -bottom-6'}`}></div>
                  <div className="relative rounded-[2rem] overflow-hidden shadow-xl aspect-[4/3]">
                    <Image src={f.image} alt={f.title} fill className="object-cover" />
                  </div>
                </div>
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-brand-dark flex items-center justify-center mb-6">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      {f.icon}
                    </svg>
                  </div>
                  <h3 className="font-serif text-2xl md:text-3xl font-normal text-gray-900 mb-4">{f.title}</h3>
                  <p className="text-gray-500 leading-relaxed mb-6">{f.desc}</p>
                  <ul className="grid sm:grid-cols-2 gap-3 mb-6">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-light flex items-center justify-center">
                          <svg className="w-3 h-3 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    {f.tags.map((t) => (
                      <span key={t} className="px-3 py-1 bg-brand-light text-brand-dark text-xs font-medium rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link 
              href="/register"
              className="inline-block px-8 py-4 bg-brand-dark text-white rounded-full hover:bg-brand transition-colors duration-300 font-semibold"
            >
              Rozpocznij teraz
            </Link>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="jak-to-dziala" className="py-16 md:py-28 px-6 bg-brand-mint">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <span className="inline-block px-4 py-1.5 bg-white text-brand-dark text-xs font-semibold rounded-full mb-5 tracking-wide">
              PROSTY START
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-normal text-gray-900 mb-6">
              Jak to działa?
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Proces rozpoczęcia korzystania z Petvio zajmuje tylko kilka minut
            </p>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6">
            <div className="hidden lg:block absolute top-8 left-[10%] right-[10%] border-t-2 border-dashed border-brand-light"></div>
            {[
              { title: 'Zarejestruj się', desc: 'Utwórz darmowe konto w mniej niż minutę' },
              { title: 'Dodaj zwierzę', desc: 'Wprowadź podstawowe informacje o swoim pupilu' },
              { title: 'Skonfiguruj przypomnienia', desc: 'Ustaw przypomnienia o szczepieniach i lekach' },
              { title: 'Zacznij śledzić', desc: 'Rozpocznij śledzenie spacerów i aktywności' },
              { title: 'Korzystaj z funkcji', desc: 'Odkryj wszystkie funkcje Petvio' },
            ].map((step, i) => (
              <div key={step.title} className="relative pv-card-hover p-6">
                <div className="relative z-10 w-16 h-16 bg-brand-dark rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-brand-dark/20">
                  <span className="font-serif text-white text-2xl">{i + 1}</span>
                </div>
                <h3 className="font-serif text-lg font-normal text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="opinie" className="py-16 md:py-24 px-6 bg-brand-cream">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-brand-peach text-brand-dark text-xs font-semibold rounded-full mb-5 tracking-wide">
              OPINIE UŻYTKOWNIKÓW
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-normal text-gray-900 mb-6">
              Zaufali nam
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Zobacz, co mówią właściciele zwierząt korzystający z Petvio
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Anna Kowalska',
                pet: 'Właścicielka Rexa',
                photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
                quote: 'Dzięki Petvio nigdy nie zapominam o szczepieniach. Aplikacja jest przejrzysta i naprawdę ładna - w końcu coś, co chce się otwierać codziennie.',
              },
              {
                name: 'Marek Nowicki',
                pet: 'Opiekun Filemona',
                photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
                quote: 'Kalkulator kalorii i skaner karm to strzał w dziesiątkę. Mój kot ma teraz idealnie dobraną dietę, a ja pełną kontrolę nad budżetem.',
              },
              {
                name: 'Julia Wiśniewska',
                pet: 'Mama Bruna i Mili',
                photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
                quote: 'Kontakt z weterynarzem na czacie uratował nam niejedną nerwową noc. Polecam każdemu, kto poważnie traktuje zdrowie swojego pupila.',
              },
            ].map((t) => (
              <div key={t.name} className="pv-card p-8">
                <div className="flex text-amber-400 text-sm mb-4">★★★★★</div>
                <p className="text-gray-600 leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden relative flex-shrink-0">
                    <Image src={t.photo} alt={t.name} fill className="object-cover" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-gray-400 text-xs">{t.pet}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="kontakt" className="py-24 md:py-32 px-6 bg-gradient-to-br from-brand-dark via-[#123f30] to-brand-dark relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTAgMjBoNDB2Mkgwdi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-peach/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="font-serif text-4xl md:text-6xl font-normal text-white mb-6">
            Rozpocznij lepszą opiekę już dziś
          </h2>
          <p className="text-xl text-brand-light/80 mb-12 max-w-2xl mx-auto leading-relaxed">
            Dołącz do tysięcy właścicieli zwierząt, którzy już korzystają z Petvio
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link 
              href="/register"
              className="px-10 py-4 bg-white text-brand-dark rounded-full font-semibold hover:bg-brand-cream transition-all duration-300 shadow-xl hover:-translate-y-1"
            >
              Załóż darmowe konto
            </Link>
            <a 
              href="#funkcje"
              className="px-10 py-4 bg-white/10 backdrop-blur-sm text-white rounded-full font-semibold hover:bg-white/20 transition-all duration-300 border border-white/20 hover:border-white/30"
            >
              Dowiedz się więcej
            </a>
          </div>
          
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-brand-light/70">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-brand-peach rounded-full"></span>
              Bez karty kredytowej
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-brand-peach rounded-full"></span>
              14 dni za darmo
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-brand-peach rounded-full"></span>
              Anuluj w dowolnym momencie
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-10 mb-12">
            <div className="md:col-span-2">
              <Link href="/" className="inline-flex items-center gap-2 mb-4">
                <Image src="/logo.png" alt="Petvio" width={40} height={40} />
                <span className="font-serif text-xl text-brand-dark">Petvio</span>
              </Link>
              <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                Kompleksowa aplikacja dla właścicieli zwierząt - zdrowie, dieta i codzienna opieka w jednym miejscu.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-4">Produkt</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><a href="#funkcje" className="hover:text-brand-dark transition-colors">Funkcje</a></li>
                <li><a href="#jak-to-dziala" className="hover:text-brand-dark transition-colors">Jak to działa</a></li>
                <li><a href="#opinie" className="hover:text-brand-dark transition-colors">Opinie</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-4">Firma</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><a href="#" className="hover:text-brand-dark transition-colors">O nas</a></li>
                <li><a href="#" className="hover:text-brand-dark transition-colors">Blog</a></li>
                <li><a href="#kontakt" className="hover:text-brand-dark transition-colors">Kontakt</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-4">Konto</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><Link href="/login" className="hover:text-brand-dark transition-colors">Zaloguj się</Link></li>
                <li><Link href="/register" className="hover:text-brand-dark transition-colors">Załóż konto</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">© 2026 Petvio. Wszystkie prawa zastrzeżone.</p>
            <div className="flex items-center gap-5 text-gray-400">
              <Link href="/polityka-prywatnosci" className="hover:text-brand-dark transition-colors text-sm">Polityka prywatności</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
