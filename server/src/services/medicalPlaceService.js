const PLACE_DETAILS_BASE_URL = 'https://places.googleapis.com/v1/places';

const MEDICAL_PLACE_TYPES = Object.freeze([
  'hospital',
  'general_hospital',
  'medical_clinic',
  'medical_center',
  'doctor',
]);

class MedicalDestinationError extends Error {
  constructor(message, statusCode = 422, code = 'INVALID_MEDICAL_DESTINATION') {
    super(message);
    this.name = 'MedicalDestinationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const parseLocationInput = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const isMedicalPlace = (types = []) =>
  Array.isArray(types) && types.some((type) => MEDICAL_PLACE_TYPES.includes(type));

const createMedicalPlaceService = ({
  fetchImpl = global.fetch,
  apiKey = process.env.GOOGLE_PLACES_SERVER_API_KEY,
} = {}) => ({
  async verifyDestination(destinationAddress) {
    const destination = parseLocationInput(destinationAddress);
    const placeId = typeof destination?.placeId === 'string' ? destination.placeId.trim() : '';

    if (!placeId) {
      throw new MedicalDestinationError(
        'Select a hospital or clinic from the Google Maps suggestions.',
        422,
        'DESTINATION_PLACE_REQUIRED'
      );
    }
    if (!apiKey) {
      throw new MedicalDestinationError(
        'Medical destination verification is temporarily unavailable.',
        503,
        'PLACES_API_NOT_CONFIGURED'
      );
    }
    if (typeof fetchImpl !== 'function') {
      throw new MedicalDestinationError(
        'Medical destination verification is temporarily unavailable.',
        503,
        'PLACES_PROVIDER_UNAVAILABLE'
      );
    }

    let response;
    try {
      response = await fetchImpl(`${PLACE_DETAILS_BASE_URL}/${encodeURIComponent(placeId)}`, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'id,types,primaryType',
        },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new MedicalDestinationError(
        'Unable to verify this medical facility right now. Please try again.',
        502,
        'PLACES_PROVIDER_UNAVAILABLE'
      );
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new MedicalDestinationError(
          'This destination is no longer available on Google Maps. Please choose another facility.',
          422,
          'DESTINATION_PLACE_NOT_FOUND'
        );
      }
      throw new MedicalDestinationError(
        'Unable to verify this medical facility right now. Please try again.',
        502,
        'PLACES_PROVIDER_ERROR'
      );
    }

    const place = await response.json();
    if (place.id !== placeId || !isMedicalPlace(place.types)) {
      throw new MedicalDestinationError(
        'WellCare destinations must be hospitals or clinics verified by Google Maps.',
        422,
        'DESTINATION_NOT_MEDICAL'
      );
    }

    return {
      placeId: place.id,
      placeTypes: place.types,
      primaryType: place.primaryType || null,
    };
  },
});

const defaultService = createMedicalPlaceService();

module.exports = {
  MEDICAL_PLACE_TYPES,
  MedicalDestinationError,
  createMedicalPlaceService,
  isMedicalPlace,
  parseLocationInput,
  verifyDestination: defaultService.verifyDestination,
};
