const guideController = require('../controllers/guideController');
const express = require('express');
const router = express.Router();
const Guide = require('../models/Guide');
const verifyGuideToken = require('../middlewares/verifyGuideToken');
const { handleGuideDocumentUpload } = require('../middlewares/guideDocumentUpload');
const {
  deleteGuideLocation,
  getGuideLocation,
  setBookingLocation,
  setGuideLocation,
} = require('../services/liveLocationStore');
const {
  LocationValidationError,
  normalizeLocationPayload,
  validateMovement,
} = require('../services/locationValidationService');
const {
  TrackingAuthorizationError,
  authorizeGuideLocation,
} = require('../realtime/trackingAuthorization');
const { emitGuideLocation } = require('../realtime/realtimeHub');


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

    // A deliberate online transition starts a fresh GPS session baseline.
    await deleteGuideLocation(guide._id);
    await Guide.updateOne({ _id: guide._id }, { $unset: { currentLocation: 1 } });

    console.log(`📡 Guide ${guide.name} is now ${isOnline ? 'ONLINE 🟢' : 'OFFLINE 🔴'}`);
    res.json({ isOnline: guide.isOnline, lastOnlineAt: guide.lastOnlineAt });
  } catch (err) {
    console.error('❌ Error updating online status:', err);
    res.status(500).json({ message: 'Failed to update online status' });
  }
});

// Validated REST fallback used only while Socket.IO is disconnected.
router.put('/location', verifyGuideToken, async (req, res) => {
  try {
    const now = Date.now();
    const guideId = String(req.guide.id);
    const guide = await Guide.findOne({ _id: guideId, status: 'approved', isOnline: true }).select('_id currentLocation').lean();
    if (!guide) {
      return res.status(409).json({ code: 'GUIDE_NOT_ONLINE', message: 'Go online before sharing live location' });
    }

    const normalized = normalizeLocationPayload(req.body, now);
    let previous = await getGuideLocation(guideId);
    const persisted = guide.currentLocation;
    if (!previous && persisted?.updatedAt && Number.isFinite(persisted.lat) && Number.isFinite(persisted.lng)) {
      previous = {
        lat: persisted.lat,
        lng: persisted.lng,
        accuracy: persisted.accuracy,
        capturedAt: new Date(persisted.updatedAt).getTime(),
        sequence: -1,
      };
    }
    validateMovement(previous, normalized);

    if (req.body.bookingId) {
      await authorizeGuideLocation(req.body.bookingId, guideId);
    }

    const location = {
      ...normalized,
      guideId,
      serverReceivedAt: now,
      quality: normalized.accuracy <= 500 ? 'good' : 'degraded',
    };
    await setGuideLocation(guideId, location);

    let trackingActive = false;
    if (req.body.bookingId) {
      const bookingLocation = { ...location, bookingId: String(req.body.bookingId) };
      await setBookingLocation(req.body.bookingId, bookingLocation);
      emitGuideLocation(req.body.bookingId, bookingLocation);
      trackingActive = true;
    }

    await Guide.updateOne(
      { _id: guideId, status: 'approved', isOnline: true },
      { $set: { currentLocation: {
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
        updatedAt: new Date(location.serverReceivedAt),
      } } },
    );

    return res.json({ ok: true, trackingActive, location });
  } catch (error) {
    if (error instanceof LocationValidationError || error instanceof TrackingAuthorizationError) {
      return res.status(409).json({ code: error.code, message: error.message });
    }
    console.error('REST guide location fallback failed:', error);
    return res.status(500).json({ code: 'LOCATION_UPDATE_FAILED', message: 'Unable to update guide location' });
  }
});
module.exports = router;
