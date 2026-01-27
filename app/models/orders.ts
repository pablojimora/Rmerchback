import mongoose from "mongoose";

// Schema para los items individuales de la orden
const OrderItemSchema = new mongoose.Schema({
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
    },
    ownerId: {
        type: String,
        required: false // null para productos oficiales, userId para productos de vendedor
    },
    isOfficial: {
        type: Boolean,
        default: false
    }
});

// Schema principal de Order
const OrderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true
    },

    // ID o identificador del usuario que realiza la compra
    // Puede ser email, username, o cualquier identificador único
    userId: {
        type: String,
        required: false, // Opcional si prefieres solo usar customer info
        trim: true
    },

    // Items de la orden
    items: {
        type: [OrderItemSchema],
        required: true,
        validate: {
            validator: function (items: any[]) {
                return items && items.length > 0;
            },
            message: "La orden debe tener al menos un producto"
        }
    },

    // Información del cliente/comprador
    customer: {
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        },
        address: {
            street: {
                type: String,
                required: true,
                trim: true
            },
            city: {
                type: String,
                required: true,
                trim: true
            },
            state: {
                type: String,
                trim: true
            },
            zipCode: {
                type: String,
                trim: true
            },
            country: {
                type: String,
                required: true,
                trim: true,
                default: "México"
            }
        }
    },

    // Total de la orden
    total: {
        type: Number,
        required: true,
        min: 0
    },

    // Estado del pedido (flujo completo de entrega)
    status: {
        type: String,
        enum: [
            "pendiente",      // Orden creada, esperando confirmación
            "confirmada",     // Admin confirma la orden
            "en_preparacion", // Admin está preparando el pedido
            "enviada",        // Pedido enviado al cliente
            "entregada",      // Cliente recibió el pedido
            "cancelada"       // Orden cancelada
        ],
        default: "pendiente"
    },

    // Método de pago
    paymentMethod: {
        type: String,
        enum: ["efectivo", "tarjeta", "transferencia", "paypal", "mercado_pago"],
        required: true
    },

    // Estado del pago
    paymentStatus: {
        type: String,
        enum: ["pendiente", "pagado", "rechazado", "reembolsado"],
        default: "pendiente"
    },

    // Información de envío
    shippingInfo: {
        carrier: {
            type: String,
            trim: true
        },
        trackingNumber: {
            type: String,
            trim: true
        },
        estimatedDelivery: {
            type: Date
        },
        shippingCost: {
            type: Number,
            default: 0
        }
    },

    // Notas adicionales
    notes: {
        type: String,
        trim: true
    },

    // Notas del admin (visibles solo para admin)
    adminNotes: {
        type: String,
        trim: true
    },

    // Fecha de actualización de estados
    statusHistory: [{
        status: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        },
        updatedBy: {
            type: String,
            trim: true
        },
        notes: {
            type: String,
            trim: true
        }
    }]

}, {
    timestamps: true
});

// Índices para mejorar el rendimiento de búsquedas
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 1 }, { unique: true });

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
