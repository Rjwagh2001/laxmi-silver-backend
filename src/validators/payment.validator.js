const Joi = require('joi');

const createPaymentOrderValidator = Joi.object({
  orderId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid order ID format',
    'string.length': 'Invalid order ID',
    'any.required': 'Order ID is required',
  }),
});

const verifyPaymentValidator = Joi.object({
  orderId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid order ID',
    'any.required': 'Order ID is required',
  }),
  razorpayOrderId: Joi.string().required().messages({
    'any.required': 'Razorpay order ID is required',
  }),
  razorpayPaymentId: Joi.string().required().messages({
    'any.required': 'Razorpay payment ID is required',
  }),
  razorpaySignature: Joi.string().required().messages({
    'any.required': 'Razorpay signature is required',
  }),
});

const initiateRefundValidator = Joi.object({
  orderId: Joi.string().hex().length(24).required(),
  reason: Joi.string().max(500).optional(),
});

module.exports = {
  createPaymentOrderValidator,
  verifyPaymentValidator,
  initiateRefundValidator,
};