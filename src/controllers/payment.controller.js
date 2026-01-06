const Order = require('../models/Order.model');
const User = require('../models/User.model');
const Product = require('../models/Product.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/payment.service');
const sendEmail = require('../utils/sendEmail');

// @desc    Create Razorpay order for payment
// @route   POST /api/v1/payments/create-order
// @access  Private
const createPaymentOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  // Find order
  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Check if order belongs to user
  if (order.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to access this order');
  }

  // Check if order is already paid
  if (order.payment.status === 'completed') {
    throw new ApiError(400, 'Order is already paid');
  }

  // Check if payment method is Razorpay
  if (order.payment.method !== 'razorpay') {
    throw new ApiError(
      400,
      'This order does not use Razorpay as payment method'
    );
  }

  // Create Razorpay order
  const razorpayOrder = await paymentService.createRazorpayOrder(order);

  // Update order with Razorpay order ID
  order.payment.razorpayOrderId = razorpayOrder.id;
  await order.save();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
      'Payment order created successfully'
    )
  );
});

// @desc    Verify payment after Razorpay checkout
// @route   POST /api/v1/payments/verify
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
    req.body;

  // Find order and populate user
  const order = await Order.findById(orderId).populate(
    'userId',
    'email firstName'
  );

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Check if order belongs to user
  if (order.userId._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to access this order');
  }

  // Verify payment signature
  const isValid = paymentService.verifyPaymentSignature(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  );

  if (!isValid) {
    // Mark payment as failed
    order.payment.status = 'failed';
    await order.save();
    throw new ApiError(400, 'Payment verification failed. Invalid signature.');
  }

  // Process successful payment
  const updatedOrder = await paymentService.processSuccessfulPayment(order, {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  // Send order confirmation email
  try {
    await sendEmail({
      email: order.userId.email,
      subject: `Payment Successful - Order ${order.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Payment Successful!</h1>
          <p>Hi ${order.userId.firstName},</p>
          <p>Thank you for your payment. Your order has been confirmed.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">Order Details</h2>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Total Amount:</strong> ₹${order.pricing.total}</p>
            <p><strong>Payment ID:</strong> ${razorpayPaymentId}</p>
            <p><strong>Payment Method:</strong> Razorpay</p>
          </div>

          <p>We will send you a shipping update soon.</p>
          <p>Thank you for shopping with <strong>Lakshmi Silver</strong>!</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }

  res.status(200).json(
    new ApiResponse(
      200,
      { order: updatedOrder },
      'Payment verified and order confirmed successfully'
    )
  );
});

// @desc    Handle Razorpay webhook events
// @route   POST /api/v1/payments/webhook
// @access  Public (Razorpay only)
const handleWebhook = asyncHandler(async (req, res) => {
  const webhookSignature = req.headers['x-razorpay-signature'];
  const webhookBody = req.body;

  // Verify webhook signature
  const isValid = paymentService.verifyWebhookSignature(
    webhookBody,
    webhookSignature
  );

  if (!isValid) {
    console.error('Invalid webhook signature');
    throw new ApiError(400, 'Invalid webhook signature');
  }

  const event = webhookBody.event;
  const payload = webhookBody.payload.payment.entity;

  console.log('Webhook event received:', event);

  // Handle different webhook events
  switch (event) {
    case 'payment.captured':
      await handlePaymentCaptured(payload);
      break;

    case 'payment.failed':
      await handlePaymentFailed(payload);
      break;

    case 'refund.processed':
      await handleRefundProcessed(webhookBody.payload.refund.entity);
      break;

    default:
      console.log(`Unhandled webhook event: ${event}`);
  }

  res.status(200).json({ status: 'ok' });
});

// Helper function: Handle payment captured event
async function handlePaymentCaptured(payload) {
  try {
    const orderId = payload.notes.orderId;
    const order = await Order.findById(orderId).populate(
      'userId',
      'email firstName'
    );

    if (!order) {
      console.error('Order not found for payment:', payload.id);
      return;
    }

    if (order.payment.status === 'completed') {
      console.log('Order already processed:', order.orderNumber);
      return;
    }

    // Process payment
    await paymentService.processSuccessfulPayment(order, {
      razorpayOrderId: payload.order_id,
      razorpayPaymentId: payload.id,
      razorpaySignature: '',
    });

    // Send email
    await sendEmail({
      email: order.userId.email,
      subject: `Payment Received - ${order.orderNumber}`,
      html: `
        <h1>Payment Received!</h1>
        <p>Hi ${order.userId.firstName},</p>
        <p>We have received your payment of ₹${order.pricing.total}.</p>
        <p>Order Number: ${order.orderNumber}</p>
        <p>Payment ID: ${payload.id}</p>
        <p>Thank you for shopping with Lakshmi Silver!</p>
      `,
    });

    console.log('Payment captured successfully:', payload.id);
  } catch (error) {
    console.error('Error handling payment captured:', error);
  }
}

// Helper function: Handle payment failed event
async function handlePaymentFailed(payload) {
  try {
    const orderId = payload.notes.orderId;
    const order = await Order.findById(orderId);

    if (order) {
      order.payment.status = 'failed';
      await order.save();
      console.log('Payment marked as failed:', payload.id);
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

// Helper function: Handle refund processed event
async function handleRefundProcessed(payload) {
  try {
    const paymentId = payload.payment_id;
    const order = await Order.findOne({
      'payment.razorpayPaymentId': paymentId,
    }).populate('userId', 'email firstName');

    if (order) {
      order.payment.status = 'refunded';
      await order.save();

      // Send refund email
      await sendEmail({
        email: order.userId.email,
        subject: `Refund Processed - ${order.orderNumber}`,
        html: `
          <h1>Refund Processed</h1>
          <p>Hi ${order.userId.firstName},</p>
          <p>Your refund of ₹${payload.amount / 100} has been processed successfully.</p>
          <p>Order Number: ${order.orderNumber}</p>
          <p>Refund ID: ${payload.id}</p>
          <p>The amount will be credited to your account within 5-7 business days.</p>
        `,
      });

      console.log('Refund processed successfully:', payload.id);
    }
  } catch (error) {
    console.error('Error handling refund processed:', error);
  }
}

// @desc    Get payment status
// @route   GET /api/v1/payments/:orderId/status
// @access  Private
const getPaymentStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Check authorization
  if (
    order.userId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'Not authorized to access this order');
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.payment.status,
        paymentMethod: order.payment.method,
        amount: order.pricing.total,
        paidAt: order.payment.paidAt,
        razorpayOrderId: order.payment.razorpayOrderId,
        razorpayPaymentId: order.payment.razorpayPaymentId,
      },
      'Payment status fetched successfully'
    )
  );
});

// @desc    Initiate refund (Admin only)
// @route   POST /api/v1/payments/refund
// @access  Private/Admin
const initiateRefund = asyncHandler(async (req, res) => {
  const { orderId, reason } = req.body;

  const order = await Order.findById(orderId).populate('userId', 'email firstName');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.payment.status !== 'completed') {
    throw new ApiError(400, 'Cannot refund order that is not paid');
  }

  if (order.payment.status === 'refunded') {
    throw new ApiError(400, 'Order is already refunded');
  }

  if (!order.payment.razorpayPaymentId) {
    throw new ApiError(400, 'No payment ID found for this order');
  }

  // Initiate refund on Razorpay
  const refund = await paymentService.initiateRefund(
    order.payment.razorpayPaymentId,
    order.pricing.total,
    reason
  );

  // Update order
  order.payment.status = 'refunded';
  order.status = 'cancelled';
  order.cancellationReason = reason || 'Refund initiated by admin';
  await order.save();

  // Restore product stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { 'stock.quantity': item.quantity },
    });
  }

  // Send refund email
  try {
    await sendEmail({
      email: order.userId.email,
      subject: `Refund Initiated - ${order.orderNumber}`,
      html: `
        <h1>Refund Initiated</h1>
        <p>Hi ${order.userId.firstName},</p>
        <p>A refund of ₹${order.pricing.total} has been initiated for your order.</p>
        <p>Order Number: ${order.orderNumber}</p>
        <p>Refund ID: ${refund.id}</p>
        <p>The amount will be credited to your account within 5-7 business days.</p>
        ${reason ? `<p>Reason: ${reason}</p>` : ''}
      `,
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }

  res.status(200).json(
    new ApiResponse(
      200,
      { refund, order },
      'Refund initiated successfully'
    )
  );
});

module.exports = {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  getPaymentStatus,
  initiateRefund,
};