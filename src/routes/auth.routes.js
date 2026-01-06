const express = require('express');
const {
  register,
  verifyEmail,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshAccessToken,
} = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
} = require('../validators/auth.validator');

const router = express.Router();

// Public routes
router.post('/register', validate(registerValidator), register);
router.post('/verify-email', verifyEmail);
router.post('/login', validate(loginValidator), login);
router.post('/forgot-password', validate(forgotPasswordValidator), forgotPassword);
router.post('/reset-password', validate(resetPasswordValidator), resetPassword);
router.post('/refresh-token', refreshAccessToken);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/change-password', protect, validate(changePasswordValidator), changePassword);

module.exports = router;