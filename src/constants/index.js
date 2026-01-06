module.exports = {
  USER_ROLES: {
    CUSTOMER: 'customer',
    ADMIN: 'admin',
  },

  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    RETURNED: 'returned',
  },

  PAYMENT_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
  },

  PAYMENT_METHOD: {
    RAZORPAY: 'razorpay',
    COD: 'cod',
  },

  ADDRESS_TYPE: {
    HOME: 'home',
    WORK: 'work',
    OTHER: 'other',
  },

  PRODUCT_CATEGORY: {
    RING: 'ring',
    NECKLACE: 'necklace',
    EARRING: 'earring',
    BRACELET: 'bracelet',
    ANKLET: 'anklet',
    PENDANT: 'pendant',
    CHAIN: 'chain',
    COIN: 'coin',
    IDOL: 'idol',
  },

  METAL_TYPE: {
    SILVER: 'silver',
    GOLD: 'gold',
    PLATINUM: 'platinum',
  },

  NOTIFICATION_TYPE: {
    ORDER: 'order',
    PAYMENT: 'payment',
    OFFER: 'offer',
    SYSTEM: 'system',
  },
};