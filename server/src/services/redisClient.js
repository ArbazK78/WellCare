const { createClient } = require('redis');

let redisClient = null;
let connectionPromise = null;
let testClientOverride;

const createRedisClient = () => {
  const client = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => Math.min(100 + retries * 250, 5000),
    },
  });
  client.on('error', (error) => {
    console.error('Redis client error:', error.message);
  });
  client.on('reconnecting', () => {
    console.warn('Redis connection interrupted; reconnecting.');
  });
  return client;
};

const getRedisClient = async () => {
  if (testClientOverride !== undefined) return testClientOverride;
  if (!process.env.REDIS_URL) return null;
  if (redisClient?.isReady) return redisClient;

  if (!redisClient) redisClient = createRedisClient();
  if (!connectionPromise) {
    connectionPromise = redisClient.connect()
      .then(() => {
        console.log('Redis connected');
        return redisClient;
      })
      .catch((error) => {
        console.error('Redis connection failed; using single-instance fallback:', error.message);
        connectionPromise = null;
        return null;
      });
  }
  return connectionPromise;
};

const closeRedisClient = async () => {
  if (redisClient?.isOpen) await redisClient.quit();
  redisClient = null;
  connectionPromise = null;
};

const setRedisClientForTests = (client) => {
  testClientOverride = client;
};

const resetRedisClientForTests = () => {
  testClientOverride = undefined;
};

module.exports = {
  closeRedisClient,
  getRedisClient,
  resetRedisClientForTests,
  setRedisClientForTests,
};