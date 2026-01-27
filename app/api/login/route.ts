import { NextRequest, NextResponse } from "next/server";
import dbConnection from "@/app/lib/dbConnection";
import User from "@/app/models/user";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/auth";

// OPTIONS - Manejar preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// POST - Iniciar sesión
export async function POST(request: NextRequest) {
  try {
    await dbConnection();

    const body = await request.json();
    const { email, password } = body;

    // Validar campos requeridos
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Buscar usuario por email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return NextResponse.json(
        { error: "Tu cuenta ha sido desactivada. Contacta al administrador" },
        { status: 403 }
      );
    }

    // Comparar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    // Generar token JWT
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role
    });

    // Retornar token y datos básicos del usuario
    return NextResponse.json(
      { 
        message: "Login exitoso",
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role
        }
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Error during login:", error);
    return NextResponse.json(
      { error: "Error al iniciar sesión" },
      { status: 500 }
    );
  }
}
