# Petvio - Instrukcja Wdrożenia

## Status Wdrożenia

✅ **Aplikacja została pomyślnie wdrożona!**

## Informacje o środowisku

- **Domena**: petvio.pl
- **Backend API**: Port 3100
- **Frontend**: Port 3000
- **Baza danych**: PostgreSQL (petvio)
- **Process Manager**: PM2

## Uruchomione usługi

### PM2 Processes
```bash
pm2 list
```

- **petvio-api** (ID: 9) - Backend API na porcie 3100
- **petvio-web** (ID: 10) - Frontend Next.js na porcie 3000

## Dostęp do aplikacji

- **Strona główna**: http://petvio.pl
- **Logowanie**: http://petvio.pl/login
- **Rejestracja**: http://petvio.pl/register
- **API Health**: http://petvio.pl:3100/health
- **API Docs**: http://petvio.pl:3100/api

## Zarządzanie aplikacją

### Restart aplikacji
```bash
cd /root/CascadeProjects/petvio
pm2 restart petvio-api petvio-web
```

### Zatrzymanie aplikacji
```bash
pm2 stop petvio-api petvio-web
```

### Uruchomienie aplikacji
```bash
pm2 start petvio-api petvio-web
```

### Logi aplikacji
```bash
# Backend logs
pm2 logs petvio-api

# Frontend logs
pm2 logs petvio-web

# Wszystkie logi
pm2 logs
```

### Monitoring
```bash
pm2 monit
```

## Baza danych

### Połączenie z bazą
```bash
psql -U petvio_user -d petvio
```

### Backup bazy danych
```bash
pg_dump -U petvio_user petvio > /root/backups/petvio_$(date +%Y%m%d_%H%M%S).sql
```

### Restore bazy danych
```bash
psql -U petvio_user petvio < /root/backups/petvio_backup.sql
```

## Nginx

### Reload konfiguracji
```bash
nginx -t && systemctl reload nginx
```

### Restart Nginx
```bash
systemctl restart nginx
```

## SSL (Do wykonania)

Aby włączyć HTTPS, wykonaj:

```bash
# 1. Wygeneruj certyfikat SSL
certbot certonly --nginx -d petvio.pl -d www.petvio.pl

# 2. Zaktualizuj konfigurację Nginx (dodaj blok SSL)
# Edytuj: /etc/nginx/sites-available/petvio.pl

# 3. Przeładuj Nginx
nginx -t && systemctl reload nginx
```

## Zmienne środowiskowe

### Backend (.env)
Lokalizacja: `/root/CascadeProjects/petvio/apps/api/.env`

```env
NODE_ENV=production
PORT=3100
DB_HOST=localhost
DB_PORT=5432
DB_NAME=petvio
DB_USER=petvio_user
DB_PASSWORD=petvio_secure_password_2026
JWT_SECRET=petvio_jwt_secret_key_2026_very_secure_change_in_production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://petvio.pl
```

### Frontend (.env.local)
Lokalizacja: `/root/CascadeProjects/petvio/apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://petvio.pl:3100
```

## Aktualizacja aplikacji

### 1. Zatrzymaj aplikację
```bash
pm2 stop petvio-api petvio-web
```

### 2. Pobierz zmiany (jeśli używasz git)
```bash
cd /root/CascadeProjects/petvio
git pull
```

### 3. Zainstaluj zależności
```bash
npm install
```

### 4. Zbuduj frontend
```bash
cd apps/web
npm run build
```

### 5. Uruchom aplikację
```bash
cd /root/CascadeProjects/petvio
pm2 restart petvio-api petvio-web
```

## Troubleshooting

### Aplikacja nie działa
```bash
# Sprawdź status PM2
pm2 status

# Sprawdź logi błędów
pm2 logs petvio-api --err
pm2 logs petvio-web --err

# Restart aplikacji
pm2 restart all
```

### Problemy z bazą danych
```bash
# Sprawdź czy PostgreSQL działa
systemctl status postgresql

# Restart PostgreSQL
systemctl restart postgresql

# Sprawdź połączenie
psql -U petvio_user -d petvio -c "SELECT 1;"
```

### Problemy z Nginx
```bash
# Sprawdź konfigurację
nginx -t

# Sprawdź status
systemctl status nginx

# Sprawdź logi
tail -f /var/log/nginx/error.log
```

## Kontakt

W razie problemów sprawdź logi lub skontaktuj się z administratorem systemu.
