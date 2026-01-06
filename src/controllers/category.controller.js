const Category = require('../models/Category.model');
const Product = require('../models/Product.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all categories
// @route   GET /api/v1/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .populate('parentCategory', 'name slug')
    .sort('displayOrder');

  res.status(200).json(
    new ApiResponse(200, { categories }, 'Categories fetched successfully')
  );
});

// @desc    Get category by ID
// @route   GET /api/v1/categories/:id
// @access  Public
const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).populate(
    'parentCategory',
    'name slug'
  );

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  res.status(200).json(
    new ApiResponse(200, { category }, 'Category fetched successfully')
  );
});

// @desc    Get products by category
// @route   GET /api/v1/categories/:id/products
// @access  Public
const getProductsByCategory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, sort = '-createdAt' } = req.query;

  const category = await Category.findById(req.params.id);

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  const skip = (page - 1) * limit;

  const products = await Product.find({
    category: category.name,
    isActive: true,
  })
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  const total = await Product.countDocuments({
    category: category.name,
    isActive: true,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        category,
        products,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
      'Products fetched successfully'
    )
  );
});

// @desc    Create category
// @route   POST /api/v1/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);

  res.status(201).json(
    new ApiResponse(201, { category }, 'Category created successfully')
  );
});

// @desc    Update category
// @route   PUT /api/v1/categories/:id
// @access  Private/Admin
const updateCategory = asyncHandler(async (req, res) => {
  let category = await Category.findById(req.params.id);

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json(
    new ApiResponse(200, { category }, 'Category updated successfully')
  );
});

// @desc    Delete category
// @route   DELETE /api/v1/categories/:id
// @access  Private/Admin
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  // Check if category has products
  const productsCount = await Product.countDocuments({
    category: category.name,
  });

  if (productsCount > 0) {
    throw new ApiError(
      400,
      'Cannot delete category with existing products. Please reassign or delete products first.'
    );
  }

  await category.deleteOne();

  res.status(200).json(
    new ApiResponse(200, null, 'Category deleted successfully')
  );
});

module.exports = {
  getCategories,
  getCategoryById,
  getProductsByCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
