const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } = require('../constants');

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        weight: Number,
        image: String,
      },
    ],
    pricing: {
      subtotal: {
        type: Number,
        required: true,
      },
      makingCharges: {
        type: Number,
        default: 0,
      },
      gst: {
        type: Number,
        required: true,
      },
      shippingCharges: {
        type: Number,
        default: 0,
      },
      discount: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
        required: true,
      },
    },
    shippingAddress: {
      name: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        default: 'India',
      },
    },
    billingAddress: {
      name: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
    },
    payment: {
      method: {
        type: String,
        required: true,
        enum: Object.values(PAYMENT_METHOD),
      },
      status: {
        type: String,
        required: true,
        enum: Object.values(PAYMENT_STATUS),
        default: PAYMENT_STATUS.PENDING,
      },
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
      transactionId: String,
      paidAt: Date,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: Object.values(ORDER_STATUS),
        },
        note: String,
        updatedBy: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    tracking: {
      courier: String,
      trackingNumber: String,
      estimatedDelivery: Date,
      trackingUrl: String,
    },
    invoice: {
      number: String,
      url: String,
      generatedAt: Date,
    },
    notes: String,
    cancellationReason: String,
    returnReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ createdAt: -1 });

// Generate order number
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `LS${Date.now()}${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Add status to history on update
orderSchema.pre('save', function (next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
    });
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);