import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import passport from "passport";
import { register, login, googleCallback, facebookCallback, twitterCallback, verifyEmail, sendOtp } from "../controller/authController.js";
import { verifyToken } from "../middleware/verifyToken.js";
import User from "../models/auth/authSchema.js"
import Profile from "../models/auth/profileSchema.js"
import upload from "../upload.js";
const authRoute = express.Router();

// Register route
authRoute.post("/register",  register);

// Login route
authRoute.post("/login", login);
authRoute.get("/dashboard", verifyToken, async(req, res) => {
  const userId = req.user?.id || req.user?._id; 

  if (!userId) {
    console.log("No user ID provided in request");
    return res.status(401).json({
      status: false,
      message: "Unauthorized: No user ID provided",
    });
  }

  try {
  
    const user = await User.findOne({ _id: userId });
    if (!user) {
      console.log("User not found for ID:", userId);
      return res.status(404).json({
        status: false,
        message: "Not authorized: User not found",
      });
    }



    const profile = await Profile.findOne({ userId: user._id }).populate(
      "userId",
      "firstName lastName email"
    );
    if (!profile) {
      console.log("Profile not found for user ID:", user._id);
      return res.status(400).json({
        status: false,
        message: "Profile not found. Please complete your profile or register with another email.",
      });
    }

    console.log("Profile found:", profile);

  
    return res.status(200).json({
      status: true,
      data: profile,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred",
      error: error.message, 
    });
  }
})

authRoute.post("/send-otp", sendOtp)
authRoute.post("/verify-email", verifyEmail);

// Google OAuth
authRoute.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

authRoute.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: `${process.env.CLIENT_URL}/plogin` }),
    (req, res, next) => {
      console.log("Google callback middleware - req.user:", req.user);
      console.log("Google callback middleware - req.query:", req.query);
      next();
    },
    googleCallback
  );
// Facebook OAuth
authRoute.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));

authRoute.get(
  "/facebook/callback",
  passport.authenticate("facebook", { failureRedirect:`${process.env.CLIENT_URL}/plogin` }), 
  facebookCallback 
);


authRoute.get("/twitter", passport.authenticate("twitter", { scope: ["email"] }));

authRoute.get(
  "/twitter/callback",
  passport.authenticate("twitter", { failureRedirect: `${process.env.CLIENT_URL}/plogin` }), 
  twitterCallback 
);

export default authRoute;