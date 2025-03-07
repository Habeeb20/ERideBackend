import express from "express";
import { calculateFare } from "../../config/fareCalculator.js";

import Trip from "../../models/trip/tripSchema.js";
import User from "../../models/auth/authSchema.js";
import axios from "axios";
import { verifyToken } from "../../middleware/verifyToken.js";

const router = express.Router();


// Create a new trip
router.post("/create", verifyToken, async (req, res) => {
  const { pickup, destination, proposedFare } = req.body;

  try {
  
    const directionsResponse = await axios.get(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${pickup.lat},${pickup.lng}&destination=${destination.lat},${destination.lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );
    const route = directionsResponse.data.routes[0].legs[0];
    const distance = route.distance.value / 1000;
    const duration = route.duration.value / 60; 

    
    const suggestedFare = calculateFare(distance, duration);

    const trip = new Trip({
      clientId: req.user.id,
      pickup: { address: pickup.address, lat: pickup.lat, lng: pickup.lng },
      destination: { address: destination.address, lat: destination.lat, lng: destination.lng },
      distance,
      duration,
      suggestedFare,
      clientProposedFare: proposedFare || suggestedFare,
    });

    await trip.save();

 
    req.app.get("io").to("drivers").emit("tripRequest", trip);

    res.status(201).json({ status: true, trip });
  } catch (error) {
    console.error("Trip creation error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});


router.post("/offer", authMiddleware, async (req, res) => {
  const { tripId, offeredFare } = req.body;

  try {
    const trip = await Trip.findById(tripId);
    if (!trip || trip.status !== "pending") {
      return res.status(400).json({ status: false, message: "Trip not available" });
    }

    trip.driverOffers.push({ driverId: req.user.id, offeredFare });
    await trip.save();

    req.app.get("io").to(trip.clientId.toString()).emit("newOffer", { driverId: req.user.id, offeredFare });

    res.status(200).json({ status: true, message: "Offer submitted" });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server error" });
  }
});


router.post("/accept", authMiddleware, async (req, res) => {
  const { tripId, driverId } = req.body;

  try {
    const trip = await Trip.findById(tripId);
    if (!trip || trip.status !== "pending") {
      return res.status(400).json({ status: false, message: "Trip not available" });
    }

    trip.status = "accepted";
    trip.acceptedDriverId = driverId;
    await trip.save();

    req.app.get("io").to(driverId.toString()).emit("offerAccepted", trip);

    res.status(200).json({ status: true, message: "Offer accepted" });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.post("/complete", authMiddleware, async (req, res) => {
    const { tripId } = req.body;
  
    try {
      const trip = await Trip.findById(tripId);
      if (!trip || trip.status !== "accepted") {
        return res.status(400).json({ status: false, message: "Trip not active" });
      }
  
      trip.status = "completed";
      await trip.save();
  
      req.app.get("io").to(trip.clientId.toString()).emit("tripCompleted", trip);
      req.app.get("io").to(trip.acceptedDriverId.toString()).emit("tripCompleted", trip);
  
      res.status(200).json({ status: true, message: "Trip completed" });
    } catch (error) {
      res.status(500).json({ status: false, message: "Server error" });
    }
  });

export default router;