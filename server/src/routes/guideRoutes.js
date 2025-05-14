const guideController = require('../controllers/guideController');
const express = require('express');
const router = express.Router();
const Guide = require('../models/Guide');
const verifyGuideToken = require('../middlewares/verifyGuideToken');



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


// POST /api/guides/register
router.post('/register', guideController.registerGuide);

// ✅ Add this route for guide login
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

router.put('/:id/status', async (req, res) => {
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



module.exports = router;

