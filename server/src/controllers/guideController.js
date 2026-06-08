const Guide = require('../models/Guide');
const mongoose = require('mongoose');


exports.registerGuide = async (req, res) => {
  try {
    const { name, phone, password, email, location, experience, specialties, bio } = req.body;

    // Check if guide already exists
    const existingGuide = await Guide.findOne({ phone });
    if (existingGuide) {
      return res.status(400).json({ message: "Guide with this phone already exists" });
    }

    const newGuide = new Guide({
      name,
      phone,
      email,
      password, // This will be hashed via pre-save hook in model
      status: 'pending', // default
      location,
      experience,
      specialties,
      bio,
    });

    await newGuide.save();

    res.status(201).json({
      message: "Guide registration submitted successfully",
      guide: {
        id: newGuide._id,
        name: newGuide.name,
        phone: newGuide.phone,
        email: newGuide.email,
        status: newGuide.status
      }
    });
  } catch (error) {
    console.error("Error registering guide:", error);
    res.status(500).json({ message: "Server error during guide registration" });
  }
};

//Login Function

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

    // Handle based on guide status
    if (guide.status === "pending") {
      return res.status(200).json({
        status: "pending",
        guide
      });
    }

    if (guide.status === "rejected") {
      return res.status(200).json({
        status: "rejected",
        guide
      });
    }


    // If approved
    const token = jwt.sign(
      { id: guide._id }, // ✅ should match what's accessed in middleware
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      status: "success",
      token,
      guide
    });

  } catch (error) {
    console.error("Guide login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getRandomGuide = async (req, res) => {
  const guides = await Guide.find({ status: "approved" });

  if (!guides || guides.length === 0) {
    return res.status(404).json({ message: "No approved guides found." });
  }

  // ✅ Select random guide
  const randomIndex = Math.floor(Math.random() * guides.length);
  const randomGuide = guides[randomIndex];

  res.json(randomGuide);

};

 // Reseting Password
exports.resetPassword = async (req, res) => {
  const { phone, newPassword } = req.body;

  console.log("📦 DB NAME:", mongoose.connection.name);
console.log("📦 COLLECTION:", Guide.collection.name);

  console.log("Guide schema paths:", Object.keys(Guide.schema.paths));
  console.log("RESET PASSWORD BODY:", req.body);


  if (!phone || !newPassword) {
    return res.status(400).json({ message: "Phone number and new password are required." });
  }

  try {
    const guide = await Guide.findOne({ phone });
    console.log("FOUND GUIDE:", guide);


    if (!guide) {
      return res.status(404).json({ message: "Guide not found." });
    }

    console.log("Before:", guide.password);

    
    guide.password = newPassword; // ✅ Plain text password
        console.log("After:", guide.password);

    await guide.save();

    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error while resetting password." });
  }
};

