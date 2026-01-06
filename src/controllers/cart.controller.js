const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get user cart
// @route   GET /api/v1/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ userId: req.user._id }).populate({
    path: 'items.productId',
    select: 'name images price stock isActive',
  });

  if (!cart) {
    cart = await Cart.create({ userId: req.user._id, items: [] });
  }

  res.status(200).json(
    new ApiResponse(200, { cart }, 'Cart fetched successfully')
  );
});

// @desc    Add item to cart
// @route   POST /api/v1/cart/add
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  // Check if product exists and is active
  const product = await Product.findById(productId);

  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found or unavailable');
  }

  // Check stock availability
  if (product.stock.quantity < quantity) {
    throw new ApiError(
      400,
      `Insufficient stock. Only ${product.stock.quantity} items available`
    );
  }

  // Find or create cart
  let cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    cart = new Cart({ userId: req.user._id, items: [] });
  }

  // Check if product already in cart
  const existingItemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === productId
  );

  if (existingItemIndex > -1) {
    // Update quantity
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;

    if (product.stock.quantity < newQuantity) {
      throw new ApiError(
        400,
        `Cannot add more items. Maximum ${product.stock.quantity} available`
      );
    }

    cart.items[existingItemIndex].quantity = newQuantity;
    cart.items[existingItemIndex].price = product.price.sellingPrice;
  } else {
    // Add new item
    cart.items.push({
      productId: product._id,
      quantity,
      price: product.price.sellingPrice,
    });
  }

  await cart.save();

  // Populate cart items
  cart = await cart.populate({
    path: 'items.productId',
    select: 'name images price stock',
  });

  res.status(200).json(
    new ApiResponse(200, { cart }, 'Item added to cart successfully')
  );
});

// @desc    Update cart item quantity
// @route   PUT /api/v1/cart/update/:itemId
// @access  Private
const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  const cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const item = cart.items.id(itemId);

  if (!item) {
    throw new ApiError(404, 'Item not found in cart');
  }

  // Check stock
  const product = await Product.findById(item.productId);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (!product.isActive) {
    throw new ApiError(400, 'Product is no longer available');
  }

  if (product.stock.quantity < quantity) {
    throw new ApiError(
      400,
      `Insufficient stock. Only ${product.stock.quantity} items available`
    );
  }

  item.quantity = quantity;
  item.price = product.price.sellingPrice;

  await cart.save();

  // Populate cart
  await cart.populate({
    path: 'items.productId',
    select: 'name images price stock',
  });

  res.status(200).json(
    new ApiResponse(200, { cart }, 'Cart updated successfully')
  );
});

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/remove/:itemId
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const itemExists = cart.items.id(itemId);

  if (!itemExists) {
    throw new ApiError(404, 'Item not found in cart');
  }

  cart.items = cart.items.filter((item) => item._id.toString() !== itemId);

  await cart.save();

  // Populate cart
  await cart.populate({
    path: 'items.productId',
    select: 'name images price stock',
  });

  res.status(200).json(
    new ApiResponse(200, { cart }, 'Item removed from cart successfully')
  );
});

// @desc    Clear cart
// @route   DELETE /api/v1/cart/clear
// @access  Private
const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  cart.items = [];
  await cart.save();

  res.status(200).json(
    new ApiResponse(200, { cart }, 'Cart cleared successfully')
  );
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};