const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const Coupon = require('../models/Coupon.model');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const sendEmail = require('../utils/sendEmail');

// @desc    Get user orders
// @route   GET /api/v1/orders
// @access  Private
const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = { userId: req.user._id };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const orders = await Order.find(query)
    .sort('-createdAt')
    .skip(skip)
    .limit(Number(limit))
    .populate('items.productId', 'name images');

  const total = await Order.countDocuments(query);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
      'Orders fetched successfully'
    )
  );
});

// @desc    Get single order
// @route   GET /api/v1/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    'items.productId',
    'name images'
  );

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Check if order belongs to user or user is admin
  if (
    order.userId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'Not authorized to access this order');
  }

  res.status(200).json(
    new ApiResponse(200, { order }, 'Order fetched successfully')
  );
});

// @desc    Create new order
// @route   POST /api/v1/orders/create
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, billingAddress, paymentMethod, couponCode, notes } =
    req.body;

  // Get user cart
  const cart = await Cart.findOne({ userId: req.user._id }).populate(
    'items.productId'
  );

  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Cart is empty. Please add items to cart first');
  }

  // Validate stock for all items
  for (const item of cart.items) {
    if (!item.productId) {
      throw new ApiError(400, 'One or more products no longer exist');
    }

    if (!item.productId.isActive) {
      throw new ApiError(
        400,
        `Product "${item.productId.name}" is no longer available`
      );
    }

    if (item.productId.stock.quantity < item.quantity) {
      throw new ApiError(
        400,
        `Insufficient stock for "${item.productId.name}". Available: ${item.productId.stock.quantity}`
      );
    }
  }

  // Calculate pricing
  let subtotal = 0;
  let makingCharges = 0;
  let totalWeight = 0;

  const orderItems = cart.items.map((item) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    makingCharges += item.productId.makingCharges * item.quantity;
    totalWeight += item.productId.weight * item.quantity;

    return {
      productId: item.productId._id,
      name: item.productId.name,
      quantity: item.quantity,
      price: item.price,
      weight: item.productId.weight,
      image: item.productId.images[0]?.url || '',
    };
  });

  // Calculate GST (3% on subtotal + making charges)
  const gst = ((subtotal + makingCharges) * 3) / 100;

  // Calculate shipping charges based on weight
  const shippingCharges = totalWeight > 100 ? 200 : totalWeight > 50 ? 150 : 100;

  // Apply coupon if provided
  let discount = 0;
  if (couponCode) {
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true,
      validFrom: { $lte: new Date() },
      validUntil: { $gte: new Date() },
    });

    if (!coupon) {
      throw new ApiError(400, 'Invalid or expired coupon code');
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new ApiError(400, 'Coupon usage limit has been reached');
    }

    const orderSubtotal = subtotal + makingCharges + gst + shippingCharges;

    if (orderSubtotal < coupon.minOrderAmount) {
      throw new ApiError(
        400,
        `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`
      );
    }

    if (coupon.discountType === 'percentage') {
      discount = (orderSubtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
      }
    } else {
      discount = coupon.discountValue;
    }

    // Update coupon usage
    coupon.usedCount += 1;
    await coupon.save();
  }

  const total = subtotal + makingCharges + gst + shippingCharges - discount;

  // Create order
  const order = await Order.create({
    userId: req.user._id,
    items: orderItems,
    pricing: {
      subtotal: Math.round(subtotal * 100) / 100,
      makingCharges: Math.round(makingCharges * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      shippingCharges,
      discount: Math.round(discount * 100) / 100,
      total: Math.round(total * 100) / 100,
    },
    shippingAddress,
    billingAddress: billingAddress || shippingAddress,
    payment: {
      method: paymentMethod,
      status: 'pending',
    },
    notes,
  });

  // Send order creation email
  try {
    await sendEmail({
      email: req.user.email,
      subject: `Order Created - ${order.orderNumber}`,
      html: `
        <h1>Order Created Successfully!</h1>
        <p>Hi ${req.user.firstName},</p>
        <p>Your order has been created successfully.</p>
        <h2>Order Details:</h2>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Total Amount:</strong> ₹${order.pricing.total}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</p>
        <p>Please complete the payment to confirm your order.</p>
        <p>Thank you for shopping with Lakshmi Silver!</p>
      `,
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }

  res.status(201).json(
    new ApiResponse(201, { order }, 'Order created successfully')
  );
});

// @desc    Cancel order
// @route   PUT /api/v1/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Check if order belongs to user
  if (order.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to cancel this order');
  }

  // Check if order can be cancelled
  if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
    throw new ApiError(
      400,
      `Cannot cancel order with status: ${order.status}`
    );
  }

  order.status = 'cancelled';
  order.cancellationReason = reason || 'Cancelled by customer';
  await order.save();

  // Restore stock if order was confirmed
  if (order.payment.status === 'completed') {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { 'stock.quantity': item.quantity },
      });
    }
  }

  // Send cancellation email
  try {
    await sendEmail({
      email: req.user.email,
      subject: `Order Cancelled - ${order.orderNumber}`,
      html: `
        <h1>Order Cancelled</h1>
        <p>Hi ${req.user.firstName},</p>
        <p>Your order <strong>${order.orderNumber}</strong> has been cancelled successfully.</p>
        <p><strong>Reason:</strong> ${order.cancellationReason}</p>
        <p>If payment was made, refund will be processed within 5-7 business days.</p>
        <p>Thank you for your understanding.</p>
      `,
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }

  res.status(200).json(
    new ApiResponse(200, { order }, 'Order cancelled successfully')
  );
});

