const { query } = require('../config/database');
const { getActiveSportDietForPet } = require('../utils/sport-diet.utils');

const BREED_FACTORS = {
  dog: {
    'mieszaniec': 1.0,
    'owczarek niemiecki': 0.95,
    'labrador retriever': 0.95,
    'golden retriever': 0.95,
    'bulldog angielski': 0.85,
    'french bulldog': 0.85,
    'beagle': 1.0,
    'yorkshire terrier': 1.15,
    'chihuahua': 1.2,
    'maltese': 1.15,
    'shih tzu': 1.1,
    'jack russell terrier': 1.15,
    'dachshund': 1.0,
    'rottweiler': 0.9,
    'doberman': 1.0,
    'boxer': 1.0,
    'husky': 1.2,
    'border collie': 1.2,
    'cocker spaniel': 1.0,
    'poodle': 1.1,
    'schnauzer': 1.05,
    'shiba inu': 1.1,
    'great dane': 0.9,
    'berneński pies pasterski': 0.9,
    'mops': 0.85,
    'inna': 1.0,
  },
  cat: {
    'mieszaniec': 1.0,
    'dachowiec': 1.0,
    'europejski krótkowłosy': 1.0,
    'maine coon': 1.1,
    'ragdoll': 1.05,
    'brytyjski krótkowłosy': 1.0,
    'syjamski': 1.15,
    'sfinks': 1.2,
    'perski': 0.95,
    'bengalski': 1.1,
    'norweski leśny': 1.1,
    'rosyjski niebieski': 1.0,
    'inna': 1.0,
  },
};

const ACTIVITY_FACTORS = {
  dog: {
    'sedentary': 1.0,
    'low': 1.1,
    'moderate': 1.2,
    'active': 1.4,
    'very_active': 1.6,
    'working': 2.0,
  },
  cat: {
    'sedentary': 1.0,
    'low': 1.05,
    'moderate': 1.1,
    'active': 1.3,
    'very_active': 1.5,
  },
};

const LIFE_STAGE_FACTORS = {
  dog: {
    'puppy_under_4mo': 3.0,
    'puppy_4_12mo': 2.0,
    'adult': 1.3,
    'senior': 1.0,
    'pregnant': 1.8,
    'lactating': 4.0,
  },
  cat: {
    'kitten_under_4mo': 2.5,
    'kitten_4_12mo': 2.0,
    'adult': 1.2,
    'senior': 1.0,
    'pregnant': 1.6,
    'lactating': 3.0,
  },
};

const BODY_CONDITION_FACTORS = {
  'very_underweight': 1.3,
  'underweight': 1.15,
  'ideal': 1.0,
  'overweight': 0.85,
  'obese': 0.7,
};

const GOAL_FACTORS = {
  'lose': 0.85,
  'maintain': 1.0,
  'gain': 1.15,
};

const MACROS = {
  dog: { protein: 0.25, fat: 0.15, carbs: 0.45 },
  cat: { protein: 0.30, fat: 0.20, carbs: 0.35 },
};

