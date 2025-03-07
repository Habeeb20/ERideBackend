import jwt from "jsonwebtoken";
import User from "../models/auth/authSchema.js";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import Profile from "../models/auth/profileSchema.js";
import crypto from "crypto";
import cloudinary from "cloudinary"
import dotenv from "dotenv"

dotenv.config()
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "essentialng23@gmail.com",
    pass: "jvrbtnuvubsdwtwu",
  },
});

;



cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const sendOTPEmail = async (email, otp, firstName) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify your email",
    html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification - E_Ride</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f5f5f5; color: #333;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
            <tr>
              <td style="padding: 20px; text-align: center; background-color: #7E22CE; color: white; border-top-left-radius: 12px; border-top-right-radius: 12px;">
                <h1 style="font-size: 28px; margin: 0; font-weight: bold; font-family: 'Helvetica', sans-serif;">E_Ride</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 30px;">
                <h2 style="font-size: 24px; color: #333; margin-bottom: 20px; font-weight: 600; font-family: 'Helvetica', sans-serif;">Verify Your Email</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #666; margin-bottom: 20px;">
                  Hello ${firstName || "there"},
                </p>
                <p style="font-size: 16px; line-height: 1.6; color: #666; margin-bottom: 30px;">
                  Thank you for signing up with E_Ride! To complete your registration and secure your account, please verify your email address by entering the following 6-digit verification code:
                </p>
                <div style="text-align: center; margin: 30px 0; background-color: #f0f0f0; padding: 20px; border-radius: 8px;">
                  <span style="display: inline-block; font-size: 32px; font-weight: bold; color: #7E22CE; letter-spacing: 6px; font-family: 'Helvetica', sans-serif;">
                    ${otp}
                  </span>
                </div>
                <p style="font-size: 16px; line-height: 1.6; color: #666; margin-bottom: 20px;">
                  This code will expire in 24 hours for your security. If you didn’t request this verification, please ignore this email or contact our support team at <a href="mailto:support@e-ride.com" style="color: #7E22CE; text-decoration: none; font-weight: 500;">support@e-ride.com</a>.
                </p>
                <p style="font-size: 16px; line-height: 1.6; color: #666; margin-bottom: 30px;">
                  If you have any questions, feel free to reach out to us. We’re here to help you get started with E_Ride!
                </p>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="http://localhost:5173/verifyemail?email=${encodeURIComponent(
                    email
                  )}" 
                     style="display: inline-block; padding: 12px 30px; background-color: #7E22CE; color: white; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; font-family: 'Helvetica', sans-serif; transition: background-color 0.3s;">
                    Verify Now
                  </a>
                </div>
                <p style="font-size: 14px; color: #999; text-align: center; margin-top: 40px; font-family: 'Arial', sans-serif;">
                  © 2025 E_Ride. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
  };
  try {
    const sentMail = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", sentMail);
    return { success: true };
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, error: error.message };
  }
};

