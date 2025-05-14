// server/src/controllers/userController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Register user
exports.register = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    
    // Check if user already exists
    let user = await User.findOne({ phone });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this phone number' });
    }
    
    // Create new user
    user = new User({
      name,
      phone,
      email,
      password
    });
    
    await user.save();
    
    // Create token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
// ✅ Updated Login: No auto-registration here
exports.login = async (req, res) => {
  try {
    const { phone } = req.body;

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json({ message: 'Phone number not registered' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, savedAddresses } = req.body;
    
    // Build user object
    const userFields = {};
    if (name) userFields.name = name;
    if (email) userFields.email = email;
    if (savedAddresses) userFields.savedAddresses = savedAddresses;
    
    // Update user
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: userFields },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.checkUserExists = async (req, res) => {
  const { phone, email } = req.body;
  const errors = [];

  try {
    const phoneExists = await User.findOne({ phone });
    const emailExists = await User.findOne({ email });

    if (phoneExists) {
      errors.push({ field: "phone", message: "Phone number already registered" });
    }

    if (emailExists) {
      errors.push({ field: "email", message: "Email already registered" });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ checkUserExists error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
