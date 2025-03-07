import express from "express";
import mongoose from "mongoose";
import cloudinary from "cloudinary"


import Profile from "../models/auth/profileSchema.js";
import dotenv from "dotenv"
import User from "../models/auth/authSchema.js";
import {verifyToken} from "../middleware/verifyToken.js"
import multer from "multer";
dotenv.config()


const profileRoute = express.Router()





cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// const upload = multer({ dest: "uploads/" });


// profileRoute.post("/createprofile",  async (req, res) => {
//     try {
//       console.log("Request Body:", req.body);
//       console.log("Request Files:", req.files || "No files uploaded");
  
//       const { userEmail, role, question, location, phoneNumber, carDetails } = req.body;
  
//       const user = await User.findOne({ email: userEmail });
//       if (!user) {
//         return res.status(404).json({
//           status: false,
//           message: "User not found",
//         });
//       }
  
//       const profileData = {
//         userEmail,
//         userId: user._id,
//         role,
//         location: JSON.parse(location),
//         phoneNumber,
//       };
  
//       if (role === "passenger" && question === "student" && req.files) {
//         const schoolIdFile = req.files.find((file) => file.fieldname === "schoolId");
//         if (schoolIdFile) {
//           const result = await cloudinary.uploader.upload(schoolIdFile.path);
//           profileData.schoolIdUrl = result.secure_url;
//           await fs.unlink(schoolIdFile.path);
//         }
//         profileData.question = question;
//       } else if (role === "passenger" && question === "passenger") {
//         profileData.question = question; // No file expected
//       } else if (role === "driver" && req.files) {
//         const driverLicenseFile = req.files.find((file) => file.fieldname === "driverLicense");
//         const carPictureFile = req.files.find((file) => file.fieldname === "carPicture");
//         const profilePictureFile = req.files.find((file) => file.fieldname === "profilePicture");
  
//         if (driverLicenseFile) {
//           const licenseResult = await cloudinary.uploader.upload(driverLicenseFile.path);
//           profileData.driverLicenseUrl = licenseResult.secure_url;
//           await fs.unlink(driverLicenseFile.path);
//         }
//         if (carPictureFile) {
//           const carPictureResult = await cloudinary.uploader.upload(carPictureFile.path);
//           profileData.carPictureUrl = carPictureResult.secure_url;
//           await fs.unlink(carPictureFile.path);
//         }
//         if (profilePictureFile) {
//           const picResult = await cloudinary.uploader.upload(profilePictureFile.path);
//           profileData.profilePictureUrl = picResult.secure_url;
//           await fs.unlink(profilePictureFile.path);
//         }
//         profileData.carDetails = JSON.parse(carDetails);
//       }
  
//       const profile = new Profile(profileData);
//       await profile.save();
  
//       res.status(201).json({
//         status: true,
//         message: "Profile created",
//         role,
//       });
//     } catch (error) {
//       console.error("Error in /createprofile:", error);
//       res.status(500).json({
//         status: false,
//         message: "Server error",
//         error: error.message,
//       });
//     }
//   });


