import User from "../models/auth/authSchema.js"
import Profile from "../models/auth/profileSchema.js"
import Trip from "../models/trip/tripSchema.js";
export const calculateFare = async(distance, duration) => {
    const baseFare = 500; 
    const distanceRate = 100; 
    const timeRate = 20; 
    const minFare = 1000; 
  

    const drivers = await Profile.countDocuments({ role: "driver", isOnline: true });
    const trips = await Trip.countDocuments({ status: "pending" });
    const demandMultiplier = trips > drivers ? 1.5 : 1.0; // Simple example
  
    let fare = baseFare + (distance * distanceRate) + (duration * timeRate);
  
   

    fare *= demandMultiplier;
  
    return Math.max(fare, minFare)
  };

















