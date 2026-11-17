// Testowa wysyłka maili PetVio przez Resend.
// Użycie: node scripts/test-mail.js <adres-email> [szablon]
//   szablon: test | welcome | loginAlert | passwordChanged | accountDeleted |
//            notification | shareInvite | shareAccepted | shareRevoked | all (domyślnie: test)
require('dotenv').config();
const { templates, sendMail } = require('../src/utils/email.templates');

const to = process.argv[2];
const which = (process.argv[3] || 'test').toLowerCase();

const SAMPLES = {
  test: () => templates.test(),
  shareInvite: () => templates.shareInvite({
    inviterName: 'Hubert Samek',
    inviterEmail: 'hubert.samek@petvio.pl',
    petNames: 'Maksio (mops)',
    roleLabel: 'Opiekun',
    acceptUrl: 'https://petvio.pl/dashboard/sharing',
  }),
  shareAccepted: () => templates.shareAccepted({
    ownerName: 'Jan',
    inviteeName: 'Hubert Samek',
    petNames: 'Maksio (mops)',
  }),
  shareRevoked: () => templates.shareRevoked({
    ownerName: 'Jan Kowalski',
    petNames: 'Maksio (mops)',
  }),
  welcome: () => templates.welcome({ name: 'Hubert' }),
  loginAlert: () => templates.loginAlert({
    name: 'Hubert',
    when: new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' }),
    ip: '83.10.5.100',
    userAgent: 'Petvio App (iPhone; iOS 18.2)',
  }),
  passwordChanged: () => templates.passwordChanged({
    name: 'Hubert',
    when: new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' }),
  }),
  accountDeleted: () => templates.accountDeleted({ name: 'Hubert' }),
  notification: () => templates.notification({
    name: 'Hubert',
    title: 'Nowe zaproszenie do znajomych',
    body: 'Anna Kowalska chce dodać Cię do znajomych.',
    link: '/dashboard/community',
  }),
};

if (!to) {
  console.error('Użycie: node scripts/test-mail.js <adres-email> [test|shareInvite|shareAccepted|all]');
  process.exit(1);
}

(async () => {
  const names = which === 'all' ? Object.keys(SAMPLES) : [which];
  for (const name of names) {
    const fn = SAMPLES[name];
    if (!fn) {
      console.error(`Nieznany szablon "${name}". Dostępne: ${Object.keys(SAMPLES).join(', ')}, all`);
      process.exit(1);
    }
    const tpl = fn();
    const r = await sendMail({ to, subject: tpl.subject, html: tpl.html });
    console.log(
      r.sent ? `✓ [${name}] wysłano do ${to}` :
      r.skipped ? `⚠ [${name}] pominięto — brak RESEND_API_KEY w .env` :
      `✗ [${name}] błąd: ${r.error}`
    );
  }
})();