const uploadToCloudinary = (buffer, options) => {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
      uploadStream.end(buffer);
    });
  }




  const upload = multer({ dest: 'uploads/' }).fields([
      { name: 'schoolId', maxCount: 1 },
      { name: 'profilePicture', maxCount: 1 },
      { name: 'carPicture', maxCount: 1 }
  ]);
  
  profileRoute.post("/createprofile", async (req, res) => {
    const { userEmail, role, location, phoneNumber, carDetails, question, profilePicture, schoolId, carPicture, driverLicense } = req.body;
  
    try {
      console.log("Request Body:", req.body);
  
      // Validate required fields
      if (!userEmail || !role || !location || !phoneNumber || !profilePicture) {
        return res.status(400).json({
          status: false,
          message: "Missing required fields: userEmail, role, location, phoneNumber, or profilePicture",
        });
      }
  
      if (!["passenger", "driver", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role value" });
      }
  
      if (phoneNumber.length > 11) {
        return res.status(400).json({ message: "Phone number should not exceed 11 characters" });
      }
      if (phoneNumber.length < 11) {
        return res.status(400).json({ message: "Phone number shouldn't be less than 11 characters" });
      }
  
      const user = await User.findOne({ email: userEmail });
      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found",
        });
      }
  
      let parsedLocation;
      try {
        parsedLocation = JSON.parse(location);
        if (!parsedLocation.state || !parsedLocation.lga) {
          return res.status(400).json({
            status: false,
            message: "Location must include state and lga",
          });
        }
      } catch (e) {
        return res.status(400).json({
          status: false,
          message: "Invalid location JSON format",
        });
      }
  
      // Base profile data
      const profileData = {
        userEmail,
        userId: user._id,
        role,
        location: parsedLocation,
        phoneNumber,
      };
  
  
      if (!profilePicture) {
        return res.status(400).json({
          status: false,
          message: "Profile picture is required for all users",
        });
      }
      const profileResult = await cloudinary.v2.uploader.upload(profilePicture, {
        folder: "e-ride/profiles",
        resource_type: "image",
        eager_async: true,
      });
      profileData.profilePictureUrl = profileResult.secure_url;
      console.log("Profile picture uploaded to Cloudinary:", profileData.profilePictureUrl);
  
      // Handle passenger role
      if (role === "passenger") {
        if (!question || !["student", "passenger"].includes(question)) {
          return res.status(400).json({
            status: false,
            message: "Question is required for passenger role and must be 'student' or 'passenger'",
          });
        }
        profileData.question = question;
  
        if (question === "student") {
          if (!schoolId) {
            return res.status(400).json({
              status: false,
              message: "School ID file is required for student passengers",
            });
          }
          const schoolResult = await cloudinary.v2.uploader.upload(schoolId, {
            folder: "e-ride/profiles",
            resource_type: "image",
            eager_async: true,
          });
          profileData.schoolIdUrl = schoolResult.secure_url;
          console.log("School ID uploaded to Cloudinary:", profileData.schoolIdUrl);
        }
      }
  
      // Handle driver role
      if (role === "driver") {
        if (!carPicture) {
          return res.status(400).json({
            status: false,
            message: "Car picture is required for drivers",
          });
        }
        if (!driverLicense) {
            return res.status(400).json({ status: false, message: "Driver's license required" });
          }
        const carResult = await cloudinary.v2.uploader.upload(carPicture, {
          folder: "e-ride/profiles",
          resource_type: "image",
          eager_async: true,
        });
        profileData.carPicture = carResult.secure_url;
        console.log("Car picture uploaded to Cloudinary:", profileData.carPicture);

        const licenseResult = await cloudinary.uploader.upload(driverLicense, {
            folder: "e-ride/profiles",
            resource_type: "image",
            eager_async: true,
          });
        profileData.driverLicenseUrl = licenseResult.secure_url;
  
        if (!carDetails) {
          return res.status(400).json({
            status: false,
            message: "carDetails is required for drivers",
          });
        }
  
        let parsedCarDetails;
        try {
          parsedCarDetails = JSON.parse(carDetails);
          const requiredFields = ["model", "product", "year", "color", "plateNumber"];
          const missingFields = requiredFields.filter((field) => !parsedCarDetails[field]);
          if (missingFields.length > 0) {
            return res.status(400).json({
              status: false,
              message: `Missing required car details: ${missingFields.join(", ")}`,
            });
          }
        } catch (e) {
          return res.status(400).json({
            status: false,
            message: "Invalid carDetails JSON format",
          });
        }
        profileData.carDetails = parsedCarDetails;
      }
  
      // Save profile
      const profile = new Profile(profileData);
      await profile.save();
  
      res.status(201).json({
        status: true,
        message: "Profile created successfully",
        role,
        data: profile,
      });
    } catch (error) {
      console.error("Error in /createprofile:", error);
  
      if (error.name === "ValidationError") {
        return res.status(400).json({
          status: false,
          message: "Validation error: " + error.message,
        });
      }
  
      res.status(500).json({
        status: false,
        message: "Server error",
        error: error.message,
      });
    }
  });





profileRoute.get("/getprofile", verifyToken, async(req, res) => {
    const id = req.user.id
    try {
        const user = await User.findOne({id})

        if(!user){
            return res.status(404).json({
                status: false,
                message: "user account not found"
            })
        }

        const myuserId = user._id

        const profile = await Profile.findOne({userId: myuserId})
        if(!profile){
            return res.status(404).json({
                status: false,
                message: "profile data not found"
            })
        }

        return res.status(200).json({
            status: true,
            message: "successfully retrieved",
            profile
        })



    } catch (error) {
        console.log(error)
        return res.status(500).json({
            status: false,
            message: "an error occurred from the server"
        })
    }
})


profileRoute.put("/update", async (req, res) => {
    const { userId, firstName, lastName, email, phoneNumber, location } = req.body;
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { firstName, lastName, email },
        { new: true }
      );
      const profile = await Profile.findOneAndUpdate(
        { userId },
        { phoneNumber, location },
        { new: true }
      ).populate("userId", "firstName lastName email");
      res.status(200).json({ status: true, data: profile });
    } catch (error) {
      res.status(500).json({ status: false, message: "Failed to update profile" });
    }
  });
export default profileRoute