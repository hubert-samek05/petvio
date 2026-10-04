CREATE DATABASE petvio;

\c petvio;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    species VARCHAR(50) NOT NULL,
    breed VARCHAR(100),
    birth_date DATE,
    gender VARCHAR(20),
    weight DECIMAL(6,2),
    photo_url TEXT,
    microchip_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE health_records (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    record_type VARCHAR(50) NOT NULL,
    record_date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    veterinarian VARCHAR(255),
    next_date DATE,
    documents JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vaccinations (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    vaccine_name VARCHAR(255) NOT NULL,
    vaccination_date DATE NOT NULL,
    next_vaccination_date DATE,
    veterinarian VARCHAR(255),
    batch_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE,
    veterinarian VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deworming (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    treatment_date DATE NOT NULL,
    next_treatment_date DATE,
    weight_at_treatment DECIMAL(6,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vet_visits (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL,
    veterinarian VARCHAR(255),
    clinic_name VARCHAR(255),
    reason VARCHAR(255),
    diagnosis TEXT,
    treatment TEXT,
    cost DECIMAL(10,2),
    next_visit_date DATE,
    documents JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE health_calendar (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    reminder_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feeding_logs (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    meal_time TIME,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('plan', 'log')),
    food_name VARCHAR(255) NOT NULL,
    food_type VARCHAR(50),
    amount DECIMAL(6,2),
    unit VARCHAR(20),
    calories DECIMAL(6,2),
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE special_diets (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    diet_type VARCHAR(50) NOT NULL,
    indication TEXT,
    allowed_foods TEXT,
    forbidden_foods TEXT,
    recommendations TEXT,
    notes TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sport_diet_templates (
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

CREATE TABLE pet_sport_diets (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id INTEGER NOT NULL REFERENCES sport_diet_templates(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    species VARCHAR(10) NOT NULL DEFAULT 'both',
    category VARCHAR(50) NOT NULL DEFAULT 'main_meal',
    description TEXT,
    ingredients TEXT NOT NULL,
    instructions TEXT NOT NULL,
    prep_time_minutes INTEGER,
    servings INTEGER,
    calories_per_serving INTEGER,
    difficulty VARCHAR(20) DEFAULT 'easy',
    visibility VARCHAR(10) NOT NULL DEFAULT 'private',
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipe_likes (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(recipe_id, user_id)
);

CREATE TABLE barf_ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(30) NOT NULL,
    species VARCHAR(10) NOT NULL DEFAULT 'both',
    calories_per_100g NUMERIC(6,1),
    protein_per_100g NUMERIC(5,1),
    fat_per_100g NUMERIC(5,1),
    calcium_mg_per_100g NUMERIC(7,1),
    phosphorus_mg_per_100g NUMERIC(7,1),
    recommended_pct VARCHAR(30),
    description TEXT,
    feeding_tip TEXT,
    caution TEXT,
    status VARCHAR(10) NOT NULL DEFAULT 'good',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE barf_plans (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight_kg NUMERIC(6,2) NOT NULL,
    activity_level VARCHAR(20) NOT NULL DEFAULT 'active',
    ratio_model VARCHAR(20) NOT NULL DEFAULT 'standard',
    muscle_meat_pct NUMERIC(5,2) NOT NULL,
    bone_pct NUMERIC(5,2) NOT NULL,
    liver_pct NUMERIC(5,2) NOT NULL,
    other_organ_pct NUMERIC(5,2) NOT NULL,
    veg_fruit_pct NUMERIC(5,2) NOT NULL,
    meals_per_day INTEGER NOT NULL DEFAULT 2,
    daily_food_grams NUMERIC(7,1) NOT NULL,
    muscle_meat_grams NUMERIC(7,1) NOT NULL,
    bone_grams NUMERIC(7,1) NOT NULL,
    liver_grams NUMERIC(7,1) NOT NULL,
    other_organ_grams NUMERIC(7,1) NOT NULL,
    veg_fruit_grams NUMERIC(7,1) NOT NULL,
    calories_target INTEGER,
    supplements JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pets_user_id ON pets(user_id);
CREATE INDEX idx_pet_sport_diets_pet_id ON pet_sport_diets(pet_id);
CREATE INDEX idx_pet_sport_diets_user_id ON pet_sport_diets(user_id);
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_visibility ON recipes(visibility);
CREATE INDEX idx_recipes_species ON recipes(species);
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipe_likes_recipe_id ON recipe_likes(recipe_id);
CREATE INDEX idx_recipe_likes_user_id ON recipe_likes(user_id);
CREATE INDEX idx_barf_ingredients_category ON barf_ingredients(category);
CREATE INDEX idx_barf_ingredients_species ON barf_ingredients(species);
CREATE INDEX idx_barf_plans_pet_id ON barf_plans(pet_id);
CREATE INDEX idx_barf_plans_user_id ON barf_plans(user_id);
CREATE INDEX idx_health_records_pet_id ON health_records(pet_id);
CREATE INDEX idx_vaccinations_pet_id ON vaccinations(pet_id);
CREATE INDEX idx_medications_pet_id ON medications(pet_id);
CREATE INDEX idx_deworming_pet_id ON deworming(pet_id);
CREATE INDEX idx_vet_visits_pet_id ON vet_visits(pet_id);
CREATE INDEX idx_health_calendar_pet_id ON health_calendar(pet_id);
CREATE INDEX idx_health_calendar_event_date ON health_calendar(event_date);
CREATE INDEX idx_feeding_logs_pet_id ON feeding_logs(pet_id);
CREATE INDEX idx_feeding_logs_user_id ON feeding_logs(user_id);
CREATE INDEX idx_feeding_logs_log_date ON feeding_logs(log_date);
CREATE INDEX idx_feeding_logs_meal_type ON feeding_logs(meal_type);

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

INSERT INTO barf_ingredients (name, category, species, calories_per_100g, protein_per_100g, fat_per_100g, calcium_mg_per_100g, phosphorus_mg_per_100g, recommended_pct, description, feeding_tip, caution, status) VALUES
('Kurczak (mięso bez kości)', 'muscle_meat', 'both', 120, 21, 4, 10, 180, '60-80% mięsa', 'Podstawowe, łatwo strawne źródło białka.', 'Podawaj z skórą dla dodatkowego tłuszczu jeśli zwierzę potrzebuje więcej energii.', NULL, 'good'),
('Indyk (mięso)', 'muscle_meat', 'both', 135, 21, 5, 9, 190, '60-80% mięsa', 'Chude, lekkostrawne mięso, dobra alternatywa dla alergików na kurczaka.', NULL, NULL, 'good'),
('Wołowina (mięso mielone)', 'muscle_meat', 'both', 250, 17, 20, 8, 150, '60-80% mięsa', 'Bogate w żelazo i witaminy z grupy B.', 'Wybieraj chudsze kawałki, jeśli zwierzę ma tendencję do nadwagi.', NULL, 'good'),
('Wołowina (chuda)', 'muscle_meat', 'both', 150, 21, 7, 8, 170, '60-80% mięsa', 'Dobre źródło białka o niższej zawartości tłuszczu.', NULL, NULL, 'good'),
('Jagnięcina', 'muscle_meat', 'both', 260, 16, 21, 9, 160, '60-80% mięsa', 'Bogata energetycznie, rzadziej uczula.', 'Dobra opcja przy dietach eliminacyjnych.', NULL, 'good'),
('Kaczka (mięso)', 'muscle_meat', 'both', 200, 19, 14, 8, 165, '60-80% mięsa', 'Tłustsze mięso, dobrze tolerowane przez alergików.', NULL, NULL, 'good'),
('Królik (mięso)', 'muscle_meat', 'both', 130, 21, 5, 12, 175, '60-80% mięsa', 'Bardzo chude i hipoalergiczne mięso.', 'Dobre dla zwierząt z wrażliwym przewodem pokarmowym.', NULL, 'good'),
('Wieprzowina (mięso, dobrze sprawdzone)', 'muscle_meat', 'dog', 240, 20, 18, 9, 190, '60-80% mięsa', 'Kalorycznie bogate mięso.', 'Podawaj tylko mięso z zaufanego, sprawdzonego źródła.', 'Surowa wieprzowina niesprawdzonego pochodzenia może przenosić wirus choroby Aujeszkyego – śmiertelny dla psów.', 'caution'),
('Ryby białe (dorsz, mintaj)', 'fish', 'both', 90, 18, 1, 15, 200, '5-10% zamiennik mięsa', 'Lekkostrawne źródło białka i jodu.', 'Podawaj 1-2x w tygodniu jako urozmaicenie.', 'Zawsze podawaj bez ości.', 'good'),
('Łosoś (surowy, mrożony min. 7 dni)', 'fish', 'both', 200, 20, 13, 15, 240, '5-10% zamiennik mięsa', 'Bogaty w kwasy omega-3, wspiera skórę i sierść.', 'Mrożenie min. 7 dni zabija pasożyty.', 'Nigdy nie podawaj surowego łososia bez wcześniejszego zamrożenia.', 'caution'),
('Wątroba drobiowa/wołowa', 'liver', 'both', 135, 20, 4, 8, 300, '5% wątroba', 'Skoncentrowane źródło witaminy A, żelaza i witamin B.', 'Nie przekraczaj 5% dawki – nadmiar witaminy A jest szkodliwy.', 'Zbyt duża ilość może powodować hiperwitaminozę A.', 'caution'),
('Nerki', 'other_organ', 'both', 100, 17, 3, 15, 230, '5% inne narządy', 'Dobre źródło selenu i witamin z grupy B.', NULL, NULL, 'good'),
('Serce (wołowe/kurze)', 'other_organ', 'both', 110, 17, 4, 6, 180, '5% inne narządy', 'Bogate w taurynę i CoQ10, ważne szczególnie dla kotów.', 'Serce liczy się jako mięso mięśniowe, ale warto je uwzględnić dla tauryny.', NULL, 'good'),
('Śledziona', 'other_organ', 'both', 120, 18, 4, 10, 200, '5% inne narządy', 'Bogata w żelazo.', 'Podawaj z umiarem, może rozluźniać stolec.', NULL, 'caution'),
('Żołądek/Żwacz (tripe)', 'other_organ', 'dog', 90, 15, 3, 30, 150, '5% inne narządy', 'Naturalna zawartość enzymów trawiennych i probiotyków.', 'Zielony żwacz ma silny zapach, ale jest bardzo wartościowy odżywczo.', NULL, 'good'),
('Szyje kurczaka (surowe, mięsno-kostne)', 'bone', 'both', 150, 18, 8, 400, 300, '10% kość', 'Surowe, miękkie kości – dobre źródło wapnia i naturalna higiena zębów.', 'Podawaj wyłącznie surowe, nigdy gotowane.', 'Zawsze nadzoruj karmienie kośćmi, ryzyko zadławienia u małych ras.', 'caution'),
('Skrzydełka kurczaka (surowe)', 'bone', 'both', 200, 18, 15, 350, 280, '10% kość', 'Miękkie kości z dużą zawartością tłuszczu.', 'Dobra opcja na kość mięsno-kostną dla większości psów.', 'Nie podawaj gotowanych kości – mogą się rozłupywać.', 'caution'),
('Grzbiety kurczaka (surowe)', 'bone', 'both', 180, 17, 12, 380, 290, '10% kość', 'Popularna kość mięsno-kostna, dobrze tolerowana.', NULL, 'Nadzoruj karmienie, szczególnie u małych psów i kotów.', 'caution'),
('Kości gotowane (jakiekolwiek)', 'bone', 'both', 0, 0, 0, 0, 0, '0%', 'Gotowane kości są łamliwe i niebezpieczne.', NULL, 'Mogą powodować rozdarcia przełyku, żołądka i jelit – nigdy nie podawaj.', 'avoid'),
('Kości nośne / szpikowe surowe (duże, twarde)', 'bone', 'dog', 150, 15, 10, 300, 250, 'unikać jako główne źródło', 'Bardzo twarde kości, ryzyko złamania zębów.', 'Mogą służyć jako okazjonalny gryzak, nie jako źródło wapnia w diecie.', 'Duże twarde kości mogą powodować złamania zębów i niedrożności.', 'caution'),
('Marchew', 'vegetable', 'both', 41, 1, 0, 33, 35, '5-10% warzywa', 'Źródło beta-karotenu i błonnika.', 'Podawaj zmiksowaną lub rozgniecioną dla lepszego wchłaniania.', NULL, 'good'),
('Dynia', 'vegetable', 'both', 26, 1, 0, 21, 44, '5-10% warzywa', 'Wspiera trawienie, łagodzi biegunki i zaparcia.', NULL, NULL, 'good'),
('Brokuły', 'vegetable', 'both', 34, 3, 0, 47, 66, '5-10% warzywa', 'Bogate w witaminy C i K.', 'Podawaj z umiarem – nadmiar może powodować wzdęcia.', NULL, 'caution'),
('Szpinak', 'vegetable', 'both', 23, 3, 0, 99, 49, '5-10% warzywa', 'Źródło żelaza i witamin, ale zawiera szczawiany.', 'Podawaj sporadycznie w małych ilościach.', 'Duże ilości szczawianów mogą wpływać na wchłanianie wapnia i nerki.', 'caution'),
('Cukinia', 'vegetable', 'both', 17, 1, 0, 16, 38, '5-10% warzywa', 'Lekkostrawne warzywo, dobre źródło nawodnienia.', NULL, NULL, 'good'),
('Jabłko (bez pestek)', 'fruit', 'both', 52, 0, 0, 6, 11, '2-5% owoce', 'Źródło błonnika i witamin, naturalnie słodkie.', 'Zawsze usuwaj pestki i gniazda nasienne.', 'Pestki jabłek zawierają związki cyjanogenne – zawsze usuwaj.', 'good'),
('Borówki', 'fruit', 'both', 57, 1, 0, 6, 12, '2-5% owoce', 'Silne antyoksydanty.', NULL, NULL, 'good'),
('Winogrona / rodzynki', 'fruit', 'both', 69, 1, 0, 10, 20, '0%', 'Owoc bardzo popularny u ludzi.', NULL, 'Nawet małe ilości mogą uszkodzić nerki psów i kotów – absolutny zakaz.', 'avoid'),
('Olej z łososia', 'oil', 'both', 900, 0, 100, 0, 0, '1-2 łyżeczki/dzień', 'Skoncentrowane źródło kwasów omega-3 EPA/DHA.', 'Dodawaj bezpośrednio do posiłku, przechowuj w chłodnym miejscu.', NULL, 'good'),
('Olej kokosowy', 'oil', 'both', 862, 0, 100, 0, 0, '1 łyżeczka/dzień', 'Tłuszcze MCT, wspomagają skórę i energię.', 'Wprowadzaj stopniowo, obserwuj tolerancję.', 'U kotów podawać w małych ilościach – może obciążać wątrobę w nadmiarze.', 'caution'),
('Jajko (całe, ze skorupką dla wapnia)', 'dairy_egg', 'both', 155, 13, 11, 50, 190, '1-3x w tygodniu', 'Pełnowartościowe białko i biotyna (żółtko neutralizuje awidynę z białka).', 'Zmielona skorupka jest dobrym naturalnym źródłem wapnia.', 'Surowe białko jajka w dużych ilościach może wiązać biotynę – podawaj całe jajko.', 'good'),
('Jogurt naturalny (bez cukru)', 'dairy_egg', 'both', 60, 4, 3, 120, 100, 'okazjonalnie', 'Probiotyki wspierające mikroflorę jelitową.', 'Wybieraj wersje bez laktozy jeśli zwierzę jej nie toleruje.', NULL, 'caution'),
('Twaróg (niskotłuszczowy)', 'dairy_egg', 'both', 98, 11, 4, 90, 140, 'okazjonalnie', 'Dobre źródło białka i wapnia.', NULL, NULL, 'good'),
('Algi / spirulina', 'supplement', 'both', 290, 57, 8, 120, 90, 'szczypta dziennie', 'Naturalne źródło jodu i przeciwutleniaczy.', 'Dodawaj w małych ilościach, kontroluj poziom jodu przy problemach z tarczycą.', NULL, 'good'),
('Skorupki jaj (zmielone)', 'supplement', 'both', 0, 0, 0, 38000, 0, 'zamiennik kości', 'Skoncentrowane źródło wapnia, alternatywa gdy zwierzę nie jadło kości.', '1/2 łyżeczki zmielonej skorupki ≈ 1g wapnia.', 'Dawkuj precyzyjnie – nadmiar wapnia jest szkodliwy, szczególnie dla szczeniąt dużych ras.', 'caution'),
('Czosnek / cebula / por', 'vegetable', 'both', 0, 0, 0, 0, 0, '0%', 'Popularne w kuchni ludzkiej warzywa.', NULL, 'Toksyczne dla psów i kotów – uszkadzają czerwone krwinki, mogą prowadzić do anemii.', 'avoid'),
('Drożdże piwne', 'supplement', 'both', 350, 40, 2, 0, 0, 'łyżeczka/10kg', 'Naturalne źródło witamin z grupy B, wspiera odporność i kondycję sierści.', 'Ok. 1 łyżeczka na 10 kg masy ciała dziennie.', 'Nie stosować u zwierząt z alergią na drożdże.', 'good'),
('Siara psia / kolostrum', 'supplement', 'dog', 0, 0, 0, 0, 0, '1-2g/dzień', 'Wsparcie układu odpornościowego, szczególnie u szczeniąt i zwierząt osłabionych.', 'Podawaj zgodnie z instrukcją producenta.', 'Skonsultuj z weterynarzem przy chorobach autoimmunologicznych.', 'good'),
('Witamina E (naturalna)', 'supplement', 'both', 0, 0, 0, 0, 0, 'wg zaleceń', 'Antyoksydant wspierający układ odpornościowy i kondycję skóry.', 'Dawkowanie zgodnie z zaleceniem weterynarza, zwykle w kapsułkach.', 'Nie przekraczać dawek – witamina rozpuszczalna w tłuszczach może się kumulować.', 'caution');

CREATE TABLE specialists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialist_type VARCHAR(30) NOT NULL,
    species VARCHAR(10) NOT NULL DEFAULT 'both',
    description TEXT,
    phone VARCHAR(30),
    email VARCHAR(255),
    website VARCHAR(255),
    city VARCHAR(100),
    address VARCHAR(255),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    price_info VARCHAR(255),
    photo_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_specialists_type ON specialists(specialist_type);
CREATE INDEX idx_specialists_status ON specialists(status);
CREATE INDEX idx_specialists_location ON specialists(latitude, longitude);

INSERT INTO specialists (name, specialist_type, species, description, phone, email, city, address, latitude, longitude, price_info, status)
VALUES
('Anna Kowalska - Behawiorysta Zwierząt', 'behaviorist', 'both', 'Certyfikowany behawiorysta z 10-letnim doświadczeniem. Specjalizacja: agresja, lęk separacyjny, socjalizacja.', '+48 600 100 200', 'anna.kowalska@example.com', 'Warszawa', 'ul. Puławska 12', 52.1942, 21.0122, 'od 150 zł/wizyta', 'approved'),
('Piotr Nowak - Trener Psów', 'trainer', 'dog', 'Trener psów pracujący metodami pozytywnymi. Szkolenie podstawowe, posłuszeństwo, przygotowanie do egzaminów.', '+48 601 111 222', 'piotr.nowak@example.com', 'Kraków', 'ul. Floriańska 5', 50.0619, 19.9368, 'od 100 zł/godz.', 'approved'),
('Magdalena Wiśniewska - Zoopsycholog', 'zoopsychologist', 'both', 'Zoopsycholog specjalizująca się w problemach behawioralnych kotów i psów, terapia stresu i lęku.', '+48 602 333 444', 'magda.wisniewska@example.com', 'Wrocław', 'ul. Świdnicka 8', 51.1079, 17.0385, 'od 180 zł/konsultacja', 'approved'),
('Tomasz Zieliński - Trener Psów Sportowych', 'trainer', 'dog', 'Przygotowanie psów do sportów kynologicznych: agility, obedience, tropienie.', '+48 603 555 666', 'tomasz.zielinski@example.com', 'Poznań', 'ul. Głogowska 20', 52.3989, 16.8895, 'od 120 zł/godz.', 'approved'),
('Katarzyna Lewandowska - Behawiorysta Kotów', 'behaviorist', 'cat', 'Wsparcie w problemach behawioralnych kotów: znaczenie terytorium, agresja, wprowadzanie nowych zwierząt.', '+48 604 777 888', 'katarzyna.lewandowska@example.com', 'Gdańsk', 'ul. Długa 15', 54.3520, 18.6466, 'od 160 zł/wizyta', 'approved');

CREATE USER petvio_user WITH PASSWORD 'petvio_secure_password_2026';
GRANT ALL PRIVILEGES ON DATABASE petvio TO petvio_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO petvio_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO petvio_user;
