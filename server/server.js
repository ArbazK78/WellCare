require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  optionsSuccessStatus: 200, // ✅ for legacy browser support

}));
app.use(express.json());

// Mount routes with proper prefixes
const guideRoutes = require('./src/routes/guideRoutes');
console.log("✅ guideRoutes loaded:", guideRoutes.stack?.length ?? "No stack");
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes'); // This one you already had
const bookingRoutes = require("./src/routes/bookingRoutes");


app.use('/api/guides', guideRoutes);
app.use('/api', authRoutes);
app.use('/api/users', userRoutes); // Now: /api/users/register, etc.
app.use("/api/bookings", bookingRoutes); // 👈 Add this line


console.log("Mongo URI:", process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => console.error('❌ MongoDB connection failed:', err.message));
