import mongoose from "mongoose";
import dotenv from "dotenv"

dotenv.config();
const connectDb = async() => {
   try {
    const connectdb = await mongoose.connect(process.env.MONGO_URL)
    if(!connectdb){
        console.log("could not connect to database")
    }
    console.log("successfuly connected to the database")
   } catch (error) {
    
    console.log("an error occured", error)
   }
}

export default connectDb