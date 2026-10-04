const axios = require('axios');

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_PLACES_API_KEY) {
  console.warn('WARNING: GOOGLE_PLACES_API_KEY not set in environment variables');
}

/**
 * Search for nearby places (veterinary clinics, dietitians, etc.)
 * GET /api/places/nearby?lat=52.23&lng=21.01&radius=5000&type=veterinary_care
 */
exports.nearbySearch = async (req, res) => {
  try {
    const { lat, lng, radius = 5000, type = 'veterinary_care' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        error: {
          message: 'Latitude and longitude are required',
          status: 400,
        },
      });
    }

    if (!GOOGLE_PLACES_API_KEY) {
      // Return mock data if API key is not set
      return res.json({
        places: getMockPlaces(parseFloat(lat), parseFloat(lng), type),
        usingMockData: true,
      });
    }

    const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
    const params = {
      location: `${lat},${lng}`,
      radius: radius,
      type: type,
      key: GOOGLE_PLACES_API_KEY,
      language: 'pl',
      fields: 'name,formatted_address,formatted_phone_number,website,rating,reviews,opening_hours,geometry,photos,business_status',
    };

    let allPlaces = [];
    let nextPageToken = null;
    let pageCount = 0;
    const maxPages = 3; // Get up to 3 pages (60 results max)

    do {
      const response = await axios.get(url, { params });

      if (response.data.status === 'OK' || response.data.status === 'ZERO_RESULTS') {
        // Fetch detailed information for each place using Place Details API
        const placesWithDetails = await Promise.all(
          response.data.results.map(async (place) => {
            let is24h = false;
            let detailedHours = null;
            let isOpenNow = null;
            let phone = place.formatted_phone_number || null;
            let website = place.website || null;

            try {
              // Fetch detailed place information
              const detailsUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
              const detailsParams = {
                place_id: place.place_id,
                key: GOOGLE_PLACES_API_KEY,
                language: 'pl',
                fields: 'name,formatted_address,formatted_phone_number,website,rating,reviews,opening_hours,geometry,photos,business_status',
              };

              const detailsResponse = await axios.get(detailsUrl, { params: detailsParams });

              if (detailsResponse.data.status === 'OK') {
                const details = detailsResponse.data.result;
                detailedHours = details.opening_hours?.weekday_text || null;
                isOpenNow = details.opening_hours?.open_now || null;
                phone = details.formatted_phone_number || null;
                website = details.website || null;

                // Check if 24/7 by analyzing detailed opening hours
                if (details.opening_hours?.weekday_text) {
                  const hoursText = details.opening_hours.weekday_text.join(' ').toLowerCase();
                  
                  // Check for common 24/7 patterns in the text
                  is24h = hoursText.includes('24/7') ||
                           hoursText.includes('24 godziny') ||
                           hoursText.includes('całodobowa') ||
                           hoursText.includes('open 24 hours') ||
                           hoursText.includes('12:00 am – 12:00 am') ||
                           hoursText.includes('12:00 am-12:00 am') ||
                           hoursText.includes('0:00 – 0:00') ||
                           hoursText.includes('0:00-0:00') ||
                           hoursText.includes('00:00 – 00:00') ||
                           hoursText.includes('00:00-00:00') ||
                           hoursText.includes('czynne całą dobę') ||
                           // Check if all days have the same 24h pattern
                           (hoursText.match(/12:00 am – 12:00 am/g) || []).length >= 5 ||
                           (hoursText.match(/0:00 – 0:00/g) || []).length >= 5 ||
                           (hoursText.match(/00:00 – 00:00/g) || []).length >= 5 ||
                           (hoursText.match(/czynne całą dobę/g) || []).length >= 5;
                }
              }
            } catch (error) {
              console.error('Error fetching place details for', place.name, ':', error.message);
              // Fall back to basic data if details fetch fails
              detailedHours = place.opening_hours?.weekday_text || null;
              isOpenNow = place.opening_hours?.open_now || null;
            }

            const result = {
              id: place.place_id,
              name: place.name,
              address: place.vicinity || place.formatted_address || '',
              location: {
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng,
              },
              rating: place.rating,
              userRatingsTotal: place.user_ratings_total,
              types: place.types,
              openingHours: detailedHours,
              isOpenNow: isOpenNow,
              photos: place.photos?.map(photo => photo.photo_reference) || [],
              businessStatus: place.business_status,
              phone: phone,
              website: website,
              is24h: is24h,
            };
            
            return result;
          })
        );

        allPlaces = [...allPlaces, ...placesWithDetails];
        nextPageToken = response.data.next_page_token;
        pageCount++;

        // If there's a next page token, wait a bit before fetching next page (Google API requirement)
        if (nextPageToken && pageCount < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          delete params.type; // Don't include type in subsequent pages
          params.pagetoken = nextPageToken;
        }
      } else {
        console.error('Google Places API error:', response.data.status);
        break;
      }
    } while (nextPageToken && pageCount < maxPages);

    if (allPlaces.length > 0) {
      return res.json({
        places: allPlaces,
        usingMockData: false,
      });
    } else {
      // Fallback to mock data if no results
      return res.json({
        places: getMockPlaces(parseFloat(lat), parseFloat(lng), type),
        usingMockData: true,
        error: response.data.status,
      });
    }
  } catch (error) {
    console.error('Error in nearbySearch:', error.message);
    // Fallback to mock data on error
    return res.json({
      places: getMockPlaces(parseFloat(req.query.lat), parseFloat(req.query.lng), req.query.type),
      usingMockData: true,
      error: error.message,
    });
  }
};

