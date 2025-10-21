const driverService = require('../services/driverService');

function send(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function sendError(res, err) {
  const status = err.status || 400;
  return res.status(status).json({ success: false, error: err.message || 'Error' });
}

module.exports = {
  async register(req, res) {
    try {
      const userId = req.user?.sub;
      const { licenseDocUrl, vehicleType, plateNumber, color } = req.body || {};
      const data = await driverService.registerDriver(userId, { licenseDocUrl, vehicleType, plateNumber, color });
      return send(res, data, 201);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async updateStatus(req, res) {
    try {
      const userId = req.user?.sub;
      const { online, lat, lng, status } = req.body || {};
      const data = await driverService.updateStatus(userId, { online, lat, lng, status });
      return send(res, data, 200);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async getById(req, res) {
    try {
      const id = req.params.id;
      const data = await driverService.getDriverById(id);
      return send(res, data, 200);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async nearby(req, res) {
    try {
      const { lat, lng, radiusKm, limit } = req.query || {};
      const data = await driverService.findNearby({ lat: Number(lat), lng: Number(lng), radiusKm: Number(radiusKm), limit: Number(limit) });
      return send(res, data, 200);
    } catch (err) {
      return sendError(res, err);
    }
  },
};
