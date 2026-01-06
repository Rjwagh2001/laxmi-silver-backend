const Joi = require('joi');

const registerValidator = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'First name is required',
    'string.min': 'First name must be at least 2 characters',
    'string.max': 'First name cannot exceed 50 characters',
  }),
  lastName: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Last name is required',
    'string.min': 'Last name must be at least 2 characters',
  }),
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email',
    'string.empty': 'Email is required',
  }),
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid 10-digit Indian phone number',
      'string.empty': 'Phone number is required',
    }),
  password: Joi.string().min(8).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 8 characters',
  }),
});

const loginValidator = Joi.object({
  email: Joi.string().email().lowercase().trim().messages({
    'string.email': 'Please provide a valid email',
  }),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).messages({
    'string.pattern.base': 'Please provide a valid phone number',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
  }),
}).or('email', 'phone').messages({
  'object.missing': 'Either email or phone is required',
});

const forgotPasswordValidator = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email',
    'string.empty': 'Email is required',
  }),
});

const resetPasswordValidator = Joi.object({
  token: Joi.string().required().messages({
    'string.empty': 'Reset token is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.empty': 'New password is required',
    'string.min': 'Password must be at least 8 characters',
  }),
});

const changePasswordValidator = Joi.object({
  currentPassword: Joi.string().required().messages({
    'string.empty': 'Current password is required',
  }),
  newPassword: Joi.string().min(8).required().messages({
    'string.empty': 'New password is required',
    'string.min': 'New password must be at least 8 characters',
  }),
});

module.exports = {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
};