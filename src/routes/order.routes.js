const express = require('express');
const {
  getOrders,
  getOrderById,
  createOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
} = require('../controllers/order.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createOrderValidator } = require('../validators/order.validator');
const { USER_ROLES } = require('../constants');

const router = express.Router();

// All order routes require authentication
router.use(protect);

// Customer routes
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/create', validate(createOrderValidator), createOrder);
router.put('/:id/cancel', cancelOrder);

// Admin routes
router.get('/all/orders', authorize(USER_ROLES.ADMIN), getAllOrders);
router.put('/:id/status', authorize(USER_ROLES.ADMIN), updateOrderStatus);

module.exports = router;