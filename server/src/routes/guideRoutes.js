const guideController = require('../controllers/guideController');
const express = require('express');
const router = express.Router();
const Guide = require('../models/Guide');
const verifyGuideToken = require('../middlewares/verifyGuideToken');
const { handleGuideDocumentUpload } = require('../middlewares/guideDocumentUpload');


// GET all approved guides — BC-12 fix: strip password hash
router.get('/approved', async (req, res) => {
  try {
    const guides = await Guide.find({ status: 'approved' }).select('-password');
    res.json(guides);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch approved guides." });
  }
});


// GET /api/guides/profile — returns the logged-in guide's data (used for session restore)
router.get('/profile', verifyGuideToken, async (req, res) => {
  try {
    const guide = await Guide.findById(req.guide.id).select('-password');
    if (!guide) {
      return res.status(404).json({ message: 'Guide not found' });
    }
    res.json(guide);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch guide profile' });
  }
});

// POST /api/guides/register
router.post('/register', handleGuideDocumentUpload, guideController.registerGuide);

// POST /api/guides/login
router.post('/login', guideController.loginGuide);


// PUT /guides/update-profile — BC-11 fix: whitelist allowed fields to prevent mass-assignment
router.put("/update-profile", verifyGuideToken, async (req, res) => {
  try {
    const guideId = req.guide.id;

    if (!guideId) {
      return res.status(400).json({ message: "Guide ID missing" });
    }

    // Only these fields can be updated by the guide themselves
    const ALLOWED_FIELDS = ['name', 'email', 'bio', 'location', 'experience', 'specialties', 'languages', 'vehicleType'];
    const updateData = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const updatedGuide = await Guide.findByIdAndUpdate(
      guideId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedGuide) {
      return res.status(404).json({ message: "Guide not found" });
    }

    res.json({ message: "Profile updated successfully", updatedGuide });
  } catch (err) {
    console.error("❌ Error during profile update:", err);
    res.status(500).json({ message: "Failed to update profile", error: err.message });
  }
});


// BC-2 fix: /reset-password now requires guide authentication
// The guide must provide their currentPassword to verify identity
router.post('/reset-password', verifyGuideToken, guideController.resetPassword);


// PUT /api/guides/online-status
// Guide toggles their own online/offline availability.
// isOnline=true → guide will receive booking notifications (sound + popup).
// isOnline=false → guide is invisible to the notification system.
router.put('/online-status', verifyGuideToken, async (req, res) => {
  try {
    const { isOnline } = req.body;
    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ message: 'isOnline must be a boolean' });
    }

    const update = {
      isOnline,
      ...(isOnline ? { lastOnlineAt: new Date() } : {}),
    };

    const guide = await Guide.findByIdAndUpdate(
      req.guide.id,
      { $set: update },
      { new: true, select: '-password', runValidators: true }
    );

    if (!guide) return res.status(404).json({ message: 'Guide not found' });

    console.log(`📡 Guide ${guide.name} is now ${isOnline ? 'ONLINE 🟢' : 'OFFLINE 🔴'}`);
    res.json({ isOnline: guide.isOnline, lastOnlineAt: guide.lastOnlineAt });
  } catch (err) {
    console.error('❌ Error updating online status:', err);
    res.status(500).json({ message: 'Failed to update online status' });
  }
});

// Persist a guide's latest online coordinates for scheduled readiness ETA checks.
router.put('/location', verifyGuideToken, async (req, res) => {
  try {
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    const accuracy = Number(req.body.accuracy);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ message: 'Valid latitude and longitude are required' });
    }
    if (!Number.isFinite(accuracy) || accuracy < 0) {
      return res.status(400).json({ message: 'Location accuracy is required' });
    }
    const guide = await Guide.findOneAndUpdate(
      { _id: req.guide.id, isOnline: true },
      { $set: { currentLocation: { lat, lng, accuracy, updatedAt: new Date() } } },
      { new: true, select: '_id currentLocation' }
    );
    if (!guide) return res.status(409).json({ message: 'Go online before sharing live location' });
    return res.json({ updatedAt: guide.currentLocation.updatedAt, accuracy: guide.currentLocation.accuracy, precise: guide.currentLocation.accuracy <= 500 });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update guide location' });
  }
});
module.exports = router;
