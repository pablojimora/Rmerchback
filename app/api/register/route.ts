import { NextRequest, NextResponse } from "next/server";
import dbConnection from "@/app/lib/dbConnection";
import User from "@/app/models/user";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/auth";

// POST - Registrar nuevo usuario
export async function POST(request: NextRequest) {
  try {
    await dbConnection();

    const body = await request.json();
    const { name, email, password, role } = body;

    // Validar campos requeridos
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 409 }
      );
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el usuario
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "user",
      isActive: true
    });

    // Generar token JWT
    const token = generateToken({
      id: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role
    });

    // Retornar token y usuario sin contraseña
    return NextResponse.json(
      { 
        message: "Usuario registrado exitosamente",
        token,
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("Error registering user:", error);
    return NextResponse.json(
      { error: "Error al registrar el usuario" },
      { status: 500 }
    );
  }
}
