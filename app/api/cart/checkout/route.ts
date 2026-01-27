import { NextRequest, NextResponse } from "next/server";
import dbConnection from "@/app/lib/dbConnection";
import Cart from "@/app/models/cart";
import Order from "@/app/models/orders";
import Product from "@/app/models/products";
import mongoose from "mongoose";

// POST - Crear orden desde el carrito (Checkout)
export async function POST(request: NextRequest) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await dbConnection();

        const body = await request.json();
        const { userId, customer, paymentMethod, notes, shippingInfo } = body;

        // Validaciones
        if (!userId) {
            return NextResponse.json({
                success: false,
                message: "userId es requerido"
            }, { status: 400 });
        }

        if (!customer || !customer.name || !customer.email || !customer.phone) {
            return NextResponse.json({
                success: false,
                message: "Faltan datos del cliente: name, email, phone son requeridos"
            }, { status: 400 });
        }

        if (!customer.address || !customer.address.street || !customer.address.city || !customer.address.country) {
            return NextResponse.json({
                success: false,
                message: "La dirección de envío completa es requerida (street, city, country)"
            }, { status: 400 });
        }

        if (!paymentMethod) {
            return NextResponse.json({
                success: false,
                message: "Debe especificar un método de pago"
            }, { status: 400 });
        }

        // Obtener carrito
        const cart = await Cart.findOne({ userId }).session(session);
        
        if (!cart || cart.items.length === 0) {
            await session.abortTransaction();
            return NextResponse.json({
                success: false,
                message: "El carrito está vacío"
            }, { status: 400 });
        }

        // Validar y procesar items del carrito
        const processedItems = [];
        let total = 0;

        for (const item of cart.items) {
            const { productId, quantity } = item;

            // Obtener producto actualizado
            const product = await Product.findById(productId).session(session);

            if (!product) {
                await session.abortTransaction();
                return NextResponse.json({
                    success: false,
                    message: `Producto no encontrado: ${item.name}`
                }, { status: 404 });
            }

            // Validar stock disponible
            if (product.stock < quantity) {
                await session.abortTransaction();
                return NextResponse.json({
                    success: false,
                    message: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, En carrito: ${quantity}`
                }, { status: 400 });
            }

            // Calcular subtotal con precio actualizado
            const subtotal = product.price * quantity;
            total += subtotal;

            // Reducir stock del producto
            product.stock -= quantity;
            await product.save({ session });

            // Agregar item procesado
            processedItems.push({
                productId: product._id,
                name: product.name,
                price: product.price,
                quantity,
                subtotal,
                image: product.images && product.images.length > 0 ? product.images[0] : ""
            });
        }

        // Agregar costo de envío si existe
        if (shippingInfo && shippingInfo.shippingCost) {
            total += shippingInfo.shippingCost;
        }

        // Generar número de orden
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const count = await Order.countDocuments();
        const orderNumber = `ORD-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;

        // Crear la orden
        const newOrder = new Order({
            orderNumber,
            userId,
            items: processedItems,
            customer,
            total,
            paymentMethod,
            notes,
            shippingInfo: shippingInfo || {},
            status: "pendiente",
            paymentStatus: "pendiente"
        });

        await newOrder.save({ session });

        // Vaciar el carrito
        cart.items = [];
        cart.total = 0;
        await cart.save({ session });

        await session.commitTransaction();

        // Poblar datos del producto para la respuesta
        const populatedOrder = await Order.findById(newOrder._id)
            .populate("items.productId", "name images description");

        return NextResponse.json({
            success: true,
            message: "Orden creada exitosamente desde el carrito",
            data: populatedOrder
        }, { status: 201 });

    } catch (error: any) {
        await session.abortTransaction();
        return NextResponse.json({
            success: false,
            message: "Error al crear orden desde el carrito",
            error: error.message
        }, { status: 500 });
    } finally {
        session.endSession();
    }
}
