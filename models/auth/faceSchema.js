import mongoose from "mongoose";


const faceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Auth",
        required: true
    },

    faceEncoding: {type:[Number], required: true},
    capturedAt: {type:Date, default: Date.now}
})

export default mongoose.model("Face", faceSchema)