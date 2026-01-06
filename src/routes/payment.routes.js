const express = require('express');
const {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  getPaymentStatus,
  initiateRefund,
} = require('../controllers/payment.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createPaymentOrderValidator,
  verifyPaymentValidator,
  initiateRefundValidator,
} = require('../validators/payment.validator');
const { USER_ROLES } = require('../constants');

const router = express.Router();

// Public webhook route (Must be BEFORE express.json() middleware)
// This route will be handled separately in app.js
router.post('/webhook', handleWebhook);

// Protected routes
router.post(
  '/create-order',
  protect,
  validate(createPaymentOrderValidator),
  createPaymentOrder
);

router.post(
  '/verify',
  protect,
  validate(verifyPaymentValidator),
  verifyPayment
);

router.get('/:orderId/status', protect, getPaymentStatus);

// Admin routes
router.post(
  '/refund',
  protect,
  authorize(USER_ROLES.ADMIN),
  validate(initiateRefundValidator),
  initiateRefund
);

module.exports = router;