const express = require('express');
const router = express.Router();
const placesController = require('../controllers/places.controller');

// Search nearby places (veterinary clinics, dietitians, etc.)
router.get('/nearby', placesController.nearbySearch);

// Get place details
router.get('/details/:placeId', placesController.getPlaceDetails);

// Autocomplete for place search
router.get('/autocomplete', placesController.autocomplete);

module.exports = router;
