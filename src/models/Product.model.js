const mongoose = require("mongoose");
const { PRODUCT_CATEGORY, METAL_TYPE } = require("../constants");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: Object.values(PRODUCT_CATEGORY),
      required: true,
    },
    subCategory: String,
    metal: {
      type: String,
      enum: Object.values(METAL_TYPE),
      required: true,
    },
    purity: {
      type: String,
      default: "92.5%",
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
    },
    makingCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    gst: {
      type: Number,
      default: 3,
      min: 0,
    },
    images: [
      {
        url: { type: String, required: true },
        alt: String,
        isPrimary: { type: Boolean, default: false },
        publicId: String,
      },
    ],
    price: {
      basePrice: {
        type: Number,
        required: true,
        min: 0,
      },
      sellingPrice: {
        type: Number,
        required: true,
        min: 0,
      },
      discount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },
    stock: {
      quantity: {
        type: Number,
        default: 0,
        min: 0,
      },
      isInStock: {
        type: Boolean,
        default: true,
      },
      lowStockThreshold: {
        type: Number,
        default: 5,
      },
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        default: "cm",
      },
    },
    tags: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    seoMetadata: {
      title: String,
      description: String,
      keywords: [String],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ===========================
   Indexes
=========================== */

// Text search
productSchema.index({
  name: "text",
  description: "text",
  tags: "text",
});

// Filters
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ "price.sellingPrice": 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ createdAt: -1 });

/* ===========================
   Hooks
=========================== */

// Generate slug
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

// Update stock status
productSchema.pre("save", function (next) {
  this.stock.isInStock = this.stock.quantity > 0;
  next();
});

/* ===========================
   Virtuals
=========================== */

productSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "productId",
});

module.exports = mongoose.model("Product", productSchema);