// @desc    Get all orders (Admin)
// @route   GET /api/v1/orders/all/orders
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;

  const query = {};
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'shippingAddress.name': { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const orders = await Order.find(query)
    .populate('userId', 'firstName lastName email phone')
    .sort('-createdAt')
    .skip(skip)
    .limit(Number(limit));

  const total = await Order.countDocuments(query);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
      'Orders fetched successfully'
    )
  );
});

// @desc    Update order status (Admin)
// @route   PUT /api/v1/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note, trackingNumber, courier } = req.body;

  if (!status) {
    throw new ApiError(400, 'Status is required');
  }

  const order = await Order.findById(req.params.id).populate(
    'userId',
    'email firstName'
  );

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const oldStatus = order.status;
  order.status = status;

  // Add to status history
  order.statusHistory.push({
    status,
    note: note || `Status changed from ${oldStatus} to ${status}`,
    updatedBy: req.user._id,
    timestamp: new Date(),
  });

  // Update tracking info if provided
  if (status === 'shipped') {
    if (trackingNumber || courier) {
      order.tracking = {
        ...order.tracking,
        trackingNumber: trackingNumber || order.tracking.trackingNumber,
        courier: courier || order.tracking.courier,
      };
    }
  }

  // If order is confirmed for first time, update stock and clear cart
  if (status === 'confirmed' && oldStatus === 'pending') {
    // Update product stock
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock.quantity -= item.quantity;
        await product.save();
      }
    }

    // Clear user cart
    await Cart.findOneAndUpdate({ userId: order.userId._id }, { items: [] });
  }

  await order.save();

  // Send status update email
  try {
    let emailHtml = `
      <h1>Order Status Updated</h1>
      <p>Hi ${order.userId.firstName},</p>
      <p>Your order <strong>${order.orderNumber}</strong> status has been updated.</p>
      <p><strong>New Status:</strong> ${status.toUpperCase()}</p>
    `;

    if (note) {
      emailHtml += `<p><strong>Note:</strong> ${note}</p>`;
    }

    if (trackingNumber) {
      emailHtml += `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>`;
    }

    if (courier) {
      emailHtml += `<p><strong>Courier:</strong> ${courier}</p>`;
    }

    emailHtml += `<p>Thank you for shopping with Lakshmi Silver!</p>`;

    await sendEmail({
      email: order.userId.email,
      subject: `Order Update - ${order.orderNumber}`,
      html: emailHtml,
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }

  res.status(200).json(
    new ApiResponse(200, { order }, 'Order status updated successfully')
  );
});

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
};
