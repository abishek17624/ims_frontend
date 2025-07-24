const express = require("express");
const router = express.Router();

router.post("/logout", (req, res) => {
  // Clear refresh token cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax", // Consistent with login/refresh
  });

  // Clear access token cookie (important if you set it as HttpOnly cookie)
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
  });

  return res
    .status(200)
    .json({ success: 1, message: "Logged out successfully" });
});

module.exports = router;