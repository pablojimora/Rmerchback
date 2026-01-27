import { NextRequest, NextResponse } from "next/server";
import dbConnection from "@/app/lib/dbConnection";
import User from "@/app/models/user";
import { getAuthUser } from "@/lib/auth";

// GET - Obtener todos los usuarios (solo admin)
export async function GET(request: NextRequest) {
  try {
    await dbConnection();

    // Verificar autenticación
    const authUser = getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json(
        { error: "No autorizado. Token requerido" },
        { status: 401 }
      );
    }

    // Verificar que sea admin
    if (authUser.role !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado. Solo administradores" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const skip = (page - 1) * limit;

    // Crear filtro de búsqueda
    const filter: any = {};
    
    // Filtrar por rol
    if (role && ["user", "admin", "seller"].includes(role)) {
      filter.role = role;
    }
    
    // Añadir búsqueda por texto
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    // Obtener usuarios con paginación
    const users = await User.find(filter)
      .select("-password") // Excluir contraseñas
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Contar total de usuarios
    const total = await User.countDocuments(filter);

    // Formatear respuesta
    const formattedUsers = users.map((user: any) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Error al obtener los usuarios" },
      { status: 500 }
    );
  }
}
