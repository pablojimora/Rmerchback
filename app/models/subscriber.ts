import mongoose from "mongoose";

const SubscriberSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Por favor ingresa un email válido']
    },
    subscribed: {
        type: Boolean,
        default: true
    },
    subscribedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

export default mongoose.models.Subscriber || mongoose.model("Subscriber", SubscriberSchema);
