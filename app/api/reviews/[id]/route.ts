import { NextRequest, NextResponse } from "next/server";
import dbConnection from "@/app/lib/dbConnection";
import Review from "@/app/models/review";
import Product from "@/app/models/products";

// GET - Obtener una reseña específica
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnection();

    const { id } = await context.params;

    const review = await Review.findById(id)
      .populate("userId", "name email")
      .populate("productId", "name images");

    if (!review) {
      return NextResponse.json({
        success: false,
        message: "Reseña no encontrada"
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: review
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: "Error al obtener reseña",
      error: error.message
    }, { status: 500 });
  }
}

// PUT - Actualizar reseña
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnection();

    const { id } = await context.params;
    const body = await request.json();
    const { rating, comment, userId } = body;

    const review = await Review.findById(id);

    if (!review) {
      return NextResponse.json({
        success: false,
        message: "Reseña no encontrada"
      }, { status: 404 });
    }

    // Verificar que el usuario es el dueño de la reseña
    if (review.userId.toString() !== userId) {
      return NextResponse.json({
        success: false,
        message: "No puedes editar esta reseña"
      }, { status: 403 });
    }

    // Validar rating
    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json({
        success: false,
        message: "La calificación debe estar entre 1 y 5"
      }, { status: 400 });
    }

    // Actualizar reseña
    if (rating !== undefined) review.rating = rating;
    if (comment) review.comment = comment;

    await review.save();

    // Recalcular promedio del producto
    const allReviews = await Review.find({ productId: review.productId });
    const totalReviews = allReviews.length;
    const averageRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    await Product.findByIdAndUpdate(review.productId, {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews
    });

    return NextResponse.json({
      success: true,
      message: "Reseña actualizada exitosamente",
      data: review
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: "Error al actualizar reseña",
      error: error.message
    }, { status: 500 });
  }
}

// DELETE - Eliminar reseña
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnection();

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const review = await Review.findById(id);

    if (!review) {
      return NextResponse.json({
        success: false,
        message: "Reseña no encontrada"
      }, { status: 404 });
    }

    // Verificar que el usuario es el dueño de la reseña
    if (review.userId.toString() !== userId) {
      return NextResponse.json({
        success: false,
        message: "No puedes eliminar esta reseña"
      }, { status: 403 });
    }

    const productId = review.productId;
    await Review.findByIdAndDelete(id);

    // Recalcular promedio del producto
    const allReviews = await Review.find({ productId });
    const totalReviews = allReviews.length;
    const averageRating = totalReviews > 0 
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
      : 0;

    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews
    });

    return NextResponse.json({
      success: true,
      message: "Reseña eliminada exitosamente"
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: "Error al eliminar reseña",
      error: error.message
    }, { status: 500 });
  }
}
