import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
    
    },

    userEmail: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["passenger", "driver", "admin"],
    },
    profilePicture:{
        type:String,
       
    },
    isOnline: { type: Boolean, default: false },
    question: {
      type: String,
      enum: ["student", "passenger"],
      required: function () {
        return this.role === "passenger";
      },
    },
    schoolIdUrl: {
      type: String, 
      required: function () {
        return this.role === "passenger" && this.question === "student";
      },
    },
    driverLicenseUrl: {
      type: String, 
      required: function () {
        return this.role === "driver";
      },
    },
    carDetails: {
      model: {
        type: String,
        required: function () {
          return this.role === "driver";
        },
      },
      product: {
        type: String,
        required: function () {
          return this.role === "driver";
        },
      },
      year: {
        type: Number,
        required: function () {
          return this.role === "driver";
        },
      },
      color: {
        type: String,
        required: function () {
          return this.role === "driver";
        },
      },
      plateNumber: {
        type: String,
        required: function () {
          return this.role === "driver";
        },
      },
    },
  
    carPicture:{
        type:String,
        required: function(){
            return this.role === "driver"
        }
    },
    location: {
      state: { type: String, required: true },
      lga: { type: String, required: true },
      coordinates: { lat: Number, lng: Number }, 
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Profile", profileSchema);