var express = require('express');
var router = express.Router();
const driverController = require('../controllers/driverController');
const { requireAuth } = require('../middlewares/auth');

// POST /drivers/register - create driver profile + vehicle (auth required)
router.post('/register', requireAuth, driverController.register);

// PUT /drivers/update-status - update online and location (auth required)
router.put('/update-status', requireAuth, driverController.updateStatus);

// GET /drivers/:id - public get driver by id
router.get('/:id', driverController.getById);

// GET /drivers/nearby?lat=&lng=&radiusKm=&limit=
router.get('/', driverController.nearby);

module.exports = router;
