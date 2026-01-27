import mongoose from "mongoose";

// Schema para los items individuales del carrito
const CartItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    subtotal: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        default: ""
    }
});

// Schema principal del carrito
const CartSchema = new mongoose.Schema({
    // Identificador del usuario (puede ser email, userId, sessionId para usuarios no autenticados)
    userId: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    // Items en el carrito
    items: {
        type: [CartItemSchema],
        default: []
    },

    // Total del carrito
    total: {
        type: Number,
        default: 0,
        min: 0
    },

    // Para limpiar carritos antiguos automáticamente
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        index: { expires: 0 } // TTL index para auto-borrado
    }

}, {
    timestamps: true
});

// Índices para mejorar el rendimiento
CartSchema.index({ userId: 1 }, { unique: true });

export default mongoose.models.Cart || mongoose.model("Cart", CartSchema);
