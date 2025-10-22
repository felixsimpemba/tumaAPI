const paymentService = require('../services/paymentService');

function send(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function sendError(res, err) {
  const status = err.status || 400;
  return res.status(status).json({ success: false, error: err.message || 'Error' });
}

module.exports = {
  async initiate(req, res) {
    try {
      const userId = req.user?.sub;
      const { tripId, method, amount } = req.body || {};
      const data = await paymentService.initiate(userId, { tripId, method, amount });
      return send(res, data, 201);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async verify(req, res) {
    try {
      const userId = req.user?.sub;
      const { tripId, success, providerRef } = req.body || {};
      const data = await paymentService.verify(userId, { tripId, success, providerRef });
      return send(res, data, 200);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async getByTrip(req, res) {
    try {
      const userId = req.user?.sub;
      const tripId = req.params.tripId;
      const data = await paymentService.getByTrip(userId, tripId);
      return send(res, data, 200);
    } catch (err) {
      return sendError(res, err);
    }
  },
};
