CREATE TABLE IF NOT EXISTS sport_diet_templates (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    species VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    activity_level VARCHAR(50),
    calorie_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    meal_frequency INTEGER DEFAULT 3,
    recommended_foods TEXT,
    avoid_foods TEXT,
    tips TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pet_sport_diets (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id INTEGER NOT NULL REFERENCES sport_diet_templates(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pet_sport_diets_pet_id ON pet_sport_diets(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_sport_diets_user_id ON pet_sport_diets(user_id);

INSERT INTO sport_diet_templates (key, species, name, description, activity_level, calorie_multiplier, meal_frequency, recommended_foods, avoid_foods, tips)
VALUES
('dog_recreational', 'dog', 'Pies aktywny rekreacyjnie', 'Dla psów regularnie biegających, spacerujących i bawiących się na świeżym powietrzu.', 'active', 1.20, 2,
 'kurczak, indyk, ryż, batat, ryby, olej rybny, warzywa', 'cukier, słodycze, tłuste odpady ze stołu', 'Podawaj posiłek 1-2h po intensywnym wysiłku, zapewnij stały dostęp do wody.'),
('dog_working', 'dog', 'Pies sportowy / pracujący', 'Dla psów uczestniczących w agility, sportach kynologicznych, pracy pasterskiej lub służbowej.', 'very_active', 1.60, 3,
 'mięso wysokiej jakości, ryby, jaja, olej rybny, węglowodany złożone (ryż, batat)', 'karmy niskobiałkowe, wypełniacze zbożowe, cukier', 'Zwiększ podaż białka i tłuszczu, rozdziel posiłki, unikaj karmienia bezpośrednio przed treningiem.'),
('dog_racing', 'dog', 'Pies wyścigowy / wysoki wysiłek', 'Dla psów wyścigowych i o bardzo wysokim poziomie wysiłku fizycznego (np. psy zaprzęgowe).', 'working', 2.00, 4,
 'mięso wysokoenergetyczne, tłuszcze zwierzęce, ryby, jaja', 'niskotłuszczowe karmy light, nadmiar błonnika', 'Dieta wysokoenergetyczna, monitoruj wagę co tydzień, konsultuj z weterynarzem sportowym.'),
('dog_recovery', 'dog', 'Rekonwalescencja po treningu', 'Dla psów w okresie regeneracji po intensywnym wysiłku lub kontuzji.', 'moderate', 1.10, 3,
 'lekkostrawne białko (kurczak, indyk), ryż, dynia, kolagen, glukozamina', 'tłuste, ciężkostrawne pokarmy, kości', 'Zmniejsz intensywność wysiłku, wspieraj stawy suplementami z glukozaminą i chondroityną.'),
('cat_active', 'cat', 'Kot aktywny', 'Dla kotów bardzo ruchliwych, dużo się bawiących lub mających dostęp na zewnątrz.', 'active', 1.15, 3,
 'kurczak, indyk, ryby, tauryna, olej rybny', 'nadmiar węglowodanów, cukier', 'Zapewnij częste, mniejsze posiłki i stały dostęp do świeżej wody.')
ON CONFLICT (key) DO NOTHING;
