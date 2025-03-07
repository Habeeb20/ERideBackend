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
import session from "express-session"; // Import express-session
import MongoStore from "connect-mongo"; // Import connect-mongo (optional for MongoDB sessions)
import profileRoute from "./routes/profileroute.js";

dotenv.config();
connectDb();

const app = express();
app.set("timeout", 60000);
const port = process.env.PORT || 1000;

// Session configuration
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
  origin: ["http://localhost:5173","http://localhost:5174" ],
  credentials: true,
}));
app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(passport.initialize());
app.use(passport.session()); 

app.use("/api/auth", authRoute);
app.use("/api/profile", profileRoute)

app.listen(port, () => {
  console.log(`Your app is listening on port ${port}`);
});