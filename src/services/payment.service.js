const crypto = require('crypto');
const razorpayInstance = require('../config/razorpay');
const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const ApiError = require('../utils/ApiError');

class PaymentService {
  /**
   * Create Razorpay order
   * @param {Object} order - Order document from MongoDB
   * @returns {Object} - Razorpay order object
   */
  async createRazorpayOrder(order) {
    try {
      const options = {
        amount: Math.round(order.pricing.total * 100), // Convert to paise
        currency: 'INR',
        receipt: order.orderNumber,
        notes: {
          orderId: order._id.toString(),
          userId: order.userId.toString(),
          orderNumber: order.orderNumber,
        },
      };

      const razorpayOrder = await razorpayInstance.orders.create(options);
      console.log('Razorpay order created:', razorpayOrder.id);
      return razorpayOrder;
    } catch (error) {
      console.error('Razorpay order creation error:', error);
      throw new ApiError(500, 'Failed to create payment order. Please try again.');
    }
  }

  /**
   * Verify payment signature from Razorpay
   * @param {String} razorpayOrderId
   * @param {String} razorpayPaymentId
   * @param {String} razorpaySignature
   * @returns {Boolean}
   */
  verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    const isValid = generatedSignature === razorpaySignature;
    console.log('Signature verification:', isValid);
    return isValid;
  }

  /**
   * Verify webhook signature from Razorpay
   * @param {Object} webhookBody
   * @param {String} webhookSignature
   * @returns {Boolean}
   */
  verifyWebhookSignature(webhookBody, webhookSignature) {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(webhookBody))
      .digest('hex');

    return expectedSignature === webhookSignature;
  }

  /**
   * Process successful payment - Update order and stock
   * @param {Object} order - Order document
   * @param {Object} paymentDetails - Payment details from Razorpay
   * @returns {Object} - Updated order
   */
  async processSuccessfulPayment(order, paymentDetails) {
    try {
      // Update order payment details
      order.payment.status = 'completed';
      order.payment.razorpayOrderId = paymentDetails.razorpayOrderId;
      order.payment.razorpayPaymentId = paymentDetails.razorpayPaymentId;
      order.payment.razorpaySignature = paymentDetails.razorpaySignature;
      order.payment.paidAt = new Date();
      order.status = 'confirmed';

      await order.save();

      // Update product stock
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.stock.quantity -= item.quantity;
          await product.save();
          console.log(
            `Stock updated for product ${product.name}: ${product.stock.quantity}`
          );
        }
      }

      // Clear user cart
      await Cart.findOneAndUpdate(
        { userId: order.userId },
        { items: [] }
      );
      console.log('Cart cleared for user:', order.userId);

      return order;
    } catch (error) {
      console.error('Payment processing error:', error);
      throw new ApiError(500, 'Failed to process payment. Please contact support.');
    }
  }

  /**
   * Initiate refund on Razorpay
   * @param {String} paymentId - Razorpay payment ID
   * @param {Number} amount - Amount to refund
   * @param {String} reason - Reason for refund
   * @returns {Object} - Refund object
   */
  async initiateRefund(paymentId, amount, reason) {
    try {
      const refund = await razorpayInstance.payments.refund(paymentId, {
        amount: Math.round(amount * 100), // Convert to paise
        speed: 'normal', // 'normal' or 'optimum'
        notes: {
          reason: reason || 'Customer requested refund',
          refundedAt: new Date().toISOString(),
        },
      });

      console.log('Refund initiated:', refund.id);
      return refund;
    } catch (error) {
      console.error('Refund initiation error:', error);
      throw new ApiError(500, 'Failed to initiate refund. Please try again.');
    }
  }

  /**
   * Fetch payment details from Razorpay
   * @param {String} paymentId - Razorpay payment ID
   * @returns {Object} - Payment object
   */
  async fetchPaymentDetails(paymentId) {
    try {
      const payment = await razorpayInstance.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('Fetch payment error:', error);
      throw new ApiError(500, 'Failed to fetch payment details');
    }
  }

  /**
   * Fetch order details from Razorpay
   * @param {String} orderId - Razorpay order ID
   * @returns {Object} - Order object
   */
  async fetchOrderDetails(orderId) {
    try {
      const order = await razorpayInstance.orders.fetch(orderId);
      return order;
    } catch (error) {
      console.error('Fetch order error:', error);
      throw new ApiError(500, 'Failed to fetch order details');
    }
  }
}

module.exports = new PaymentService();