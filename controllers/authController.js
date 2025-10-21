const authService = require('../services/authService');

function send(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function sendError(res, err) {
  const status = err.status || 400;
  return res.status(status).json({ success: false, error: err.message || 'Error' });
}

module.exports = {
  async requestOtp(req, res) {
    try {
      const { phone } = req.body || {};
      const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const result = await authService.requestOtp({ phone, ip });
      return send(res, result, 200);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async verifyOtp(req, res) {
    try {
      const { phone, code } = req.body || {};
      const result = await authService.verifyOtpCode({ phone, code });
      return send(res, result, 200);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async register(req, res) {
    try {
      const { verificationToken, name, email } = req.body || {};
      const result = await authService.register({ verificationToken, name, email });
      return send(res, result, 201);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async login(req, res) {
    try {
      const { verificationToken } = req.body || {};
      const result = await authService.login({ verificationToken });
      return send(res, result, 200);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async logout(req, res) {
    try {
      // const userId = req.user?.sub;
      const result = await authService.logout();
      return send(res, result, 200);
    } catch (err) {
      return sendError(res, err);
    }
  },
};
