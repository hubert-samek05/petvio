-- Migration: Specialists category (behawioryści, trenerzy, zoopsycholodzy)
-- Adds admin role support and specialists directory with verification workflow.

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

CREATE TABLE IF NOT EXISTS specialists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialist_type VARCHAR(30) NOT NULL, -- 'behaviorist' | 'trainer' | 'zoopsychologist'
    species VARCHAR(10) NOT NULL DEFAULT 'both', -- 'dog' | 'cat' | 'both'
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
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    admin_notes TEXT,
    submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_specialists_type ON specialists(specialist_type);
CREATE INDEX IF NOT EXISTS idx_specialists_status ON specialists(status);
CREATE INDEX IF NOT EXISTS idx_specialists_location ON specialists(latitude, longitude);

-- Przykładowi zweryfikowani specjaliści (do testów)
INSERT INTO specialists (name, specialist_type, species, description, phone, email, city, address, latitude, longitude, price_info, status)
VALUES
('Anna Kowalska - Behawiorysta Zwierząt', 'behaviorist', 'both', 'Certyfikowany behawiorysta z 10-letnim doświadczeniem. Specjalizacja: agresja, lęk separacyjny, socjalizacja.', '+48 600 100 200', 'anna.kowalska@example.com', 'Warszawa', 'ul. Puławska 12', 52.1942, 21.0122, 'od 150 zł/wizyta', 'approved'),
('Piotr Nowak - Trener Psów', 'trainer', 'dog', 'Trener psów pracujący metodami pozytywnymi. Szkolenie podstawowe, posłuszeństwo, przygotowanie do egzaminów.', '+48 601 111 222', 'piotr.nowak@example.com', 'Kraków', 'ul. Floriańska 5', 50.0619, 19.9368, 'od 100 zł/godz.', 'approved'),
('Magdalena Wiśniewska - Zoopsycholog', 'zoopsychologist', 'both', 'Zoopsycholog specjalizująca się w problemach behawioralnych kotów i psów, terapia stresu i lęku.', '+48 602 333 444', 'magda.wisniewska@example.com', 'Wrocław', 'ul. Świdnicka 8', 51.1079, 17.0385, 'od 180 zł/konsultacja', 'approved'),
('Tomasz Zieliński - Trener Psów Sportowych', 'trainer', 'dog', 'Przygotowanie psów do sportów kynologicznych: agility, obedience, tropienie.', '+48 603 555 666', 'tomasz.zielinski@example.com', 'Poznań', 'ul. Głogowska 20', 52.3989, 16.8895, 'od 120 zł/godz.', 'approved'),
('Katarzyna Lewandowska - Behawiorysta Kotów', 'behaviorist', 'cat', 'Wsparcie w problemach behawioralnych kotów: znaczenie terytorium, agresja, wprowadzanie nowych zwierząt.', '+48 604 777 888', 'katarzyna.lewandowska@example.com', 'Gdańsk', 'ul. Długa 15', 54.3520, 18.6466, 'od 160 zł/wizyta', 'approved')
ON CONFLICT DO NOTHING;
