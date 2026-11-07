// Lista potencjalnie toksycznych / szkodliwych składników dla psów i kotów.
// Używana do ostrzeżeń w przepisach — heurystyka tekstowa, nie porada weterynaryjna.

const DOG_TOXIC = [
  'czekolada', 'chocolate', 'kakao', 'cocoa',
  'cebula', 'onion', 'czosnek', 'garlic', 'por', 'leek', 'szczypiorek', 'chive',
  'winogron', 'grape', 'rodzynk', 'raisin', 'sułtan',
  'ksylitol', 'xylitol', 'słodzik',
  'alkohol', 'alcohol', 'piwo', 'wino',
  'kofeina', 'caffeine', 'kawa', 'coffee', 'herbata czarna',
  'awokado', 'avocado',
  'makadamia', 'macadamia',
  'gałka muszkatołowa', 'nutmeg',
  'kości ugotowane', 'kość ugotowana', 'gotowane kości',
  'ciasto drożdżowe', 'drożdże surowe',
  'szczaw',
];

const CAT_TOXIC = [
  ...DOG_TOXIC,
  'mleko', 'nabiał', 'ser żółty',
  'surowe jaja', 'surowe jajko', 'surowa ryba',
  'tuńczyk',
  'lilia', 'lilie',
];

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Odmiana polska — „czekolada" musi łapać też „czekolady"/„czekoladę".
const ENDINGS = ['ami', 'ach', 'em', 'ow', 'om', 'y', 'i', 'e', 'a', 'u', 'o'];
const stem = (w: string) => {
  if (w.length <= 4) return w;
  for (const e of ENDINGS) {
    if (w.endsWith(e) && w.length - e.length >= 3) return w.slice(0, -e.length);
  }
  return w;
};
const stemmed = (s: string) =>
  normalize(s).split(/[^a-z0-9]+/).filter(Boolean).map(stem).join(' ');

/**
 * Zwraca listę wykrytych toksycznych fraz w tekście składników.
 * Dopasowanie po stemach całych słów — bez fałszywych trafień („porcja" ≠ „por").
 * species: 'dog' | 'cat' | 'both'
 */
export function checkToxicIngredients(ingredients: string | null | undefined, species: string): string[] {
  if (!ingredients) return [];
  const text = ` ${stemmed(ingredients)} `;
  const list =
    species === 'cat' ? CAT_TOXIC : species === 'dog' ? DOG_TOXIC : Array.from(new Set(DOG_TOXIC.concat(CAT_TOXIC)));
  const found = list.filter((term) => {
    const t = stemmed(term);
    return t && text.includes(` ${t} `);
  });
  // Dedup polskie/angielskie duplikaty — zwracaj unikalne dopasowania w oryginalnej formie.
  return Array.from(new Set(found));
}

/** Krótki tekst kto jest zagrożony, wg species przepisu. */
export function toxicTargetLabel(species: string): string {
  return species === 'cat' ? 'kotów' : species === 'dog' ? 'psów' : 'zwierząt';
}
