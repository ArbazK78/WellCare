const Guide = require('../models/Guide');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.registerGuide = async (req, res) => {
  try {
    const { name, phone, password, email, location, experience, bio } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ message: 'Name, phone, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const rawSpecialties = req.body.specialties || req.body['specialties[]'] || [];
    const specialties = Array.isArray(rawSpecialties) ? rawSpecialties : [rawSpecialties];
    const profilePhoto = req.files?.profile_picture?.[0];
    const governmentId = req.files?.government_id?.[0];
    if (!profilePhoto || !governmentId) {
      return res.status(400).json({ message: 'Profile photo and government ID are required' });
    }

    const existingGuide = await Guide.findOne({ phone });
    if (existingGuide) {
      return res.status(400).json({ message: "Guide with this phone already exists" });
    }

    const newGuide = new Guide({
      name,
      phone,
      email,
      password, // hashed via pre-save hook in model
      status: 'pending',
      location,
      experience,
      specialties,
      bio,
      image: profilePhoto
        ? req.protocol + '://' + req.get('host') + '/uploads/guide-profiles/' + profilePhoto.filename
        : undefined,
      governmentIdDocument: governmentId?.path,
    });

    await newGuide.save();

    // BC-12 fix: Never return password hash — return only safe fields
    res.status(201).json({
      message: "Guide registration submitted successfully",
      guide: {
        id: newGuide._id,
        name: newGuide.name,
        phone: newGuide.phone,
        email: newGuide.email,
        status: newGuide.status,
      }
    });
  } catch (error) {
    console.error("Error registering guide:", error);
    res.status(500).json({ message: "Server error during guide registration" });
  }
};

// Helper to build a safe guide object (never exposes password hash)
const safeGuide = (guide) => ({
  _id: guide._id,
  name: guide.name,
  phone: guide.phone,
  email: guide.email,
  status: guide.status,
  isOnline: guide.isOnline,
  location: guide.location,
  experience: guide.experience,
  specialties: guide.specialties,
  bio: guide.bio,
  image: guide.image,
  rating: guide.rating,
  languages: guide.languages,
  vehicleType: guide.vehicleType,
});

exports.loginGuide = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const guide = await Guide.findOne({ phone });
    if (!guide) {
      return res.status(404).json({ message: "Guide not found" });
    }

    const isMatch = await bcrypt.compare(password, guide.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // BC-12 fix: Return only safe fields — no password hash
    if (guide.status === "pending") {
      return res.status(200).json({ status: "pending", guide: safeGuide(guide) });
    }

    if (guide.status === "rejected") {
      return res.status(200).json({ status: "rejected", guide: safeGuide(guide) });
    }

    // If approved, force offline on new session
    guide.isOnline = false;
    await guide.save();

    const token = jwt.sign(
      { id: guide._id, role: 'guide' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      status: "success",
      token,
      guide: safeGuide(guide),
    });

  } catch (error) {
    console.error("Guide login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// BC-2 fix: Reset password is now protected — guide must be authenticated.
// The guide provides their current password for verification before setting a new one.
// NOTE: When the real OTP service is implemented, this will use OTP instead.
exports.resetPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const guideId = req.guide?.id;

  if (!guideId) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current password and new password are required." });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters." });
  }

  try {
    const guide = await Guide.findById(guideId);
    if (!guide) {
      return res.status(404).json({ message: "Guide not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, guide.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    // Assign new password — pre-save hook will hash it
    guide.password = newPassword;
    await guide.save();

    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error while resetting password." });
  }
};
