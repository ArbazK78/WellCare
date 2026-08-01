const { getRedisClient } = require('./redisClient');

const LOCATION_TTL_SECONDS = Math.max(15, Number(process.env.TRACKING_LOCATION_TTL_SECONDS) || 45);
const memoryStore = new Map();

const bookingKey = (bookingId) => `wellcare:tracking:booking:${bookingId}:latest`;
const guideKey = (guideId) => `wellcare:tracking:guide:${guideId}:latest`;
const bookingGuideAccessKey = (bookingId) => `wellcare:tracking:booking:${bookingId}:guide-access`;

const setMemory = (key, value) => {
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + LOCATION_TTL_SECONDS * 1000,
  });
};

const getMemory = (key) => {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
};

const setValue = async (key, value) => {
  const client = await getRedisClient();
  const serialized = JSON.stringify(value);
  if (client?.isReady) {
    try {
      await client.set(key, serialized, { EX: LOCATION_TTL_SECONDS });
      return;
    } catch (error) {
      console.error('Redis location write failed; using memory fallback:', error.message);
    }
  }
  setMemory(key, value);
};

const getValue = async (key) => {
  const client = await getRedisClient();
  if (client?.isReady) {
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis location read failed; using memory fallback:', error.message);
    }
  }
  return getMemory(key);
};

const deleteValue = async (key) => {
  memoryStore.delete(key);
  const client = await getRedisClient();
  if (client?.isReady) {
    try {
      await client.del(key);
    } catch (error) {
      console.error('Redis location delete failed:', error.message);
    }
  }
};

const setGuideLocation = async (guideId, location) => {
  await setValue(guideKey(String(guideId)), location);
};

const getGuideLocation = async (guideId) => getValue(guideKey(String(guideId)));

const deleteGuideLocation = async (guideId) => deleteValue(guideKey(String(guideId)));

const setBookingLocation = async (bookingId, location) => {
  await setValue(bookingKey(String(bookingId)), location);
};

const getBookingLocation = async (bookingId) => getValue(bookingKey(String(bookingId)));

const deleteBookingLocation = async (bookingId) => deleteValue(bookingKey(String(bookingId)));

const setBookingGuideAccess = async (bookingId, guideId) => {
  await setValue(bookingGuideAccessKey(String(bookingId)), String(guideId));
};

const getBookingGuideAccess = async (bookingId) => getValue(bookingGuideAccessKey(String(bookingId)));

const deleteBookingGuideAccess = async (bookingId) => deleteValue(bookingGuideAccessKey(String(bookingId)));

const clearMemoryStoreForTests = () => memoryStore.clear();

module.exports = {
  LOCATION_TTL_SECONDS,
  clearMemoryStoreForTests,
  deleteBookingGuideAccess,
  deleteBookingLocation,
  deleteGuideLocation,
  getBookingGuideAccess,
  getBookingLocation,
  getGuideLocation,
  setBookingGuideAccess,
  setBookingLocation,
  setGuideLocation,
};