var express = require('express');
var router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middlewares/auth');

// GET /users/me - current user profile
router.get('/me', requireAuth, userController.me);

// PUT /users/update - update profile
router.put('/update', requireAuth, userController.update);

// GET /users/trips - list current user's trips
router.get('/trips', requireAuth, userController.trips);

// DELETE /users/account - soft delete account
router.delete('/account', requireAuth, userController.deleteAccount);

module.exports = router;
