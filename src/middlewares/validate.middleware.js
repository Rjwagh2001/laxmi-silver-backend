const ApiError = require('../utils/ApiError');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      return next(new ApiError(400, 'Validation error', errors));
    }

    next();
  };
};

module.exports = validate;
