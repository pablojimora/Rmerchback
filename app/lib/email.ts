import nodemailer from 'nodemailer';

// Crear transporter reutilizable
export const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Verificar configuración del transporter
export async function verifyEmailConfig() {
    try {
        await transporter.verify();
        console.log('Email configuration is correct');
        return true;
    } catch (error) {
        console.error('Email configuration error:', error);
        return false;
    }
}

// Plantilla de email de bienvenida
export function getWelcomeEmailTemplate(email: string) {
    return {
        from: `"R-Merch by RIWI" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '¡Bienvenido a la comunidad R-Merch! 🎉',
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenido a R-Merch</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header con logo -->
        <div style="background: linear-gradient(135deg, #615CF2 0%, #4e49d9 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">R-Merch</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">by RIWI</p>
        </div>

        <!-- Contenido -->
        <div style="padding: 40px 20px;">
            <h2 style="color: #161C40; margin: 0 0 20px 0; font-size: 24px;">¡Bienvenido a la comunidad R-Merch! 🎉</h2>
            
            <p style="color: #666666; line-height: 1.6; font-size: 16px; margin: 0 0 20px 0;">
                Gracias por suscribirte a nuestro newsletter. Estamos emocionados de tenerte como parte de nuestra comunidad.
            </p>

            <p style="color: #666666; line-height: 1.6; font-size: 16px; margin: 0 0 20px 0;">
                Como suscriptor, serás el primero en enterarte de:
            </p>

            <ul style="color: #666666; line-height: 1.8; font-size: 16px; margin: 0 0 30px 0; padding-left: 20px;">
                <li>🎁 Lanzamientos exclusivos de productos</li>
                <li>💰 Ofertas y descuentos especiales</li>
                <li>🎨 Nuevos diseños y colecciones</li>
                <li>📰 Noticias de la comunidad RIWI</li>
            </ul>

            <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/shop" 
                   style="display: inline-block; background-color: #615CF2; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Explorar Productos
                </a>
            </div>

            <p style="color: #666666; line-height: 1.6; font-size: 16px; margin: 30px 0 0 0;">
                ¡Gracias por unirte! 💜
            </p>
            <p style="color: #666666; line-height: 1.6; font-size: 16px; margin: 10px 0 0 0;">
                <strong>El equipo de R-Merch</strong>
            </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #161C40; padding: 30px 20px; text-align: center;">
            <p style="color: #ffffff; font-size: 14px; margin: 0 0 10px 0; opacity: 0.8;">
                © ${new Date().getFullYear()} R-Merch by RIWI. Todos los derechos reservados.
            </p>
            <p style="color: #ffffff; font-size: 12px; margin: 10px 0 0 0; opacity: 0.6;">
                Si no deseas recibir más correos, puedes darte de baja en cualquier momento.
            </p>
        </div>
    </div>
</body>
</html>
        `,
        text: `
¡Bienvenido a la comunidad R-Merch! 🎉

Gracias por suscribirte a nuestro newsletter. Estamos emocionados de tenerte como parte de nuestra comunidad.

Como suscriptor, serás el primero en enterarte de:
- 🎁 Lanzamientos exclusivos de productos
- 💰 Ofertas y descuentos especiales
- 🎨 Nuevos diseños y colecciones
- 📰 Noticias de la comunidad RIWI

Explora nuestros productos: ${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/shop

¡Gracias por unirte! 💜
El equipo de R-Merch

© ${new Date().getFullYear()} R-Merch by RIWI. Todos los derechos reservados.
        `
    };
}
