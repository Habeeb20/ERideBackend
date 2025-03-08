import Face from "../models/auth/faceSchema.js";
import express from "express"
import {verifyToken} from "../middleware/verifyToken.js"
import User from "../models/auth/authSchema.js"
const faceRoute = express.Router()

faceRoute.post("/save-face", verifyToken, async(req, res) =>{
    const {faceEncoding} = req.body;
    const id = req.user.id;

    try {
        const user = await User.findOne({id})
        if(!user){
            return res.status(404).json({
                message: "user not found",
                status: false
            })
        }

        const face = new Face({
            userId: user._id,
            faceEncoding
        })

        await face.save()
        return res.status(200).json({
            status: true,
            message: "your face has been successfully captured"
            
        })
    } catch (error) {
        console.error("Error saving face data:", error);
    res.status(500).json({ status: false, message: "Server error" });
    }
})

export default faceRoute