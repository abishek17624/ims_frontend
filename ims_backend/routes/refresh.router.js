// routes/auth/refresh.router.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const db = require('../config/db'); // Assuming db.js is in config folder

router.post("/refresh-token", async (req, res) => {
  const refreshToken = req.cookies.refreshToken; // Get refresh token from cookie

  if (!refreshToken) {
    return res
      .status(401)
      .json({ success: 0, message: "No refresh token provided" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Optional: Check if the user still exists in the DB for extra security
    const [rows] = await db.execute('SELECT id, email, role FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) {
      return res.status(403).json({ success: 0, message: "Refresh token user not found" });
    }
    const user = rows[0];

    // Re-generate payload with fresh user data if needed, or use decoded.
    const payload = {
        id: user.id,
        name: user.name || user.email.split('@')[0], // Ensure 'name' or derive it
        role: user.role,
        email: user.email,
        // Include other fields like email_verified, mobile_verified if they were in the original token
        // email_verified: decoded.email_verified,
        // mobile_verified: decoded.mobile_verified,
    };


    const newAccessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Set the new access token as HttpOnly cookie
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "Lax", // Consistent with login
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    return res.status(200).json({
      success: 1,
      message: "Token refreshed successfully",
      accessToken: newAccessToken, // Return new access token for Bearer auth in frontend
    });
  } catch (err) {
    console.error("Refresh token error:", err);
    // If refresh token is invalid or expired, clear it
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    });
    res.clearCookie("accessToken", { // Also clear access token cookie if present
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    });
    return res
      .status(403) // Use 403 Forbidden for invalid/expired tokens after initial check
      .json({ success: 0, message: "Invalid or expired refresh token" });
  }
});

module.exports = router;