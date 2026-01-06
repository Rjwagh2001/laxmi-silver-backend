const Joi = require('joi');

const addToCartValidator = Joi.object({
  productId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid product ID format',
    'string.length': 'Invalid product ID',
    'any.required': 'Product ID is required',
  }),
  quantity: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be a whole number',
    'number.min': 'Quantity must be at least 1',
  }),
});

const updateCartItemValidator = Joi.object({
  quantity: Joi.number().integer().min(1).required().messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be a whole number',
    'number.min': 'Quantity must be at least 1',
    'any.required': 'Quantity is required',
  }),
});

module.exports = {
  addToCartValidator,
  updateCartItemValidator,
};