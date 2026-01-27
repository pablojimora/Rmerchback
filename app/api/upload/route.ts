import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST - Subir imagen a Cloudinary
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        message: "No se proporcionó ningún archivo"
      }, { status: 400 });
    }

    // Validar tipo de archivo
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        message: "Tipo de archivo no válido. Solo se permiten: JPG, JPEG, PNG, WEBP"
      }, { status: 400 });
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        message: "El archivo es demasiado grande. Tamaño máximo: 5MB"
      }, { status: 400 });
    }

    // Convertir el archivo a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Subir a Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "rmerch/products",
          resource_type: "image",
          transformation: [
            { width: 1000, height: 1000, crop: "limit" },
            { quality: "auto" },
            { fetch_format: "auto" }
          ]
        },
        (error:any, result:any) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return NextResponse.json({
      success: true,
      message: "Imagen subida exitosamente",
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format
      }
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: "Error al subir imagen",
      error: error.message
    }, { status: 500 });
  }
}

// DELETE - Eliminar imagen de Cloudinary
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get("publicId");

    if (!publicId) {
      return NextResponse.json({
        success: false,
        message: "Se requiere el public_id de la imagen"
      }, { status: 400 });
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== "ok") {
      return NextResponse.json({
        success: false,
        message: "No se pudo eliminar la imagen"
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Imagen eliminada exitosamente"
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: "Error al eliminar imagen",
      error: error.message
    }, { status: 500 });
  }
}
