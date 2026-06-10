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

// GET all approved guides
router.get('/approved', async (req, res) => {
  try {
    const guides = await Guide.find({ status: 'approved' });
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


// TEMP: Get all guides (ignore approval status for now)
router.get('/all', async (req, res) => {
  try {
    const guides = await Guide.find(); // no filter
    res.json(guides);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch guides." });
  }
});

// PUT /guides/update-profile - update logged-in guide's profile
router.put("/update-profile", verifyGuideToken, async (req, res) => {
  try {
    console.log("🛠️ Update profile request received");

    const guideId = req.guide.id; // ✅ This now works
    const updateData = req.body;

    console.log("Guide ID:", guideId);
    console.log("Update Data:", updateData);

    if (!guideId) {
      console.error("❌ Guide ID missing from token");
      return res.status(400).json({ message: "Guide ID missing" });
    }

    const updatedGuide = await Guide.findByIdAndUpdate(
      guideId,
      { $set: updateData },
      { new: true }
    );

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

// ✅ Route to reset password
router.post('/reset-password', guideController.resetPassword);

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


