import { NextRequest, NextResponse } from "next/server";
import dbConnection from "@/app/lib/dbConnection";
import Product from "@/app/models/products";
import mongoose from "mongoose";

// GET - Obtener un producto por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnection();

    const { id } = await params;

    // Validar que el ID sea válido de MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        message: "ID de producto no válido"
      }, { status: 400 });
    }

    const product = await Product.findById(id);

    if (!product) {
      return NextResponse.json({
        success: false,
        message: "Producto no encontrado"
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product: product
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: "Error al obtener producto",
      error: error.message
    }, { status: 500 });
  }
}

// PUT - Actualizar un producto por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnection();

    const { id } = await params;

    // Validar que el ID sea válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        message: "ID de producto no válido"
      }, { status: 400 });
    }

    const body = await request.json();

    // Validar que solo se envíen campos permitidos
    const allowedFields = ["name", "description", "price", "stock", "images"];
    const receivedFields = Object.keys(body);
    const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Campos no permitidos para actualización: ${invalidFields.join(", ")}. Solo se pueden actualizar: name, description, price, stock, images`
      }, { status: 400 });
    }

    // Validar que se envió al menos un campo
    if (receivedFields.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Debe proporcionar al menos un campo para actualizar"
      }, { status: 400 });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return NextResponse.json({
        success: false,
        message: "Producto no encontrado"
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Producto actualizado exitosamente",
      data: updatedProduct
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: "Error al actualizar producto",
      error: error.message
    }, { status: 500 });
  }
}

// DELETE - Eliminar un producto por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnection();

    const { id } = await params;

    // Validar que el ID sea válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        message: "ID de producto no válido"
      }, { status: 400 });
    }

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return NextResponse.json({
        success: false,
        message: "Producto no encontrado"
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Producto eliminado exitosamente",
      data: deletedProduct
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: "Error al eliminar producto",
      error: error.message
    }, { status: 500 });
  }
}
