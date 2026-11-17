require('dotenv').config();
const admin = require('firebase-admin');
const cert = require('../firebase-service-account.json');
admin.initializeApp({ credential: admin.credential.cert(cert) });
admin.app().options.credential.getAccessToken()
  .then(t => { console.log('AUTH OK — prefix:', t.access_token.slice(0, 25)); process.exit(0); })
  .catch(e => { console.log('AUTH FAIL:', e.message); process.exit(1); });
