const guideController = require('../controllers/guideController');
const express = require('express');
const router = express.Router();
const Guide = require('../models/Guide');
const verifyGuideToken = require('../middlewares/verifyGuideToken');
const verifyAdminToken = require('../middlewares/verifyAdminToken');


router.post('/test', (req, res) => {
  console.log("✅ Reached /guides/test");
  res.json({ message: "Test POST success", body: req.body });
});

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
router.post('/register', guideController.registerGuide);

// POST /api/guides/login
router.post('/login', guideController.loginGuide);


// GET all guides (can filter by status e.g., ?status=approved) — BC-12 fix: strip password hash
router.get('/all', async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    
    // FM-1 fix: Apply query filter to only fetch requested guides (e.g. approved)
    const guides = await Guide.find(query).select('-password');
    res.json(guides);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch guides." });
  }
});

// PUT /guides/update-profile — BC-11 fix: whitelist allowed fields to prevent mass-assignment
router.put("/update-profile", verifyGuideToken, async (req, res) => {
  try {
    const guideId = req.guide.id;

    if (!guideId) {
      return res.status(400).json({ message: "Guide ID missing" });
    }

    // Only these fields can be updated by the guide themselves
    const ALLOWED_FIELDS = ['name', 'email', 'bio', 'location', 'experience', 'specialties', 'languages', 'vehicleType', 'image'];
    const updateData = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const updatedGuide = await Guide.findByIdAndUpdate(
      guideId,
      { $set: updateData },
      { new: true }
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

router.get('/random', guideController.getRandomGuide);

// BC-2 fix: /reset-password now requires guide authentication
// The guide must provide their currentPassword to verify identity
router.post('/reset-password', verifyGuideToken, guideController.resetPassword);

// PUT /guides/:id/status — Admin only (approve/reject)
// NOTE: The primary admin route is POST /api/admin/guides/:id/status
// This route is kept for legacy compat but is now also protected
router.put('/:id/status', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updatedGuide = await Guide.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedGuide) {
      return res.status(404).json({ message: "Guide not found" });
    }

    res.json({ message: "Guide status updated successfully", updatedGuide });
  } catch (err) {
    console.error("Error updating guide status:", err);
    res.status(500).json({ message: "Failed to update guide status" });
  }
});





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
      { new: true, select: '-password' }
    );

    if (!guide) return res.status(404).json({ message: 'Guide not found' });

    console.log(`📡 Guide ${guide.name} is now ${isOnline ? 'ONLINE 🟢' : 'OFFLINE 🔴'}`);
    res.json({ isOnline: guide.isOnline, lastOnlineAt: guide.lastOnlineAt });
  } catch (err) {
    console.error('❌ Error updating online status:', err);
    res.status(500).json({ message: 'Failed to update online status' });
  }
});

module.exports = router;


