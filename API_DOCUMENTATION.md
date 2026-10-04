# Petvio API Documentation

## Base URL
```
http://petvio.pl:3100/api
```

## Authentication

Wszystkie chronione endpointy wymagają tokenu JWT w nagłówku:
```
Authorization: Bearer <token>
```

## Endpoints

### Health Check

#### GET /health
Sprawdza status API

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-07-13T10:47:15.000Z",
  "service": "Petvio API",
  "version": "1.0.0"
}
```

---

### Authentication

#### POST /api/auth/register
Rejestracja nowego użytkownika

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "Jan",
  "lastName": "Kowalski"
}
```

**Response:**
```json
{
  "message": "Rejestracja zakończona pomyślnie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "Jan",
    "lastName": "Kowalski"
  }
}
```

#### POST /api/auth/login
Logowanie użytkownika

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Logowanie zakończone pomyślnie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "Jan",
    "lastName": "Kowalski"
  }
}
```

#### POST /api/auth/logout
Wylogowanie użytkownika

**Response:**
```json
{
  "message": "Wylogowano pomyślnie"
}
```

---

### Pets (Zwierzęta)

#### GET /api/pets
Pobierz wszystkie zwierzęta użytkownika

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "pets": [
    {
      "id": 1,
      "name": "Burek",
      "species": "dog",
      "breed": "Golden Retriever",
      "birth_date": "2020-05-15",
      "gender": "male",
      "weight": 30.5,
      "photo_url": null,
      "microchip_number": "123456789",
      "created_at": "2026-07-13T10:00:00.000Z",
      "updated_at": "2026-07-13T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### POST /api/pets
Dodaj nowe zwierzę

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Burek",
  "species": "dog",
  "breed": "Golden Retriever",
  "birthDate": "2020-05-15",
  "gender": "male",
  "weight": 30.5,
  "photoUrl": null,
  "microchipNumber": "123456789"
}
```

**Response:**
```json
{
  "message": "Zwierzę zostało dodane pomyślnie",
  "pet": {
    "id": 1,
    "name": "Burek",
    "species": "dog",
    ...
  }
}
```

#### GET /api/pets/:id
Pobierz szczegóły zwierzęcia

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "pet": {
    "id": 1,
    "name": "Burek",
    ...
  }
}
```

#### PUT /api/pets/:id
Zaktualizuj dane zwierzęcia

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Burek",
  "weight": 31.0
}
```

**Response:**
```json
{
  "message": "Zwierzę zostało zaktualizowane pomyślnie",
  "pet": {
    "id": 1,
    "name": "Burek",
    "weight": 31.0,
    ...
  }
}
```

#### DELETE /api/pets/:id
Usuń zwierzę

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Zwierzę zostało usunięte pomyślnie"
}
```

---

### Health Records (Rekordy Zdrowia)

#### GET /api/health-records/pet/:petId
Pobierz wszystkie rekordy zdrowia dla zwierzęcia

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "records": [
    {
      "id": 1,
      "pet_id": 1,
      "record_type": "vaccination",
      "record_date": "2026-07-01",
      "title": "Szczepienie przeciwko wściekliźnie",
      "description": "Roczne szczepienie",
      "veterinarian": "Dr. Jan Kowalski",
      "next_date": "2027-07-01",
      "documents": [],
      "created_at": "2026-07-13T10:00:00.000Z",
      "updated_at": "2026-07-13T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### POST /api/health-records
Dodaj nowy rekord zdrowia

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "petId": 1,
  "recordType": "vaccination",
  "recordDate": "2026-07-01",
  "title": "Szczepienie przeciwko wściekliźnie",
  "description": "Roczne szczepienie",
  "veterinarian": "Dr. Jan Kowalski",
  "nextDate": "2027-07-01",
  "documents": []
}
```

**Response:**
```json
{
  "message": "Rekord zdrowia został dodany pomyślnie",
  "record": {
    "id": 1,
    ...
  }
}
```

#### GET /api/health-records/:id
Pobierz szczegóły rekordu zdrowia

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "record": {
    "id": 1,
    ...
  }
}
```

#### PUT /api/health-records/:id
Zaktualizuj rekord zdrowia

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Szczepienie przeciwko wściekliźnie - zaktualizowane",
  "description": "Roczne szczepienie - dawka przypominająca"
}
```

**Response:**
```json
{
  "message": "Rekord zdrowia został zaktualizowany pomyślnie",
  "record": {
    "id": 1,
    ...
  }
}
```

#### DELETE /api/health-records/:id
Usuń rekord zdrowia

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Rekord zdrowia został usunięty pomyślnie"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "message": "Nieprawidłowe dane wejściowe",
    "status": 400
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "message": "Brak tokenu autoryzacji",
    "status": 401
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "message": "Token jest nieprawidłowy lub wygasł",
    "status": 403
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "message": "Zasób nie został znaleziony",
    "status": 404
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "message": "Wystąpił błąd serwera",
    "status": 500
  }
}
```

## Rate Limiting

API jest chronione rate limiterem:
- **Limit**: 100 żądań na 15 minut
- **Scope**: Per IP address

## CORS

API akceptuje żądania z:
- `http://petvio.pl`
- `https://petvio.pl`

## Typy rekordów zdrowia (record_type)

- `vaccination` - Szczepienie
- `deworming` - Odrobaczenie
- `vet_visit` - Wizyta u weterynarza
- `medication` - Leki
- `surgery` - Zabieg chirurgiczny
- `examination` - Badanie
- `other` - Inne