export const register = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ status: false, message: "Email already exists" });
    }


    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const uniqueNumber = `RL-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;
    const verificationTokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    
      verificationToken,
      verificationTokenExpiresAt,
      uniqueNumber,
    });

    await newUser.save();

    const response = await sendOTPEmail(
      newUser.email,
      verificationToken,
      firstName
    );
    if (!response.success) {
      console.log("Email sending error:", response.error);
      return res
        .status(400)
        .json({ status: false, message: "Failed to send verification email" });
    }

    const payload = { user: { id: newUser._id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(200).json({
      status: true,
      message: "Successfully registered. Please verify your email.",
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    console.log("Verifying email:", { email, code });

    const user = await User.findOne({
      email,
      verificationToken: code,
      verificationTokenExpiresAt: { $gt: Date.now() },
    });
    if (!user) {
      return res
        .status(404)
        .json({
          status: false,
          message: "User not found or invalid verification code",
        });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    const payload = { user: { id: user._id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      success: true,
      message: "Email verified successfully",
      token,
      user: { id: user._id, email: user.email, isVerified: true },
    });
  } catch (err) {
    console.error("Email verification error:", err);
    res
      .status(500)
      .json({ status: false, message: err.message || "Server error occurred" });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Resending OTP for email:", email);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    const verificationToken = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const verificationTokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000;

    user.verificationToken = verificationToken;
    user.verificationTokenExpiresAt = verificationTokenExpiresAt;
    await user.save();

    const response = await sendOTPEmail(
      email,
      verificationToken,
      user.firstName
    );
    if (!response.success) {
      console.log("Email sending error:", response.error);
      return res
        .status(400)
        .json({ status: false, message: "Failed to resend verification code" });
    }

    res.json({
      status: true,
      message: "Verification code resent successfully",
    });
  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ status: false, message: "Server error occurred" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "incorrect password" });


    const profile = await Profile.findOne({ userId: user._id });
    if (!profile) {
      return res.status(400).json({
        status: false,
        message: "Profile not found. Please complete your profile or register with another mail.",
      });
    }

    const payload =  {id: user._id  };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

 console.log(token)
    return res.status(200).json({
      status: true,
      message: "successfully logged in",
      token,
      role: profile.role
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};

// export const dashboard = async (req, res) => {
//   const userId = req.user?.id; 


//   if (!userId) {
//     console.log("No user ID provided in request");
//     return res.status(401).json({
//       status: false,
//       message: "Unauthorized: No user ID provided",
//     });
//   }

//   try {
  
//     const user = await User.findOne({ _id: userId });
//     if (!user) {
//       console.log("User not found for ID:", userId);
//       return res.status(404).json({
//         status: false,
//         message: "Not authorized: User not found",
//       });
//     }



//     const profile = await Profile.findOne({ userId: user._id }).populate(
//       "userId",
//       "firstName lastName email"
//     );
//     if (!profile) {
//       console.log("Profile not found for user ID:", user._id);
//       return res.status(400).json({
//         status: false,
//         message: "Profile not found. Please complete your profile or register with another email.",
//       });
//     }

//     console.log("Profile found:", profile);

  
//     return res.status(200).json({
//       status: true,
//       data: profile,
//     });
//   } catch (error) {
//     console.error("Dashboard error:", error);
//     return res.status(500).json({
//       status: false,
//       message: "An error occurred",
//       error: error.message, // Optional: include error details for debugging
//     });
//   }
// };

export const googleCallback = async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  try {
    if (!req.user || !req.user.googleProfile) {
      console.error("User or Google profile data missing in googleCallback");
      return res.redirect(`${clientUrl}/plogin`);
    }

    const { googleProfile } = req.user;
    const email =
      googleProfile.emails && googleProfile.emails[0]
        ? googleProfile.emails[0].value
        : null;

    if (!email) {
      console.error("Email missing from Google profile");
      return res.redirect(`${clientUrl}/plogin`);
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        firstName: googleProfile.name?.givenName || "Google",
        lastName: googleProfile.name?.familyName || "User",
        email: email,
        googleId: googleProfile.id,
        googleProfile: googleProfile,
      });
      await user.save();
    }

    const payload = { user: { id: user._id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    console.log("Google Callback - Generated Token:", token);

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${clientUrl}/userdashboard?token=${token}`);
  } catch (error) {
    console.error("Error in Google Callback:", error);
    res.redirect(`${clientUrl}/plogin`);
  }
};

export const facebookCallback = async (req, res) => {
  const { profile } = req.user;

  try {
    let user = await User.findOne({ email: profile.emails[0].value });
    if (!user) {
      user = new User({
        firstName: profile.name.givenName || profile.displayName.split(" ")[0],
        lastName:
          profile.name.familyName ||
          profile.displayName.split(" ").slice(1).join(" "),
        email: profile.emails[0].value,
        facebookId: profile.id,
      });
      await user.save();
    }
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.redirect(`process.env.CLIENT_URL/dashboard?token=${token}`);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const twitterCallback = async (req, res) => {
  const { profile } = req.user;
  try {
    let user = await User.findOne({
      email: profile.emails
        ? profile.emails[0].value
        : `twitter_${profile.id}@example.com`,
    });
    if (!user) {
      user = new User({
        firstName: profile.displayName.split(" ")[0] || "Twitter",
        lastName: profile.displayName.split(" ").slice(1).join(" ") || "User",
        email: profile.emails
          ? profile.emails[0].value
          : `twitter_${profile.id}@example.com`,
        twitterId: profile.id,
      });
      await user.save();
    }
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.redirect(`process.env.CLIENT_URL/dashboard?token=${token}`);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};
