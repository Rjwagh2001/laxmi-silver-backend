const express = require('express');
const {
  getCategories,
  getCategoryById,
  getProductsByCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/category.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { categoryValidator } = require('../validators/product.validator');
const { USER_ROLES } = require('../constants');

const router = express.Router();

// Public routes
router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.get('/:id/products', getProductsByCategory);

// Admin routes
router.post(
  '/',
  protect,
  authorize(USER_ROLES.ADMIN),
  validate(categoryValidator),
  createCategory
);

router.put(
  '/:id',
  protect,
  authorize(USER_ROLES.ADMIN),
  validate(categoryValidator),
  updateCategory
);

router.delete(
  '/:id',
  protect,
  authorize(USER_ROLES.ADMIN),
  deleteCategory
);

module.exports = router;