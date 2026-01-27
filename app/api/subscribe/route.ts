import { NextRequest, NextResponse } from "next/server";
import dbConnection from "@/app/lib/dbConnection";
import Subscriber from "@/app/models/subscriber";
import { transporter, getWelcomeEmailTemplate } from "@/app/lib/email";

export async function POST(request: NextRequest) {
    try {
        await dbConnection();

        const { email } = await request.json();

        // Validar email
        if (!email) {
            return NextResponse.json({
                success: false,
                message: "El email es requerido"
            }, { status: 400 });
        }

        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({
                success: false,
                message: "Por favor ingresa un email válido"
            }, { status: 400 });
        }

        // Verificar si el email ya existe
        const existingSubscriber = await Subscriber.findOne({ email: email.toLowerCase() });
        
        if (existingSubscriber) {
            if (existingSubscriber.subscribed) {
                return NextResponse.json({
                    success: false,
                    message: "Este email ya está suscrito"
                }, { status: 400 });
            } else {
                // Reactivar suscripción
                existingSubscriber.subscribed = true;
                existingSubscriber.subscribedAt = new Date();
                await existingSubscriber.save();

                // Enviar email de bienvenida
                try {
                    const emailTemplate = getWelcomeEmailTemplate(email);
                    await transporter.sendMail(emailTemplate);
                } catch (emailError) {
                    console.error("Error sending welcome email:", emailError);
                    // No fallar la suscripción si el email falla
                }

                return NextResponse.json({
                    success: true,
                    message: "¡Bienvenido de nuevo! Tu suscripción ha sido reactivada"
                }, { status: 200 });
            }
        }

        // Crear nuevo suscriptor
        const subscriber = new Subscriber({
            email: email.toLowerCase()
        });

        await subscriber.save();

        // Enviar email de bienvenida
        try {
            const emailTemplate = getWelcomeEmailTemplate(email);
            await transporter.sendMail(emailTemplate);
            console.log(`Welcome email sent to ${email}`);
        } catch (emailError) {
            console.error("Error sending welcome email:", emailError);
            // No fallar la suscripción si el email falla
        }

        return NextResponse.json({
            success: true,
            message: "¡Suscripción exitosa! Revisa tu correo para ver el mensaje de bienvenida"
        }, { status: 201 });

    } catch (error: any) {
        console.error("Subscribe error:", error);
        return NextResponse.json({
            success: false,
            message: "Error al procesar la suscripción",
            error: error.message
        }, { status: 500 });
    }
}
