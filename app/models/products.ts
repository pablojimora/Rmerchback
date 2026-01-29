import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    trim: true
  },

  price: {
    type: Number,
    required: true
  },

  stock: {
    type: Number,
    required: true,
    default: 0
  },

  images: {
    type: [String],
    default: []
  },

  ownerId: {
    type: String,
    required: false
  },

  ownerName: {
    type: String,
    required: false
  },

  isOfficial: {
    type: Boolean,
    default: false
  },

  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  totalReviews: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);