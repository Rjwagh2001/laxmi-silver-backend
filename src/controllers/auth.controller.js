const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const sendEmail = require("../utils/sendEmail");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateToken");

/* =====================================================
   COOKIE OPTIONS (CENTRALIZED & FIXED)
===================================================== */

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: true,          // REQUIRED for HTTPS (Render + Vercel)
  sameSite: "none",      // 🔥 REQUIRED for cross-site cookies
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body;

  const existingUser = await User.findOne({
    $or: [{ email }, { phone }],
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ApiError(400, "Email already registered");
    }
    if (existingUser.phone === phone) {
      throw new ApiError(400, "Phone number already registered");
    }
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;

  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    password,
    verificationToken,
    verificationTokenExpiry,
  });

  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Verify Your Email - Lakshmi Silver",
      html: `
        <h1>Welcome to Lakshmi Silver!</h1>
        <p>Hi ${user.firstName},</p>
        <p>Please verify your email:</p>
        <a href="${verificationUrl}">Verify Email</a>
      `,
    });
  } catch (error) {
    console.error("Email sending failed:", error);
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

  res.status(201).json(
    new ApiResponse(
      201,
      {
        user: user.toJSON(),
        accessToken,
      },
      "User registered successfully. Please verify your email."
    )
  );
});

// @desc    Verify email
// @route   POST /api/v1/auth/verify-email
// @access  Public
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ApiError(400, "Verification token is required");
  }

  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired verification token");
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpiry = undefined;
  await user.save();

  res
    .status(200)
    .json(new ApiResponse(200, null, "Email verified successfully"));
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;

  const query = email ? { email } : { phone };
  const user = await User.findOne(query).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (user.isLocked()) {
    throw new ApiError(423, "Account locked. Try later.");
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    await user.incLoginAttempts();
    throw new ApiError(401, "Invalid credentials");
  }

  if (!user.isVerified) {
    throw new ApiError(403, "Please verify your email to login");
  }

  await user.resetLoginAttempts();

  user.lastLogin = Date.now();
  await user.save();

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: user.toJSON(),
        accessToken,
      },
      "Login successful"
    )
  );
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  res.cookie("refreshToken", "", {
    ...refreshTokenCookieOptions,
    expires: new Date(0),
  });

  res.status(200).json(new ApiResponse(200, null, "Logout successful"));
});

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res
    .status(200)
    .json(new ApiResponse(200, { user }, "User data retrieved"));
});

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token not found");
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const user = await User.findById(decoded.id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const accessToken = generateAccessToken(user._id);

    res
      .status(200)
      .json(new ApiResponse(200, { accessToken }, "Token refreshed"));
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }
});

module.exports = {
  register,
  verifyEmail,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshAccessToken,
};
