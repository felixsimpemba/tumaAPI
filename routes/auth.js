var express = require('express');
var router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middlewares/auth');

// POST /auth/request-otp
router.post('/request-otp', authController.requestOtp);

// POST /auth/verify-otp
router.post('/verify-otp', authController.verifyOtp);

// POST /auth/register
router.post('/register', authController.register);

// POST /auth/login
router.post('/login', authController.login);

// POST /auth/logout
router.post('/logout', requireAuth, authController.logout);

module.exports = router;
