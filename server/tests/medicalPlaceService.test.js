const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createMedicalPlaceService,
  isMedicalPlace,
} = require('../src/services/medicalPlaceService');

const destination = JSON.stringify({
  name: 'WellCare Hospital',
  placeId: 'medical-place-1',
  placeTypes: ['hospital', 'health'],
});

test('recognises supported hospitals and clinics', () => {
  assert.equal(isMedicalPlace(['hospital', 'establishment']), true);
  assert.equal(isMedicalPlace(['medical_clinic', 'doctor']), true);
  assert.equal(isMedicalPlace(['restaurant', 'establishment']), false);
});

test('requires a Google Place ID', async () => {
  const service = createMedicalPlaceService({ apiKey: 'test-key', fetchImpl: async () => null });
  await assert.rejects(
    service.verifyDestination('A typed hospital name'),
    (error) => error.code === 'DESTINATION_PLACE_REQUIRED' && error.statusCode === 422
  );
});

test('fails closed when the Places API key is missing', async () => {
  const service = createMedicalPlaceService({ apiKey: '' });
  await assert.rejects(
    service.verifyDestination(destination),
    (error) => error.code === 'PLACES_API_NOT_CONFIGURED' && error.statusCode === 503
  );
});

test('accepts a provider-verified medical destination', async () => {
  let request;
  const service = createMedicalPlaceService({
    apiKey: 'test-key',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({
          id: 'medical-place-1',
          types: ['general_hospital', 'hospital'],
          primaryType: 'general_hospital',
        }),
      };
    },
  });

  const result = await service.verifyDestination(destination);

  assert.match(request.url, /places\/medical-place-1$/);
  assert.equal(request.options.headers['X-Goog-FieldMask'], 'id,types,primaryType');
  assert.equal(result.placeId, 'medical-place-1');
  assert.equal(result.primaryType, 'general_hospital');
});

test('rejects a place whose authoritative Google types are not medical', async () => {
  const service = createMedicalPlaceService({
    apiKey: 'test-key',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        id: 'medical-place-1',
        types: ['shopping_mall', 'establishment'],
        primaryType: 'shopping_mall',
      }),
    }),
  });

  await assert.rejects(
    service.verifyDestination(destination),
    (error) => error.code === 'DESTINATION_NOT_MEDICAL' && error.statusCode === 422
  );
});
