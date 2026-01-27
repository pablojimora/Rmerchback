import { NextRequest, NextResponse } from "next/server";
import dbConnection from "@/app/lib/dbConnection";
import Cart from "@/app/models/cart";

// POST - Calcular el total del carrito con opciones de envío
export async function POST(request: NextRequest) {
    try {
        await dbConnection();

        const body = await request.json();
        const { userId, shippingCost = 0, discount = 0, couponCode } = body;

        if (!userId) {
            return NextResponse.json({
                success: false,
                message: "userId es requerido"
            }, { status: 400 });
        }

        // Buscar carrito
        const cart = await Cart.findOne({ userId }).populate("items.productId", "name images price stock");
        
        if (!cart || cart.items.length === 0) {
            return NextResponse.json({
                success: false,
                message: "El carrito está vacío"
            }, { status: 404 });
        }

        // Calcular subtotal (suma de items)
        const subtotal = cart.items.reduce((sum: number, item: any) => sum + item.subtotal, 0);

        // Aplicar descuento (puedes agregar lógica para validar cupones aquí)
        let finalDiscount = discount;
        
        // Ejemplo: lógica de cupón (puedes expandir esto)
        if (couponCode) {
            // Aquí podrías validar el cupón contra una base de datos de cupones
            // Por ahora es solo un ejemplo
            if (couponCode === "DESCUENTO10") {
                finalDiscount = subtotal * 0.1; // 10% de descuento
            } else if (couponCode === "ENVIOGRATIS") {
                finalDiscount = 0;
                // shippingCost = 0; // Podrías anular el costo de envío
            }
        }

        // Calcular total final
        const total = subtotal + shippingCost - finalDiscount;

        return NextResponse.json({
            success: true,
            data: {
                userId: cart.userId,
                items: cart.items,
                itemCount: cart.items.length,
                subtotal: subtotal,
                shippingCost: shippingCost,
                discount: finalDiscount,
                total: total > 0 ? total : 0,
                couponCode: couponCode || null,
                breakdown: {
                    itemsTotal: subtotal,
                    shipping: shippingCost,
                    discount: finalDiscount,
                    finalTotal: total > 0 ? total : 0
                }
            }
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: "Error al calcular el total",
            error: error.message
        }, { status: 500 });
    }
}
