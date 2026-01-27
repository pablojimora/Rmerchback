import { NextRequest, NextResponse } from "next/server";
import dbConnection from "@/app/lib/dbConnection";
import Order from "@/app/models/orders";
import Product from "@/app/models/products";
import mongoose from "mongoose";

// GET - Obtener órdenes
// Admin: obtiene todas las órdenes
// Usuario: obtiene solo sus órdenes (debe pasar userId en query params)
export async function GET(request: NextRequest) {
    try {
        await dbConnection();

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const status = searchParams.get("status");
        const userId = searchParams.get("userId"); // Para filtrar por usuario
        const skip = (page - 1) * limit;

        // Crear filtro
        const filter: any = {};
        if (status) {
            filter.status = status;
        }
        if (userId) {
            filter.userId = userId;
        }

        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("items.productId", "name images");

        const total = await Order.countDocuments(filter);

        return NextResponse.json({
            success: true,
            data: orders,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: "Error al obtener órdenes",
            error: error.message
        }, { status: 500 });
    }
}

// POST - Crear una nueva orden (Usuario realiza la compra)
export async function POST(request: NextRequest) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await dbConnection();

        const body = await request.json();
        const { userId, items, customer, paymentMethod, notes, shippingInfo } = body;

        // Validar items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({
                success: false,
                message: "Debe incluir al menos un producto en la orden"
            }, { status: 400 });
        }

        // Validar información del cliente
        if (!customer || !customer.name || !customer.email || !customer.phone) {
            return NextResponse.json({
                success: false,
                message: "Faltan datos del cliente: name, email, phone son requeridos"
            }, { status: 400 });
        }

        // Validar dirección de envío
        if (!customer.address || !customer.address.street || !customer.address.city || !customer.address.country) {
            return NextResponse.json({
                success: false,
                message: "La dirección de envío completa es requerida (street, city, country)"
            }, { status: 400 });
        }

        // Validar método de pago
        if (!paymentMethod) {
            return NextResponse.json({
                success: false,
                message: "Debe especificar un método de pago"
            }, { status: 400 });
        }

        // Procesar items y validar stock
        const processedItems = [];
        let total = 0;

        for (const item of items) {
            const { productId, quantity } = item;

            if (!productId || !quantity || quantity <= 0) {
                await session.abortTransaction();
                return NextResponse.json({
                    success: false,
                    message: "Cada producto debe tener productId y quantity válida"
                }, { status: 400 });
            }

            // Obtener producto
            const product = await Product.findById(productId).session(session);

            if (!product) {
                await session.abortTransaction();
                return NextResponse.json({
                    success: false,
                    message: `Producto no encontrado: ${productId}`
                }, { status: 404 });
            }

            // Validar stock disponible
            if (product.stock < quantity) {
                await session.abortTransaction();
                return NextResponse.json({
                    success: false,
                    message: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Solicitado: ${quantity}`
                }, { status: 400 });
            }

            // Calcular subtotal
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
                image: product.images && product.images.length > 0 ? product.images[0] : "",
                ownerId: product.ownerId || null,
                isOfficial: product.isOfficial || false
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
            userId: userId || customer.email, // Usa userId si existe, sino usa el email del cliente
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
        await session.commitTransaction();

        // Poblar datos del producto para la respuesta
        const populatedOrder = await Order.findById(newOrder._id)
            .populate("items.productId", "name images description");

        return NextResponse.json({
            success: true,
            message: "Orden creada exitosamente. El administrador será notificado.",
            data: populatedOrder
        }, { status: 201 });

    } catch (error: any) {
        await session.abortTransaction();
        return NextResponse.json({
            success: false,
            message: "Error al crear orden",
            error: error.message
        }, { status: 500 });
    } finally {
        session.endSession();
    }
}
