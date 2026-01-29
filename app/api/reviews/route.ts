import { NextRequest, NextResponse } from "next/server";
import dbConnection from "@/app/lib/dbConnection";
import Review from "@/app/models/review";
import Product from "@/app/models/products";
import Order from "@/app/models/orders";

// GET - Obtener reseñas
export async function GET(request: NextRequest) {
  try {
    await dbConnection();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (productId) filter.productId = productId;
    if (userId) filter.userId = userId;

    const reviews = await Review.find(filter)
      .populate("userId", "name email")
      .populate("productId", "name images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: "Error al obtener reseñas",
      error: error.message
    }, { status: 500 });
  }
}

// POST - Crear reseña
export async function POST(request: NextRequest) {
  try {
    await dbConnection();

    const body = await request.json();
    const { rating, comment, userId, productId, orderId } = body;

    // Validaciones básicas
    if (!rating || !comment || !userId || !productId || !orderId) {
      return NextResponse.json({
        success: false,
        message: "Todos los campos son obligatorios"
      }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({
        success: false,
        message: "La calificación debe estar entre 1 y 5"
      }, { status: 400 });
    }

    // Verificar que la orden existe y pertenece al usuario
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({
        success: false,
        message: "Orden no encontrada"
      }, { status: 404 });
    }

    if (order.userId !== userId) {
      return NextResponse.json({
        success: false,
        message: "No puedes reseñar productos de otra orden"
      }, { status: 403 });
    }

    // Verificar que el producto está en la orden
    const productInOrder = order.items.find(
      (item: any) => item.productId.toString() === productId
    );

    if (!productInOrder) {
      return NextResponse.json({
        success: false,
        message: "No has comprado este producto"
      }, { status: 403 });
    }

    // Verificar si ya existe una reseña
    const existingReview = await Review.findOne({ userId, productId });
    if (existingReview) {
      return NextResponse.json({
        success: false,
        message: "Ya has reseñado este producto"
      }, { status: 400 });
    }

    // Obtener producto para el ownerId
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({
        success: false,
        message: "Producto no encontrado"
      }, { status: 404 });
    }

    // Crear reseña
    const review = await Review.create({
      rating,
      comment,
      userId,
      productId,
      orderId,
      ownerId: product.ownerId || null,
      isVerifiedPurchase: true
    });

    // Actualizar el promedio de calificación del producto
    const allReviews = await Review.find({ productId });
    const totalReviews = allReviews.length;
    const averageRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews
    });

    return NextResponse.json({
      success: true,
      message: "Reseña creada exitosamente",
      data: review
    }, { status: 201 });

  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({
        success: false,
        message: "Ya has reseñado este producto"
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      message: "Error al crear reseña",
      error: error.message
    }, { status: 500 });
  }
}
