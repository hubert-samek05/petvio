/** Porównania dat typu DATE ('YYYY-MM-DD') w strefie lokalnej — bez przesunięć UTC. */

export const todayStr = (): string => new Date().toLocaleDateString('en-CA');

export const parseLocalDate = (d: string): Date => {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return new Date(y || 1970, (m || 1) - 1, day || 1);
};

/** Termin już minął (data wcześniejsza niż dziś). */
export const isDateOverdue = (d?: string | null): boolean =>
  !!d && d.slice(0, 10) < todayStr();

/** Termin dziś lub w przyszłości. */
export const isDateUpcoming = (d?: string | null): boolean =>
  !!d && d.slice(0, 10) >= todayStr();

/** Ile dni do daty (dziś = 0, wczoraj = -1). */
export const daysUntilDate = (d: string): number =>
  Math.round((parseLocalDate(d).getTime() - parseLocalDate(todayStr()).getTime()) / (24 * 3600 * 1000));
