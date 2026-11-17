// Szablony maili Petvio — wysyłka przez Resend (RESEND_API_KEY w .env).
// Nadawca: Petvio.pl <powiadomienia@petvio.pl>
// Styl: minimalistyczny, elegancki, pełnoekranowy — bez emoji.

const RESEND_FROM = process.env.RESEND_FROM || 'Petvio.pl <powiadomienia@petvio.pl>';
const LOGO_DARK = 'https://petvio.pl/logopetvio1.png'; // ciemne logo — na jasnym tle
const SITE = 'https://petvio.pl';

// Dane użytkowników (imiona, nazwy pupili) trafiają do HTML — escapuj zawsze.
const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ---------- Elementy budulcowe ----------

// Minimalistyczny przycisk — prostokąt, szeroki tracking
const button = (url, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:34px auto 8px;">
    <tr><td align="center" style="background:#173F33;">
      <a href="${url}" style="display:inline-block;padding:15px 44px;color:#ffffff;text-decoration:none;font-weight:600;font-size:12px;letter-spacing:1.8px;text-transform:uppercase;">${label}</a>
    </td></tr>
  </table>`;

// Wiersz faktu — hairline, etykieta + wartość (do alertów/logowania)
const factRow = (label, value, last = false) => `
  <tr>
    <td style="padding:12px 0;${last ? '' : 'border-bottom:1px solid #EDE9E2;'}font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#9A9285;width:120px;vertical-align:top;">${label}</td>
    <td style="padding:12px 0;${last ? '' : 'border-bottom:1px solid #EDE9E2;'}font-size:14px;color:#2A3530;">${value}</td>
  </tr>`;

const facts = (rows) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;border-top:1px solid #EDE9E2;">
    ${rows.map(([l, v], i) => factRow(l, v, i === rows.length - 1)).join('')}
  </table>`;

// Cienka uwaga — tylko tekst z akcentem
const note = (inner) => `
  <p style="margin:22px 0 0;padding-left:14px;border-left:2px solid #C9A96A;font-size:14px;color:#7A7060;line-height:1.7;">${inner}</p>`;

const divider = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
    <tr><td style="border-top:1px solid #EDE9E2;"></td></tr>
  </table>`;

// ---------- Layout bazowy — pełny ekran, minimalistyczny ----------

const baseLayout = (eyebrow, headline, bodyHtml, preheader = '') => `
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>Petvio.pl</title>
</head>
<body style="margin:0;padding:0;background:#FAF9F7;font-family:'Segoe UI',system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(preheader)}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF9F7;">
<tr><td align="center">

  <!-- Logo -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:46px 24px 34px;">
        <a href="${SITE}" style="text-decoration:none;">
          <img src="${LOGO_DARK}" alt="Petvio" width="140" style="display:block;border:0;width:140px;max-width:140px;height:auto;">
        </a>
      </td>
    </tr>
    <tr><td style="border-top:1px solid #EDE9E2;"></td></tr>
  </table>

  <!-- Treść — szeroka, powietrzna -->
  <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">
    <tr>
      <td align="center" style="padding:44px 40px 0;">
        <div style="color:#9A9285;font-size:11px;font-weight:600;letter-spacing:2.4px;text-transform:uppercase;">${esc(eyebrow)}</div>
        <h1 style="margin:14px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.35;color:#1C2B25;font-weight:400;">${headline}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:30px 40px 50px;color:#4A554F;font-size:15px;line-height:1.8;text-align:center;">
        ${bodyHtml}
      </td>
    </tr>
  </table>

  <!-- Stopka -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="border-top:1px solid #EDE9E2;"></td></tr>
    <tr>
      <td align="center" style="padding:30px 24px 40px;color:#A39B8E;font-size:12px;line-height:2;">
        <a href="${SITE}" style="color:#4A554F;text-decoration:none;font-weight:600;letter-spacing:0.5px;">PETVIO.PL</a>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <a href="${SITE}/polityka-prywatnosci" style="color:#A39B8E;text-decoration:none;">Polityka prywatności</a>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <a href="mailto:kontakt@petvio.pl" style="color:#A39B8E;text-decoration:none;">kontakt@petvio.pl</a>
        <div style="margin-top:14px;font-size:11px;color:#BFB8AB;line-height:1.7;">
          Otrzymujesz tę wiadomość, ponieważ masz konto w serwisie Petvio.pl.<br>
          Wiadomość wygenerowana automatycznie — nie odpowiadaj na nią.
        </div>
        <div style="margin-top:10px;font-size:11px;color:#CFC8BB;">© ${new Date().getFullYear()} Petvio.pl</div>
      </td>
    </tr>
  </table>

</td></tr>
</table>
</body>
</html>`;

// ---------- Szablony ----------

const templates = {
  // Mail powitalny po rejestracji
  welcome: ({ name }) => ({
    subject: 'Witaj w Petvio',
    html: baseLayout(
      'Nowe konto',
      `Witaj w Petvio, ${esc(name)}`,
      `<p style="max-width:460px;margin:0 auto;">Cieszymy się, że jesteś z nami. Twoje konto jest gotowe — od teraz cała opieka nad pupilami masz w jednym miejscu.</p>
       ${facts([
         ['Pupile', 'Dodaj zwierzęta i prowadź ich profile'],
         ['Zdrowie', 'Książeczka zdrowia, kalendarz, przypomnienia'],
         ['Dieta', 'Karmienie, BARF i jadłospisy'],
         ['Społeczność', 'PetvioBook, grupy i forum'],
       ])}
       ${button(`${SITE}/dashboard`, 'Przejdź do aplikacji')}
       ${divider}
       <p style="font-size:13px;color:#9A9285;">Zacznij od dodania pupila w zakładce Moje zwierzęta.<br>Pozdrawiamy — Zespół Petvio.pl</p>`,
      'Twoje konto w Petvio jest gotowe — dodaj pupila i zacznij działać.'
    ),
  }),

  // Alert bezpieczeństwa — nowe logowanie
  loginAlert: ({ name, when, ip, userAgent }) => ({
    subject: 'Nowe logowanie na Twoje konto Petvio',
    html: baseLayout(
      'Bezpieczeństwo konta',
      'Nowe logowanie na Twoim koncie',
      `<p style="max-width:460px;margin:0 auto;">Cześć ${esc(name)}, odnotowaliśmy logowanie na Twoje konto Petvio:</p>
       ${facts([
         ['Kiedy', esc(when)],
         ['Adres IP', esc(ip || 'nieznany')],
         ['Urządzenie', esc(userAgent || 'nieznane')],
       ])}
       <p style="margin-top:26px;">Jeśli to Ty — możesz zignorować tę wiadomość.</p>
       ${note('To nie Ty? Twoje konto może być zagrożone — zmień hasło natychmiast: Profil → Zmień hasło.')}
       ${button(`${SITE}/dashboard/profile`, 'Otwórz ustawienia konta')}`,
      'Odnotowaliśmy nowe logowanie na Twoje konto Petvio — sprawdź, czy to Ty.'
    ),
  }),

  // Link do resetu hasła
  passwordReset: ({ name, resetUrl, expiresMin }) => ({
    subject: 'Zresetuj hasło do konta Petvio',
    html: baseLayout(
      'Odzyskiwanie dostępu',
      'Zresetuj swoje hasło',
      `<p style="max-width:460px;margin:0 auto;">Cześć ${esc(name)}, otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta Petvio.</p>
       ${button(resetUrl, 'Ustaw nowe hasło')}
       ${facts([['Ważność linku', esc(String(expiresMin)) + ' minut'], ['Konto', 'Twoje konto Petvio']])}
       ${note('Nie prosiłeś(aś) o reset? Zignoruj tę wiadomość — Twoje hasło pozostanie bez zmian.')}`,
      'Link do resetu hasła Petvio: ' + resetUrl
    ),
  }),

  // Potwierdzenie zmiany hasła
  passwordChanged: ({ name, when }) => ({
    subject: 'Hasło do konta Petvio zostało zmienione',
    html: baseLayout(
      'Bezpieczeństwo konta',
      'Twoje hasło zostało zmienione',
      `<p style="max-width:460px;margin:0 auto;">Cześć ${esc(name)}, potwierdzamy — hasło do Twojego konta Petvio zostało zmienione.</p>
       ${facts([['Kiedy', esc(when)]])}
       <p style="margin-top:26px;">Od teraz logujesz się nowym hasłem.</p>
       ${note('To nie Ty zmieniłeś(aś) hasło? Ktoś mógł przejąć Twoje konto — skontaktuj się z nami natychmiast: <a href="mailto:kontakt@petvio.pl" style="color:#7A7060;font-weight:600;">kontakt@petvio.pl</a>')}`,
      'Hasło do Twojego konta Petvio zostało zmienione.'
    ),
  }),

  // Pożegnanie po usunięciu konta
  accountDeleted: ({ name }) => ({
    subject: 'Twoje konto Petvio zostało usunięte',
    html: baseLayout(
      'Konto',
      'Twoje konto zostało usunięte',
      `<p style="max-width:460px;margin:0 auto;">Cześć ${esc(name)}, potwierdzamy — Twoje konto Petvio wraz z powiązanymi danymi zostało trwale usunięte.</p>
       <p style="margin-top:22px;max-width:460px;margin-left:auto;margin-right:auto;">Szkoda, że odchodzisz. Jeśli kiedyś zechcesz wrócić — rejestracja zajmuje dosłownie chwilę.</p>
       ${button(`${SITE}/register`, 'Wróć do Petvio')}`,
      'Potwierdzenie usunięcia konta w serwisie Petvio.'
    ),
  }),

  // Ogólne powiadomienie e-mail (ważne zdarzenia z notify())
  notification: ({ name, title, body, link }) => ({
    subject: String(title).slice(0, 150),
    html: baseLayout(
      'Powiadomienie',
      esc(title),
      `<p style="max-width:460px;margin:0 auto;">Cześć ${esc(name)},</p>
       ${body ? `<p style="max-width:460px;margin:18px auto 0;">${esc(body)}</p>` : ''}
       ${link ? button(`${SITE}${esc(link)}`, 'Zobacz w Petvio') : ''}
       <p style="margin-top:26px;font-size:13px;color:#9A9285;">To powiadomienie znajdziesz też pod dzwonkiem w aplikacji.</p>`,
      String(body || title).slice(0, 120)
    ),
  }),

  // Zaproszenie do współdzielenia pupila
  shareInvite: ({ inviterName, inviterEmail, petNames, roleLabel, acceptUrl }) => ({
    subject: `${esc(inviterName)} zaprasza Cię do opieki nad ${esc(petNames)}`,
    html: baseLayout(
      'Współdzielenie',
      `Zaproszenie do opieki nad ${esc(petNames)}`,
      `<p style="max-width:460px;margin:0 auto;"><strong>${esc(inviterName)}</strong> (${esc(inviterEmail)}) zaprosił(a) Cię jako <strong>${esc(roleLabel)}</strong> do współdzielenia profilu pupila: <strong>${esc(petNames)}</strong>.</p>
       <p style="max-width:460px;margin:18px auto 0;">Po zaakceptowaniu zobaczysz udostępnione sekcje profilu — książeczkę zdrowia, karmienie i dokumenty.</p>
       ${button(acceptUrl, 'Otwórz Petvio i zaakceptuj')}
       ${divider}
       <p style="font-size:13px;color:#9A9285;">Nie masz jeszcze konta? Załóż je na ten adres e-mail, a zaproszenie będzie na Ciebie czekało.</p>`,
      `${inviterName} zaprosił(a) Cię do opieki nad ${petNames} w Petvio.`
    ),
  }),

  // Powiadomienie o zaakceptowaniu zaproszenia (do właściciela)
  shareAccepted: ({ ownerName, inviteeName, petNames }) => ({
    subject: `${esc(inviteeName)} zaakceptował(a) Twoje zaproszenie`,
    html: baseLayout(
      'Współdzielenie',
      'Zaproszenie zaakceptowane',
      `<p style="max-width:460px;margin:0 auto;">Cześć ${esc(ownerName)}, <strong>${esc(inviteeName)}</strong> zaakceptował(a) Twoje zaproszenie do współdzielenia profilu: <strong>${esc(petNames)}</strong>.</p>
       <p style="max-width:460px;margin:18px auto 0;">Osoba ma teraz dostęp do udostępnionych sekcji profilu. Uprawnienia możesz w każdej chwili zmienić lub odebrać.</p>
       ${button(`${SITE}/dashboard/sharing`, 'Zarządzaj dostępem')}`,
      `${inviteeName} zaakceptował(a) zaproszenie do opieki nad ${petNames}.`
    ),
  }),

  // Odebranie dostępu (do zaproszonego)
  shareRevoked: ({ ownerName, petNames }) => ({
    subject: `${esc(ownerName)} odebrał(a) dostęp do profilu pupila`,
    html: baseLayout(
      'Współdzielenie',
      'Dostęp odebrany',
      `<p style="max-width:460px;margin:0 auto;"><strong>${esc(ownerName)}</strong> odebrał(a) Ci dostęp do współdzielonego profilu: <strong>${esc(petNames)}</strong>.</p>
       <p style="max-width:460px;margin:18px auto 0;">Jeśli uważasz, że to pomyłka — skontaktuj się bezpośrednio z właścicielem pupila.</p>`,
      `${ownerName} odebrał(a) Ci dostęp do profilu ${petNames}.`
    ),
  }),

  // Test konfiguracji poczty (admin)
  test: () => ({
    subject: 'Test poczty — Petvio.pl',
    html: baseLayout(
      'Konfiguracja',
      'Poczta Petvio działa poprawnie',
      `<p style="max-width:460px;margin:0 auto;">Jeśli widzisz tę wiadomość, integracja Resend w Petvio działa poprawnie — powiadomienia e-mail docierają do użytkowników.</p>
       ${facts([['Wysłano', new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })]])}`,
      'Test konfiguracji poczty Petvio.pl'
    ),
  }),
};

// Wysyłka przez Resend — wywoływana dopiero gdy RESEND_API_KEY jest ustawiony.
const sendMail = async ({ to, subject, html }) => {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email] RESEND_API_KEY nie ustawiony — pomijam wysyłkę do ${to} (temat: "${subject}")`);
    return { skipped: true };
  }
  try {
    const axios = require('axios');
    await axios.post(
      'https://api.resend.com/emails',
      { from: RESEND_FROM, to: [to], subject, html },
      {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );
    return { sent: true };
  } catch (error) {
    console.error('[email] Błąd wysyłki przez Resend:', error?.response?.data || error.message);
    return { sent: false, error: error.message };
  }
};

// Wyślij szablon po nazwie — fire-and-forget w kontrolerach.
const sendTemplate = async (to, templateName, data = {}) => {
  const make = templates[templateName];
  if (!make || !to) return { error: 'unknown template' };
  const tpl = make(data);
  return sendMail({ to, subject: tpl.subject, html: tpl.html });
};

module.exports = { templates, sendMail, sendTemplate };
