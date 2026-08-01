const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-streams-adapter');
const { getRedisClient } = require('../services/redisClient');
const { authenticateSocket } = require('./socketAuth');
const { setRealtimeServer } = require('./realtimeHub');
const { registerTrackingGateway } = require('./trackingGateway');

const splitOrigins = (value) => String(value || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const createRealtimeServer = async (app) => {
  const httpServer = http.createServer(app);
  const allowedOrigins = splitOrigins(process.env.SOCKET_ALLOWED_ORIGINS || process.env.CLIENT_URL || 'http://localhost:8080');
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: false,
    },
    maxHttpBufferSize: 32 * 1024,
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  const redisClient = await getRedisClient();
  if (redisClient?.isReady) {
    io.adapter(createAdapter(redisClient, {
      streamName: process.env.SOCKET_REDIS_STREAM || 'wellcare:socket.io',
      maxLen: Number(process.env.SOCKET_REDIS_STREAM_MAXLEN) || 10000,
    }));
    console.log('Socket.IO Redis Streams adapter enabled');
  } else {
    console.warn('Socket.IO is using the in-memory adapter; suitable only for one backend instance.');
  }

  io.use(authenticateSocket);
  setRealtimeServer(io);
  registerTrackingGateway(io);
  return { httpServer, io };
};

module.exports = { createRealtimeServer };