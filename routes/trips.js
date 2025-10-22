var express = require('express');
var router = express.Router();
const tripController = require('../controllers/tripController');
const { requireAuth } = require('../middlewares/auth');

// POST /trips/book - create a booking (auth required)
router.post('/book', requireAuth, tripController.book);

// PUT /trips/update-status - change trip status (auth required)
router.put('/update-status', requireAuth, tripController.updateStatus);

// GET /trips/history - list trips for current user (or driver if role=driver)
router.get('/history', requireAuth, tripController.history);

// GET /trips/:id - get a specific trip (auth required)
router.get('/:id', requireAuth, tripController.getById);

module.exports = router;
