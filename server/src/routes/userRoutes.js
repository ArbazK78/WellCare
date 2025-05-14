const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyUserToken = require('../middlewares/verifyUserToken'); // No need for 'auth' anymore

// ✅ Protected routes using token verification
router.put('/profile', verifyUserToken, userController.updateProfile);
router.get('/profile', verifyUserToken, userController.getProfile);

// ✅ Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/check-user', userController.checkUserExists);

module.exports = router;
