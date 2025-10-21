const userService = require('../services/userService');

function send(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function sendError(res, err) {
  const status = err.status || 400;
  return res.status(status).json({ success: false, error: err.message || 'Error' });
}

module.exports = {
  async me(req, res) {
    try {
      const userId = req.user?.sub;
      const data = await userService.getMe(userId);
      return send(res, data, 200);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async update(req, res) {
    try {
      const userId = req.user?.sub;
      const { name, email } = req.body || {};
      const data = await userService.updateProfile(userId, { name, email });
      return send(res, data, 200);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async trips(req, res) {
    try {
      const userId = req.user?.sub;
      const { limit, offset } = req.query || {};
      const data = await userService.listMyTrips(userId, { limit, offset });
      return send(res, data, 200);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async deleteAccount(req, res) {
    try {
      const userId = req.user?.sub;
      const data = await userService.deleteAccount(userId);
      return send(res, data, 200);
    } catch (err) {
      return sendError(res, err);
    }
  },
};