function normalizeString(str) {
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getBreedFactor(species, breed) {
  const map = BREED_FACTORS[species] || BREED_FACTORS.dog;
  if (!breed) return 1.0;
  const normalized = normalizeString(breed);
  if (map[normalized] !== undefined) return map[normalized];
  // Fallback to partial match
  for (const [key, value] of Object.entries(map)) {
    if (normalized.includes(key) || key.includes(normalized)) return value;
  }
  return 1.0;
}

function monthsBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

function inferLifeStage(species, ageMonths) {
  if (species === 'cat') {
    if (ageMonths < 4) return 'kitten_under_4mo';
    if (ageMonths < 12) return 'kitten_4_12mo';
    if (ageMonths >= 132) return 'senior';
    return 'adult';
  }
  if (ageMonths < 4) return 'puppy_under_4mo';
  if (ageMonths < 12) return 'puppy_4_12mo';
  if (ageMonths >= 84) return 'senior';
  return 'adult';
}

function getBreedOptions(species) {
  const map = BREED_FACTORS[species] || BREED_FACTORS.dog;
  return Object.keys(map).map((key) => ({
    value: key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
  }));
}

async function getBreeds(req, res) {
  try {
    res.json({
      dog: getBreedOptions('dog'),
      cat: getBreedOptions('cat'),
    });
  } catch (error) {
    console.error('Get breeds error:', error);
    res.status(500).json({
      error: {
        message: 'Błąd podczas pobierania ras',
        status: 500,
      },
    });
  }
}

async function calculate(req, res) {
  try {
    const userId = req.user.userId;
    const {
      petId,
      species,
      weight,
      ageYears,
      ageMonths,
      breed,
      activity,
      lifeStage,
      bodyCondition,
      goal,
      isSterilized,
      meals,
    } = req.body;

    let finalSpecies = species;
    let finalWeight = weight;
    let finalBreed = breed;
    let finalAgeMonths = ageMonths;
    let finalLifeStage = lifeStage;
    let sportDiet = null;

    // If petId provided, fetch pet data and use as defaults
    if (petId) {
      const result = await query(
        'SELECT id, name, species, breed, birth_date, weight FROM pets WHERE id = $1 AND user_id = $2',
        [petId, userId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: { message: 'Nie znaleziono zwierzęcia', status: 404 },
        });
      }
      const pet = result.rows[0];
      if (!finalSpecies) finalSpecies = pet.species === 'cat' ? 'cat' : 'dog';
      if (!finalWeight && pet.weight) finalWeight = parseFloat(pet.weight);
      if (!finalBreed && pet.breed) finalBreed = pet.breed;
      if (!finalAgeMonths && pet.birth_date) {
        finalAgeMonths = monthsBetween(pet.birth_date, new Date());
      }

      sportDiet = await getActiveSportDietForPet(petId);
    }

    if (!finalSpecies || !['dog', 'cat'].includes(finalSpecies)) {
      return res.status(400).json({
        error: { message: 'Podaj gatunek (dog lub cat)', status: 400 },
      });
    }

    if (!finalWeight || finalWeight <= 0) {
      return res.status(400).json({
        error: { message: 'Podaj prawidłową wagę w kg', status: 400 },
      });
    }

    if (!finalAgeMonths && ageYears !== undefined) {
      finalAgeMonths = Math.round(ageYears * 12);
    }
    if (!finalAgeMonths) {
      finalAgeMonths = 24; // default adult
    }

    if (!finalLifeStage) {
      finalLifeStage = inferLifeStage(finalSpecies, finalAgeMonths);
    }

    const speciesMap = {
      dog: 'pies',
      cat: 'kot',
    };

    const activityFactor = (ACTIVITY_FACTORS[finalSpecies] || ACTIVITY_FACTORS.dog)[activity] || 1.2;
    const lifeStageFactor = (LIFE_STAGE_FACTORS[finalSpecies] || LIFE_STAGE_FACTORS.dog)[finalLifeStage] || 1.3;
    const bodyConditionFactor = BODY_CONDITION_FACTORS[bodyCondition] || 1.0;
    const goalFactor = GOAL_FACTORS[goal] || 1.0;
    const breedFactor = getBreedFactor(finalSpecies, finalBreed);
    const sterilizedFactor = isSterilized === true ? 0.9 : 1.0;
    const sportDietFactor = sportDiet ? parseFloat(sportDiet.calorie_multiplier) : 1.0;

    const rer = 70 * Math.pow(finalWeight, 0.75);
    const multiplier = activityFactor * lifeStageFactor * bodyConditionFactor * goalFactor * breedFactor * sterilizedFactor * sportDietFactor;
    const dailyCalories = Math.round(rer * multiplier);
    const mealsCount = meals && meals > 0 ? parseInt(meals, 10) : 2;
    const perMeal = Math.round(dailyCalories / mealsCount);

    const macroRatios = MACROS[finalSpecies] || MACROS.dog;
    const macros = {
      protein: Math.round((dailyCalories * macroRatios.protein) / 4),
      fat: Math.round((dailyCalories * macroRatios.fat) / 9),
      carbs: Math.round((dailyCalories * macroRatios.carbs) / 4),
    };

    let recommendation = `Dla ${speciesMap[finalSpecies]}a ważącego ${finalWeight} kg zapotrzebowanie wynosi ${dailyCalories} kcal/dzień.`;
    if (mealsCount > 1) {
      recommendation += ` Podzielone na ${mealsCount} posiłki daje około ${perMeal} kcal na posiłek.`;
    }
    if (goal === 'lose') {
      recommendation += ' Wartość uwzględnia redukcję masy ciała.';
    } else if (goal === 'gain') {
      recommendation += ' Wartość uwzględnia wzrost masy ciała.';
    }
    if (sportDiet) {
      recommendation += ` Zastosowano mnożnik z aktywnej diety sportowej „${sportDiet.name}” (x${sportDietFactor}).`;
    }

    res.json({
      dailyCalories,
      perMeal,
      mealsCount,
      rer: Math.round(rer),
      multiplier: parseFloat(multiplier.toFixed(2)),
      species: finalSpecies,
      weight: finalWeight,
      ageMonths: finalAgeMonths,
      lifeStage: finalLifeStage,
      activity,
      bodyCondition,
      goal,
      isSterilized: !!isSterilized,
      breedFactor,
      macros,
      recommendation,
      sportDiet: sportDiet
        ? { name: sportDiet.name, key: sportDiet.key, multiplier: sportDietFactor }
        : null,
    });
  } catch (error) {
    console.error('Calculate calories error:', error);
    res.status(500).json({
      error: {
        message: 'Błąd podczas obliczania zapotrzebowania kalorycznego',
        status: 500,
      },
    });
  }
}

module.exports = {
  getBreeds,
  calculate,
};
