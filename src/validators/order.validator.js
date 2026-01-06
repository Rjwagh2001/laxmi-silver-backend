const Joi = require('joi');
const { PAYMENT_METHOD } = require('../constants');

const createOrderValidator = Joi.object({
  shippingAddress: Joi.object({
    name: Joi.string().required().messages({
      'any.required': 'Recipient name is required',
    }),
    phone: Joi.string()
      .pattern(/^[6-9]\d{9}$/)
      .required()
      .messages({
        'string.pattern.base': 'Please provide a valid 10-digit Indian phone number',
        'any.required': 'Phone number is required',
      }),
    street: Joi.string().required().messages({
      'any.required': 'Street address is required',
    }),
    city: Joi.string().required().messages({
      'any.required': 'City is required',
    }),
    state: Joi.string().required().messages({
      'any.required': 'State is required',
    }),
    pincode: Joi.string()
      .pattern(/^\d{6}$/)
      .required()
      .messages({
        'string.pattern.base': 'Pincode must be 6 digits',
        'any.required': 'Pincode is required',
      }),
    country: Joi.string().default('India'),
  }).required(),
  billingAddress: Joi.object({
    name: Joi.string(),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/),
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    pincode: Joi.string().pattern(/^\d{6}$/),
    country: Joi.string(),
  }).optional(),
  paymentMethod: Joi.string()
    .valid(...Object.values(PAYMENT_METHOD))
    .required()
    .messages({
      'any.only': 'Invalid payment method',
      'any.required': 'Payment method is required',
    }),
  couponCode: Joi.string().uppercase().trim().optional(),
  notes: Joi.string().max(500).optional(),
});

module.exports = {
  createOrderValidator,
};