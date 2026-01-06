const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    comment: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

/* ===========================
   Indexes
=========================== */

// Fast listing
reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ isApproved: 1 });

// One review per user per product
reviewSchema.index(
  { productId: 1, userId: 1 },
  { unique: true }
);

/* ===========================
   Static Methods
=========================== */

reviewSchema.statics.updateProductRatings = async function (productId) {
  const Product = mongoose.model("Product");

  const stats = await this.aggregate([
    { $match: { productId, isApproved: true } },
    {
      $group: {
        _id: "$productId",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      "ratings.average": Math.round(stats[0].avgRating * 10) / 10,
      "ratings.count": stats[0].count,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      "ratings.average": 0,
      "ratings.count": 0,
    });
  }
};

/* ===========================
   Hooks
=========================== */

reviewSchema.post("save", function () {
  this.constructor.updateProductRatings(this.productId);
});

reviewSchema.post("findOneAndUpdate", async function (doc) {
  if (doc) {
    doc.constructor.updateProductRatings(doc.productId);
  }
});

reviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    doc.constructor.updateProductRatings(doc.productId);
  }
});

module.exports = mongoose.model("Review", reviewSchema);
