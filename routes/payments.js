var express = require('express');
var router = express.Router();
const paymentController = require('../controllers/paymentController');
const { requireAuth } = require('../middlewares/auth');

// POST /payments/initiate - create or reset a pending payment for a trip
router.post('/initiate', requireAuth, paymentController.initiate);

// POST /payments/verify - mark payment success/failed (mock provider)
router.post('/verify', requireAuth, paymentController.verify);

// GET /payments/:tripId - get payment by trip id
router.get('/:tripId', requireAuth, paymentController.getByTrip);

module.exports = router;
