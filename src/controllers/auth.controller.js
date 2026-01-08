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
   COOKIE OPTIONS (FIXED FOR CROSS-SITE)
===================================================== */
const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: true,       // REQUIRED on HTTPS
  sameSite: "none",   // REQUIRED for Vercel ↔ Render
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

/* =====================================================
   REGISTER
===================================================== */
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body;

  const existingUser = await User.findOne({
    $or: [{ email }, { phone }],
  });

  if (existingUser) {
    if (existingUser.email === email)
      throw new ApiError(400, "Email already registered");
    if (existingUser.phone === phone)
      throw new ApiError(400, "Phone number already registered");
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");

  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    password,
    verificationToken,
    verificationTokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
  });

  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Verify Your Email - Lakshmi Silver",
      html: `<p>Verify your email: <a href="${verificationUrl}">Verify</a></p>`,
    });
  } catch (err) {
    console.error("Email error:", err);
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

  res.status(201).json(
    new ApiResponse(
      201,
      { user: user.toJSON(), accessToken },
      "Registered successfully. Please verify your email."
    )
  );
});

/* =====================================================
   LOGIN
===================================================== */
const login = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;
  const query = email ? { email } : { phone };

  const user = await User.findOne(query).select("+password");
  if (!user) throw new ApiError(401, "Invalid credentials");

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, "Invalid credentials");

  if (!user.isVerified)
    throw new ApiError(403, "Please verify your email");

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

  res.status(200).json(
    new ApiResponse(
      200,
      { user: user.toJSON(), accessToken },
      "Login successful"
    )
  );
});

/* =====================================================
   LOGOUT
===================================================== */
const logout = asyncHandler(async (req, res) => {
  res.cookie("refreshToken", "", {
    ...refreshTokenCookieOptions,
    expires: new Date(0),
  });

  res.status(200).json(new ApiResponse(200, null, "Logout successful"));
});

/* =====================================================
   GET ME
===================================================== */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json(new ApiResponse(200, { user }));
});

/* =====================================================
   FORGOT PASSWORD
===================================================== */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user)
    return res
      .status(200)
      .json(new ApiResponse(200, null, "If user exists, email sent"));

  const resetToken = crypto.randomBytes(32).toString("hex");

  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.resetPasswordExpiry = Date.now() + 60 * 60 * 1000;

  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await sendEmail({
    email: user.email,
    subject: "Reset Password - Lakshmi Silver",
    html: `<a href="${resetUrl}">Reset Password</a>`,
  });

  res.status(200).json(
    new ApiResponse(200, null, "Password reset email sent")
  );
});

/* =====================================================
   RESET PASSWORD
===================================================== */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) throw new ApiError(400, "Invalid or expired token");

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  await user.save();

  res.status(200).json(
    new ApiResponse(200, null, "Password reset successful")
  );
});

/* =====================================================
   CHANGE PASSWORD
===================================================== */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) throw new ApiError(401, "Incorrect current password");

  user.password = newPassword;
  await user.save();

  res.status(200).json(
    new ApiResponse(200, null, "Password changed successfully")
  );
});

/* =====================================================
   REFRESH TOKEN
===================================================== */
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) throw new ApiError(401, "Refresh token missing");

  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) throw new ApiError(401, "Invalid refresh token");

  const accessToken = generateAccessToken(user._id);

  res.status(200).json(
    new ApiResponse(200, { accessToken }, "Token refreshed")
  );
});

/* =====================================================
   EXPORTS
===================================================== */
module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshAccessToken,
};
