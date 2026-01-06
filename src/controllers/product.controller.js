const Product = require('../models/Product.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all products with filters
// @route   GET /api/v1/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    metal,
    minPrice,
    maxPrice,
    search,
    sort = '-createdAt',
    isFeatured,
  } = req.query;

  // Build query
  const query = { isActive: true };

  if (category) query.category = category;
  if (metal) query.metal = metal;
  if (isFeatured) query.isFeatured = isFeatured === 'true';

  // Price range filter
  if (minPrice || maxPrice) {
    query['price.sellingPrice'] = {};
    if (minPrice) query['price.sellingPrice'].$gte = Number(minPrice);
    if (maxPrice) query['price.sellingPrice'].$lte = Number(maxPrice);
  }

  // Search functionality
  if (search) {
    query.$text = { $search: search };
  }

  // Pagination
  const skip = (page - 1) * limit;

  // Execute query
  const products = await Product.find(query)
    .sort(sort)
    .skip(skip)
    .limit(Number(limit))
    .select('-__v');

  const total = await Product.countDocuments(query);

  res.status(200).json(
    new ApiResponse(
      200,
      {
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

// @desc    Get featured products
// @route   GET /api/v1/products/featured
// @access  Public
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isFeatured: true, isActive: true })
    .sort('-createdAt')
    .limit(10)
    .select('-__v');

  res.status(200).json(
    new ApiResponse(200, { products }, 'Featured products fetched successfully')
  );
});

// @desc    Search products
// @route   GET /api/v1/products/search
// @access  Public
const searchProducts = asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q) {
    throw new ApiError(400, 'Search query is required');
  }

  const products = await Product.find({
    $text: { $search: q },
    isActive: true,
  })
    .sort({ score: { $meta: 'textScore' } })
    .limit(Number(limit))
    .select('name price.sellingPrice images category');

  res.status(200).json(
    new ApiResponse(200, { products }, 'Search results fetched successfully')
  );
});

// @desc    Get single product by ID
// @route   GET /api/v1/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Increment views
  product.views += 1;
  await product.save();

  res.status(200).json(
    new ApiResponse(200, { product }, 'Product fetched successfully')
  );
});

// @desc    Get product by slug
// @route   GET /api/v1/products/slug/:slug
// @access  Public
const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug });

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Increment views
  product.views += 1;
  await product.save();

  res.status(200).json(
    new ApiResponse(200, { product }, 'Product fetched successfully')
  );
});

// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);

  res.status(201).json(
    new ApiResponse(201, { product }, 'Product created successfully')
  );
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json(
    new ApiResponse(200, { product }, 'Product updated successfully')
  );
});

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Soft delete - just mark as inactive
  product.isActive = false;
  await product.save();

  res.status(200).json(
    new ApiResponse(200, null, 'Product deleted successfully')
  );
});

// @desc    Upload product images
// @route   POST /api/v1/products/:id/images
// @access  Private/Admin
const uploadProductImages = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'Please upload at least one image');
  }

  // Images are already uploaded to Cloudinary via multer middleware
  const imageUrls = req.files.map((file, index) => ({
    url: file.path, // Cloudinary URL
    alt: `${product.name} image ${index + 1}`,
    isPrimary: index === 0,
    publicId: file.filename,
  }));

  product.images.push(...imageUrls);
  await product.save();

  res.status(200).json(
    new ApiResponse(200, { product }, 'Images uploaded successfully')
  );
});

module.exports = {
  getProducts,
  getFeaturedProducts,
  searchProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
};
