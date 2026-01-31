import { NextRequest, NextResponse } from "next/server";
import dbConnection from "@/app/lib/dbConnection";
import Product from "@/app/models/products";

// GET - Obtener todos los productos de un usuario específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await dbConnection();

    const { userId } = await params;

    // Buscar todos los productos donde ownerId coincida con el userId
    const products = await Product.find({ ownerId: userId });

    return NextResponse.json({
      success: true,
      count: products.length,
      products: products
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: "Error al obtener productos del usuario",
      error: error.message
    }, { status: 500 });
  }
}