/**
 * Get detailed information about a specific place
 * GET /api/places/details/:placeId
 */
exports.getPlaceDetails = async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!GOOGLE_PLACES_API_KEY) {
      return res.status(400).json({
        error: {
          message: 'Google Places API key not configured',
          status: 400,
        },
      });
    }

    const url = 'https://maps.googleapis.com/maps/api/place/details/json';
    const params = {
      place_id: placeId,
      key: GOOGLE_PLACES_API_KEY,
      language: 'pl',
      fields: 'name,formatted_address,formatted_phone_number,website,rating,reviews,opening_hours,geometry,photos',
    };

    const response = await axios.get(url, { params });

    if (response.data.status === 'OK') {
      const place = response.data.result;
      return res.json({
        id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        phone: place.formatted_phone_number,
        website: place.website,
        rating: place.rating,
        reviews: place.reviews?.map(review => ({
          author: review.author_name,
          rating: review.rating,
          text: review.text,
          time: review.relative_time_description,
        })) || [],
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
        openingHours: place.opening_hours?.weekday_text || null,
        isOpenNow: place.opening_hours?.open_now || null,
        photos: place.photos?.map(photo => photo.photo_reference) || [],
      });
    } else {
      return res.status(400).json({
        error: {
          message: response.data.error_message || 'Failed to get place details',
          status: 400,
        },
      });
    }
  } catch (error) {
    console.error('Error in getPlaceDetails:', error.message);
    return res.status(500).json({
      error: {
        message: 'Failed to get place details',
        status: 500,
      },
    });
  }
};

/**
 * Autocomplete for place search
 * GET /api/places/autocomplete?input=weterynarz&location=52.23,21.01
 */
exports.autocomplete = async (req, res) => {
  try {
    const { input, location } = req.query;

    if (!input) {
      return res.status(400).json({
        error: {
          message: 'Input query is required',
          status: 400,
        },
      });
    }

    if (!GOOGLE_PLACES_API_KEY) {
      return res.json({ predictions: [] });
    }

    const url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
    const params = {
      input: input,
      key: GOOGLE_PLACES_API_KEY,
      language: 'pl',
      types: 'establishment',
    };

    if (location) {
      params.location = location;
      params.radius = 50000;
    }

    const response = await axios.get(url, { params });

    if (response.data.status === 'OK') {
      const predictions = response.data.predictions.map(pred => ({
        placeId: pred.place_id,
        description: pred.description,
        terms: pred.terms,
      }));

      return res.json({ predictions });
    } else {
      return res.json({ predictions: [] });
    }
  } catch (error) {
    console.error('Error in autocomplete:', error.message);
    return res.json({ predictions: [] });
  }
};

/**
 * Mock data for when Google Places API is not available
 */
function getMockPlaces(lat, lng, type) {
  const basePlaces = [
    {
      id: 'mock_1',
      name: 'Klinika Weterynaryjna "Paw"',
      address: 'ul. Kowalska 15, Warszawa',
      location: { lat: lat + 0.01, lng: lng + 0.01 },
      rating: 4.8,
      userRatingsTotal: 156,
      types: ['veterinary_care', 'health'],
      openingHours: ['Pon-Pt: 8:00-20:00', 'Sob: 9:00-15:00'],
      isOpenNow: true,
      businessStatus: 'OPERATIONAL',
    },
    {
      id: 'mock_2',
      name: 'Gabinet Dietetyczny Zwierząt',
      address: 'ul. Nowicka 8, Warszawa',
      location: { lat: lat - 0.01, lng: lng + 0.02 },
      rating: 4.5,
      userRatingsTotal: 89,
      types: ['health', 'nutrition'],
      openingHours: ['Pon-Pt: 9:00-18:00'],
      isOpenNow: true,
      businessStatus: 'OPERATIONAL',
    },
    {
      id: 'mock_3',
      name: 'VetCenter 24h',
      address: 'ul. Marszałkowska 42, Warszawa',
      location: { lat: lat + 0.02, lng: lng - 0.01 },
      rating: 4.2,
      userRatingsTotal: 234,
      types: ['veterinary_care', 'health'],
      openingHours: ['24/7'],
      isOpenNow: true,
      businessStatus: 'OPERATIONAL',
    },
  ];

  // Filter by type if specified
  if (type === 'veterinary_care') {
    return basePlaces.filter(p => p.types.includes('veterinary_care'));
  } else if (type === 'nutrition' || type === 'dietitian') {
    return basePlaces.filter(p => p.types.includes('nutrition'));
  }

  return basePlaces;
}
