const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3100;

app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Zbyt wiele żądań z tego adresu IP, spróbuj ponownie później.',
  // Żądania z localhost (health-checki, skrypty serwerowe, testy regresji) nie przechodzą przez publiczny reverse proxy
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
});

app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
// Webhook Stripe wymaga surowego body do weryfikacji podpisu — musi być PRZED express.json()
const { webhook: stripeWebhook } = require('./controllers/stripe.controller');
app.post('/api/subscription/stripe-webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Webhook RevenueCat (IAP iOS) — autoryzacja własnym sekretem, nie JWT
const { webhook: rcWebhook } = require('./controllers/revenuecat.controller');
app.post('/api/subscription/revenuecat-webhook', rcWebhook);

app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Petvio API',
    version: '1.0.0',
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Witaj w Petvio API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      pets: '/api/pets',
      health_records: '/api/health-records',
      health_calendar: '/api/health-calendar',
      food_scanner: '/api/food-scanner',
      calorie_calculator: '/api/calorie-calculator',
      feeding_logs: '/api/feeding-logs',
      special_diets: '/api/special-diets',
      sport_diets: '/api/sport-diets',
      recipes: '/api/recipes',
      barf: '/api/barf',
      specialists: '/api/specialists',
      walks: '/api/walks',
    },
  });
});

const authRoutes = require('./routes/auth.routes');
const petRoutes = require('./routes/pet.routes');
const healthRecordRoutes = require('./routes/health-record.routes');
const calendarRoutes = require('./routes/calendar.routes');
const foodScannerRoutes = require('./routes/food-scanner.routes');
const calorieCalculatorRoutes = require('./routes/calorie-calculator.routes');
const feedingLogRoutes = require('./routes/feeding-log.routes');
const specialDietRoutes = require('./routes/special-diet.routes');
const sportDietRoutes = require('./routes/sport-diet.routes');
const recipeRoutes = require('./routes/recipe.routes');
const barfRoutes = require('./routes/barf.routes');
const specialistRoutes = require('./routes/specialist.routes');
const placesRoutes = require('./routes/places.routes');
const usersRoutes = require('./routes/users.routes');
const adminRoutes = require('./routes/admin.routes');
const walkRoutes = require('./routes/walk.routes');
const herbalAdvisorRoutes = require('./routes/herbal-advisor.routes');
const aiAssistantRoutes = require('./routes/ai-assistant.routes');
const lostPetsRoutes = require('./routes/lost-pets.routes');
const adoptionsRoutes = require('./routes/adoptions.routes');
const sharingRoutes = require('./routes/sharing.routes');
const forumRoutes = require('./routes/forum.routes');
const groupsRoutes = require('./routes/groups.routes');
const postsRoutes = require('./routes/posts.routes');
const businessPagesRoutes = require('./routes/business-pages.routes');
const storiesRoutes = require('./routes/stories.routes');
const shopRoutes = require('./routes/shop.routes');
const friendsRoutes = require('./routes/friends.routes');
const messagesRoutes = require('./routes/messages.routes');
const breedingRoutes = require('./routes/breeding.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const bloodAnalysisRoutes = require('./routes/blood-analysis.routes');
const userPreferencesRoutes = require('./routes/user-preferences.routes');

app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/health-records', healthRecordRoutes);
app.use('/api/health-calendar', calendarRoutes);
app.use('/api/food-scanner', foodScannerRoutes);
app.use('/api/calorie-calculator', calorieCalculatorRoutes);
app.use('/api/feeding-logs', feedingLogRoutes);
app.use('/api/special-diets', specialDietRoutes);
app.use('/api/sport-diets', sportDietRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/barf', barfRoutes);
app.use('/api/specialists', specialistRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/walks', walkRoutes);
app.use('/api/herbal-advisor', herbalAdvisorRoutes);
app.use('/api/ai-assistant', aiAssistantRoutes);
app.use('/api/lost-pets', lostPetsRoutes);
app.use('/api/adoptions', adoptionsRoutes);
app.use('/api/sharing', sharingRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/business-pages', businessPagesRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/breeding', breedingRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/blood-analyses', bloodAnalysisRoutes);
app.use('/api/user-preferences', userPreferencesRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Wystąpił błąd serwera',
      status: err.status || 500,
    },
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint nie został znaleziony',
      status: 404,
    },
  });
});

require('./jobs/reminders').start();

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║                                       ║
║     🐾 Petvio API Server 🐾          ║
║                                       ║
║     Status: Running                   ║
║     Port: ${PORT}                        ║
║     Environment: ${process.env.NODE_ENV || 'development'}           ║
║                                       ║
╚═══════════════════════════════════════╝
  `);
});

module.exports = app;
