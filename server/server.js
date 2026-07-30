// Force Node.js to use Google DNS to fix SRV lookup issues in Node 20+
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// BL-3 fix: Add helmet for basic security headers
app.use(helmet());

// CORS must run before rate limiting so even throttled responses include the
// browser's access-control headers. Otherwise a legitimate 429 is misleadingly
// surfaced by Chrome as a CORS failure.
const corsMiddleware = cors({
  origin: process.env.CLIENT_URL || 'http://localhost:8080',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  optionsSuccessStatus: 200,
});
app.use(corsMiddleware);
app.options(/.*/, corsMiddleware);

// Protect state-changing API operations without charging the budget for
// browser preflights or authenticated dashboard polling. Sensitive endpoints
// such as fare estimates and PIN attempts retain their stricter route limiters.
const apiMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS' || req.method === 'GET',
  message: { message: 'Too many changes were requested. Please wait a moment and try again.' },
});
app.use('/api', apiMutationLimiter);
// BM-9 fix: Add a strict 1MB size limit to JSON parsing to prevent DoS via large payloads
app.use(express.json({ limit: '1mb' }));
app.use(
  '/uploads/guide-profiles',
  express.static(path.join(__dirname, 'uploads', 'guide-profiles'), {
    fallthrough: false,
    maxAge: '1d',
  })
);

// Mount routes
const guideRoutes = require('./src/routes/guideRoutes');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');

// BM-10 fix: Validate MongoDB ObjectId format for common params to prevent CastError -> 500
const { Types: { ObjectId } } = mongoose;
const validateObjectId = (req, res, next, id) => {
  if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid ID format' });
  next();
};
app.param('id', validateObjectId);
app.param('bookingId', validateObjectId);
app.param('guideId', validateObjectId);
app.param('notificationId', validateObjectId);

app.use('/api/guides', guideRoutes);
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);


const dispatchService = require('./src/services/dispatchService');
const scheduledBookingService = require('./src/services/scheduledBookingService');

// BL-4 fix: MongoDB reconnection handling
mongoose.connection.on('disconnected', () => {
  console.log('❌ MongoDB disconnected!');
});
mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected!');
});

// DB connection (URI kept secret — loaded from .env);
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('✅ MongoDB connected');
    
    // BH-2 fix: Background task to auto-rotate expired offers every 10 seconds.
    // This removes the massive DB pressure of doing it on every guide poll.
    setInterval(() => {
      dispatchService.autoRotateExpiredOffers().catch(err => 
        console.error('Error in background offer rotation:', err)
      );
    }, 10000);

    // Advance reservations through readiness and Cab-only live fallback.
    const processReservations = () => {
      scheduledBookingService.processReservations().catch((error) =>
        console.error('Error processing scheduled reservations:', error)
      );
    };
    processReservations();
    setInterval(processReservations, 30000);

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => console.error('❌ MongoDB connection failed:', err.message));
