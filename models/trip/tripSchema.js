import mongoose from "mongoose";
const tripSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    pickup: { address: String, lat: Number, lng: Number },
    destination: { address: String, lat: Number, lng: Number },
    distance: Number, 
    duration: Number, 
    suggestedFare: Number,
    clientProposedFare: Number,
    status: { type: String, enum: ["pending", "negotiating", "accepted", "completed", "cancelled"], default: "pending" },
    driverOffers: [{ driverId: mongoose.Schema.Types.ObjectId, offeredFare: Number }],
    acceptedDriverId: { type: mongoose.Schema.Types.ObjectId, ref: "Auth" },
    createdAt: { type: Date, default: Date.now },
  });
  export default mongoose.model("Trip", tripSchema);