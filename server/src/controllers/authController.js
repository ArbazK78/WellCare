// server/src/controllers/authController.js
require('dotenv').config(); // Load environment variables
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User'); // Assuming you have a User model
const jwt = require('jsonwebtoken'); // For creating your own JWTs

const googleClientId = process.env.GOOGLE_CLIENT_ID; // Get Google Client ID from .env
const jwtSecret = process.env.JWT_SECRET; // Get JWT secret from .env

const client = new OAuth2Client(googleClientId); // Use your Google Client ID

exports.googleSignIn = async (req, res) => {
  console.log("➡️➡️➡️ INSIDE SIMPLIFIED googleSignIn");
 const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'Google ID token is required.' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: googleClientId, // Ensure the Client ID matches
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture; // Optional profile picture URL

    // Check if the user already exists in your database based on Google ID or email
    let user = await User.findOne({ $or: [{ googleId: googleId }, { email: email }] });

    if (!user) {
      // Create a new user
      user = new User({
        googleId: googleId,
        email: email,
        name: name,
        profilePicture: picture,
        // You might want to set a default password or other initial fields
      });
      await user.save();
    }

    // Create your own application-specific JWT
    const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1h' }); // Adjust expiry as needed

    // Send back the user information and your JWT
    return res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
      },
      token: token,
    });

  } catch (error) {
    console.error('Error verifying Google ID token:', error);
    return res.status(401).json({ message: 'Invalid Google ID token.' });
  }
};