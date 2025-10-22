const tripService = require('../services/tripService');

function send(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function sendError(res, err) {
  const status = err.status || 400;
  return res.status(status).json({ success: false, error: err.message || 'Error' });
}

module.exports = {
  async book(req, res) {
    try {
      const userId = req.user?.sub;
      const { pickup, dropoff } = req.body || {};
      const data = await tripService.bookTrip(userId, { pickup, dropoff });
      return send(res, data, 201);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async getById(req, res) {
    try {
      const userId = req.user?.sub;
      const id = req.params.id;
      const data = await tripService.getById(userId, id);
      return send(res, data, 200);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async updateStatus(req, res) {
    try {
      const userId = req.user?.sub;
      const { tripId, status } = req.body || {};
      const data = await tripService.updateStatus(userId, { tripId, status });
      return send(res, data, 200);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async history(req, res) {
    try {
      const userId = req.user?.sub;
      const { role, limit, offset } = req.query || {};
      const data = await tripService.history(userId, { role, limit, offset });
      return send(res, data, 200);
    } catch (err) {
      return sendError(res, err);
    }
  },
};
