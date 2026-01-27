import { NextRequest, NextResponse } from "next/server";
import dbConnection from "@/app/lib/dbConnection";
import User from "@/app/models/user";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { getAuthUser } from "@/lib/auth";

// PATCH - Actualizar usuario (rol, estado, datos)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnection();

    // Verificar autenticación
    const authUser = getAuthUser(req);
    
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

    const { id } = await params;
    
    // Validar que el ID sea un ObjectId válido
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "ID de usuario inválido" },
        { status: 400 }
      );
    }
    
    const body = await req.json();
    const { name, email, password, role, isActive } = body;

    // Buscar usuario
    const user = await User.findById(id);
    
    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Preparar actualización
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (role !== undefined && ["user", "admin", "seller"].includes(role)) {
      updateData.role = role;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Si se proporciona contraseña, hashearla
    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Si se cambia el email, verificar que no exista
    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return NextResponse.json(
          { error: "El email ya está en uso" },
          { status: 409 }
        );
      }
    }

    // Actualizar usuario
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Error al actualizar el usuario" },
        { status: 500 }
      );
    }

    // Formatear respuesta
    const userResponse = {
      id: updatedUser._id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    };

    return NextResponse.json({
      message: "Usuario actualizado exitosamente",
      user: userResponse
    });

  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Error al actualizar el usuario" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar usuario
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnection();

    // Verificar autenticación
    const authUser = getAuthUser(req);
    
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

    const { id } = await params;
    
    // Validar que el ID sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "ID de usuario inválido" },
        { status: 400 }
      );
    }

    // Buscar y eliminar usuario
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Usuario eliminado exitosamente",
      user: {
        id: deletedUser._id.toString(),
        email: deletedUser.email
      }
    });

  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Error al eliminar el usuario" },
      { status: 500 }
    );
  }
}
