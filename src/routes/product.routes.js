const express = require('express');
const {
  getProducts,
  getFeaturedProducts,
  searchProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
} = require('../controllers/product.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createProductValidator,
  updateProductValidator,
} = require('../validators/product.validator');
const upload = require('../middlewares/upload.middleware');
const { USER_ROLES } = require('../constants');

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/search', searchProducts);
router.get('/slug/:slug', getProductBySlug);
router.get('/:id', getProductById);

// Admin routes
router.post(
  '/',
  protect,
  authorize(USER_ROLES.ADMIN),
  validate(createProductValidator),
  createProduct
);

router.put(
  '/:id',
  protect,
  authorize(USER_ROLES.ADMIN),
  validate(updateProductValidator),
  updateProduct
);

router.delete(
  '/:id',
  protect,
  authorize(USER_ROLES.ADMIN),
  deleteProduct
);

router.post(
  '/:id/images',
  protect,
  authorize(USER_ROLES.ADMIN),
  upload.array('images', 5),
  uploadProductImages
);

module.exports = router;