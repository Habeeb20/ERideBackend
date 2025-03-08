import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import connectDb from "./db.js";
import dotenv from "dotenv";
import morgan from "morgan";
import multer from "multer";
import passport from "./config/passport.js";
import authRoute from "./routes/auth.route.js";
import session from "express-session"; 
import MongoStore from "connect-mongo"; 
import profileRoute from "./routes/profileroute.js";
import { Server } from "socket.io";
import { createServer } from "http";
import Profile from "./models/auth/profileSchema.js";
import User from "./models/auth/authSchema.js";
import Trip from "./models/trip/tripSchema.js";
import TripRoute from "./models/trip/tripSchema.js"
import faceRoute from "./routes/face.route.js";
dotenv.config();
connectDb();


const app = express();

app.set("timeout", 60000);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true, 
  },
});
app.set("io", io);
const port = process.env.PORT || 1000;


const sessionConfig = {
  secret: process.env.JWT_SECRET , 
  resave: false,
  saveUninitialized: false, 
  cookie: {
    secure: false, 
    maxAge: 24 * 60 * 60 * 1000, 
  },
  
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URL, 
    collectionName: "sessions", 
  }),
};

app.use(session(sessionConfig));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(multer().any());
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true, 
}));
app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(passport.initialize());
app.use(passport.session()); 

app.use("/api/auth", authRoute);
app.use("/api/profile", profileRoute)
app.use("/api/trips", TripRoute)
app.use("/api/auth", faceRoute)

app.get("/", (req, res) => {
  res.send("app is listening on port....")
})



















//socket io
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("driverOnline", async ({ driverId, location }) => {
    await Profile.findByIdAndUpdate(driverId, { isOnline: true, location });
    socket.join("drivers"); // Join drivers room
  });

  socket.on("driverLocationUpdate", async ({ driverId, location }) => {
    try {
      await Profile.findByIdAndUpdate(driverId, { location });
      const trip = await Trip.findOne({ acceptedDriverId: driverId, status: "accepted" });
      if (trip) {
        io.to(trip.clientId.toString()).emit("driverLocation", { driverId, location });
      }
    } catch (error) {
      console.error("Error in driverLocationUpdate:", error);
    }
  });
  // Handle trip broadcast
  socket.on("newTrip", (trip) => {
    io.to("drivers").emit("tripRequest", trip); 
  });

  // Driver offers a price
  socket.on("driverOffer", async ({ tripId, driverId, offeredFare }) => {
    const trip = await Trip.findById(tripId);
    trip.driverOffers.push({ driverId, offeredFare });
    await trip.save();
    io.to(trip.clientId.toString()).emit("newOffer", { driverId, offeredFare }); 
  });

 
  socket.on("acceptOffer", async ({ tripId, driverId }) => {
    const trip = await Trip.findById(tripId);
    trip.status = "accepted";
    trip.acceptedDriverId = driverId;
    await trip.save();
    io.to(driverId.toString()).emit("offerAccepted", trip); 
  });


  socket.on("tripCompleted", async ({ tripId }) => {
    const trip = await Trip.findById(tripId);
    trip.status = "completed";
    await trip.save();
    io.to(trip.clientId.toString()).emit("tripCompleted", trip);
    io.to(trip.acceptedDriverId.toString()).emit("tripCompleted", trip);
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);
   
  });
});




httpServer.listen(port, () => {
  console.log(`Your app is listening on port ${port}`);
});