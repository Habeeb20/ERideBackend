import mongoose, { Types } from "mongoose";


const authSchema = new mongoose.Schema({
  profileId:{
    type:mongoose.Schema.Types.ObjectId,
    ref: "Profile"
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },

  email: { type: String, required: true, unique: true },
  password: { type: String }, 
 
// googleId: { type: String, sparse: true, unique: true }, 
  // googleProfile: { 
  //   emails: [{ value: String, verified: Boolean }],
  //   photos: [{ value: String }],
  //   displayName: String,
  // },
  // facebookId: { type: String },
  // twitterId: { type: String }, 
    isVerified: {type: Boolean,default: false},
    status: { type: String, enum: ['active', 'blocked', 'pending'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    registrationDate: { type: Date, default: Date.now },
    uniqueNumber: { type: String, unique: true },
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationTokenExpiresAt: Date,
}, {timestamps: true})

export default mongoose.model("Auth", authSchema)