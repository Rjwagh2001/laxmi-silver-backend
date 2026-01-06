const Joi = require('joi');
const { PRODUCT_CATEGORY, METAL_TYPE } = require('../constants');

const createProductValidator = Joi.object({
  name: Joi.string().trim().min(3).max(200).required().messages({
    'string.empty': 'Product name is required',
    'string.min': 'Product name must be at least 3 characters',
    'string.max': 'Product name cannot exceed 200 characters',
  }),
  description: Joi.string().trim().min(10).max(2000).required().messages({
    'string.empty': 'Product description is required',
    'string.min': 'Description must be at least 10 characters',
    'string.max': 'Description cannot exceed 2000 characters',
  }),
  category: Joi.string()
    .valid(...Object.values(PRODUCT_CATEGORY))
    .required()
    .messages({
      'any.only': 'Invalid category',
      'any.required': 'Category is required',
    }),
  subCategory: Joi.string().trim().optional(),
  metal: Joi.string()
    .valid(...Object.values(METAL_TYPE))
    .required()
    .messages({
      'any.only': 'Invalid metal type',
      'any.required': 'Metal type is required',
    }),
  purity: Joi.string().default('92.5%'),
  weight: Joi.number().min(0).required().messages({
    'number.base': 'Weight must be a number',
    'number.min': 'Weight cannot be negative',
    'any.required': 'Weight is required',
  }),
  makingCharges: Joi.number().min(0).default(0),
  gst: Joi.number().min(0).max(100).default(3),
  price: Joi.object({
    basePrice: Joi.number().min(0).required(),
    sellingPrice: Joi.number().min(0).required(),
    discount: Joi.number().min(0).max(100).default(0),
  }).required(),
  stock: Joi.object({
    quantity: Joi.number().min(0).required(),
    lowStockThreshold: Joi.number().min(0).default(5),
  }),
  dimensions: Joi.object({
    length: Joi.number().min(0),
    width: Joi.number().min(0),
    height: Joi.number().min(0),
    unit: Joi.string().default('cm'),
  }),
  tags: Joi.array().items(Joi.string()),
  isFeatured: Joi.boolean().default(false),
  seoMetadata: Joi.object({
    title: Joi.string(),
    description: Joi.string(),
    keywords: Joi.array().items(Joi.string()),
  }),
});

const updateProductValidator = Joi.object({
  name: Joi.string().trim().min(3).max(200),
  description: Joi.string().trim().min(10).max(2000),
  category: Joi.string().valid(...Object.values(PRODUCT_CATEGORY)),
  subCategory: Joi.string().trim(),
  metal: Joi.string().valid(...Object.values(METAL_TYPE)),
  purity: Joi.string(),
  weight: Joi.number().min(0),
  makingCharges: Joi.number().min(0),
  gst: Joi.number().min(0).max(100),
  price: Joi.object({
    basePrice: Joi.number().min(0),
    sellingPrice: Joi.number().min(0),
    discount: Joi.number().min(0).max(100),
  }),
  stock: Joi.object({
    quantity: Joi.number().min(0),
    lowStockThreshold: Joi.number().min(0),
  }),
  dimensions: Joi.object({
    length: Joi.number().min(0),
    width: Joi.number().min(0),
    height: Joi.number().min(0),
    unit: Joi.string(),
  }),
  tags: Joi.array().items(Joi.string()),
  isActive: Joi.boolean(),
  isFeatured: Joi.boolean(),
  seoMetadata: Joi.object({
    title: Joi.string(),
    description: Joi.string(),
    keywords: Joi.array().items(Joi.string()),
  }),
}).min(1);

const categoryValidator = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Category name is required',
    'string.min': 'Category name must be at least 2 characters',
  }),
  description: Joi.string().trim().max(500),
  parentCategory: Joi.string().hex().length(24).allow(null),
  displayOrder: Joi.number().min(0).default(0),
  isActive: Joi.boolean().default(true),
});

module.exports = {
  createProductValidator,
  updateProductValidator,
  categoryValidator,
};