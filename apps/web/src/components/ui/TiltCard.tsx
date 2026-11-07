'use client';

import { useRef, type ReactNode, type MouseEvent } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  /** maksymalny kąt pochylenia w stopniach */
  max?: number;
  /** wyłącz tilt (np. dla mobile) */
  disabled?: boolean;
};

/**
 * Karta z efektem 3D tilt za kursorem.
 * Automatycznie wyłącza się na urządzeniach dotykowych i przy prefers-reduced-motion.
 */
export default function TiltCard({ children, className = '', max = 6, disabled = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const isTouch = () =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(hover: none)').matches || 'ontouchstart' in window);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    if (disabled || isTouch()) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateY(-2px)`;
    el.style.transition = 'transform 0.06s linear';
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)';
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)';
  };

  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave} className={`will-change-transform ${className}`}>
      {children}
    </div>
  );
}
