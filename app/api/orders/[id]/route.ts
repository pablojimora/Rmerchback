import { NextRequest, NextResponse } from "next/server";
import dbConnection from "@/app/lib/dbConnection";
import Order from "@/app/models/orders";

// GET - Obtener una orden específica
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnection();

        const { id } = await context.params;

        const order = await Order.findById(id)
            .populate("items.productId", "name images description");

        if (!order) {
            return NextResponse.json({
                success: false,
                message: "Orden no encontrada"
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: order
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: "Error al obtener la orden",
            error: error.message
        }, { status: 500 });
    }
}

// PATCH - Actualizar orden (principalmente para Admin)
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnection();

        const { id } = await context.params;

        const body = await request.json();
        const {
            status,
            paymentStatus,
            notes,
            adminNotes,
            shippingInfo,
            updatedBy
        } = body;

        // Validar estados permitidos
        const validStatuses = [
            "pendiente",
            "confirmada",
            "en_preparacion",
            "enviada",
            "entregada",
            "cancelada"
        ];
        const validPaymentStatuses = ["pendiente", "pagado", "rechazado", "reembolsado"];

        if (status && !validStatuses.includes(status)) {
            return NextResponse.json({
                success: false,
                message: `Estado inválido. Valores permitidos: ${validStatuses.join(", ")}`
            }, { status: 400 });
        }

        if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
            return NextResponse.json({
                success: false,
                message: `Estado de pago inválido. Valores permitidos: ${validPaymentStatuses.join(", ")}`
            }, { status: 400 });
        }

        // Obtener la orden actual
        const order = await Order.findById(id);

        if (!order) {
            return NextResponse.json({
                success: false,
                message: "Orden no encontrada"
            }, { status: 404 });
        }

        // Construir objeto de actualización
        const updateData: any = {};
        if (status) updateData.status = status;
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (notes !== undefined) updateData.notes = notes;
        if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

        // Actualizar información de envío
        if (shippingInfo) {
            updateData.shippingInfo = {
                ...order.shippingInfo,
                ...shippingInfo
            };
        }

        // Si cambió el estado, agregar al historial
        if (status && status !== order.status) {
            const statusEntry = {
                status,
                date: new Date(),
                updatedBy: updatedBy || "admin",
                notes: `Estado actualizado de ${order.status} a ${status}`
            };
            updateData.$push = { statusHistory: statusEntry };
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate("items.productId", "name images");

        return NextResponse.json({
            success: true,
            message: "Orden actualizada exitosamente",
            data: updatedOrder
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: "Error al actualizar la orden",
            error: error.message
        }, { status: 500 });
    }
}

// DELETE - Eliminar una orden completamente
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnection();

        const { id } = await context.params;
        
        console.log("Attempting to delete order with ID:", id);

        const order = await Order.findById(id);

        if (!order) {
            console.log("Order not found with ID:", id);
            return NextResponse.json({
                success: false,
                message: "Orden no encontrada"
            }, { status: 404 });
        }

        // Eliminar la orden permanentemente
        await Order.findByIdAndDelete(id);
        
        console.log("Order deleted successfully:", id);

        return NextResponse.json({
            success: true,
            message: "Orden eliminada exitosamente"
        }, { status: 200 });

    } catch (error: any) {
        console.error("Error deleting order:", error);
        return NextResponse.json({
            success: false,
            message: "Error al eliminar la orden",
            error: error.message
        }, { status: 500 });
    }
}
