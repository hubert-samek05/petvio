const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const placesController = require('../controllers/places.controller');

// Search nearby places (veterinary clinics, dietitians, etc.)
router.get('/nearby', authenticateToken, placesController.nearbySearch);

// Get place details
router.get('/details/:placeId', authenticateToken, placesController.getPlaceDetails);

// Autocomplete for place search
router.get('/autocomplete', authenticateToken, placesController.autocomplete);

// Geocode an address to coordinates — OSM Nominatim
router.get('/geocode', authenticateToken, placesController.geocode);

module.exports = router;
