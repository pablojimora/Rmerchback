import { NextRequest, NextResponse } from "next/server";
import dbConnection from "@/app/lib/dbConnection";
import Cart from "@/app/models/cart";
import Product from "@/app/models/products";

// GET - Obtener el carrito del usuario con el total calculado
export async function GET(request: NextRequest) {
    try {
        await dbConnection();

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({
                success: false,
                message: "userId es requerido"
            }, { status: 400 });
        }

        // Buscar o crear carrito
        let cart = await Cart.findOne({ userId }).populate("items.productId", "name images price stock");

        if (!cart) {
            // Si no existe, crear carrito vacío
            cart = new Cart({
                userId,
                items: [],
                total: 0
            });
            await cart.save();
        }

        // Calcular el total actualizado
        let total = 0;
        cart.items.forEach((item: any) => {
            total += item.subtotal;
        });

        // Actualizar total si cambió
        if (cart.total !== total) {
            cart.total = total;
            await cart.save();
        }

        return NextResponse.json({
            success: true,
            data: {
                userId: cart.userId,
                items: cart.items,
                total: cart.total,
                itemCount: cart.items.length
            }
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: "Error al obtener el carrito",
            error: error.message
        }, { status: 500 });
    }
}

// POST - Añadir producto al carrito
export async function POST(request: NextRequest) {
    try {
        await dbConnection();

        const body = await request.json();
        const { userId, productId, quantity = 1 } = body;

        // Validaciones
        if (!userId) {
            return NextResponse.json({
                success: false,
                message: "userId es requerido"
            }, { status: 400 });
        }

        if (!productId) {
            return NextResponse.json({
                success: false,
                message: "productId es requerido"
            }, { status: 400 });
        }

        if (quantity <= 0) {
            return NextResponse.json({
                success: false,
                message: "La cantidad debe ser mayor a 0"
            }, { status: 400 });
        }

        // Verificar que el producto existe
        const product = await Product.findById(productId);
        if (!product) {
            return NextResponse.json({
                success: false,
                message: "Producto no encontrado"
            }, { status: 404 });
        }

        // Verificar stock disponible
        if (product.stock < quantity) {
            return NextResponse.json({
                success: false,
                message: `Stock insuficiente. Disponible: ${product.stock}`
            }, { status: 400 });
        }

        // Buscar o crear carrito
        let cart = await Cart.findOne({ userId });
        
        if (!cart) {
            cart = new Cart({
                userId,
                items: [],
                total: 0
            });
        }

        // Verificar si el producto ya está en el carrito
        const existingItemIndex = cart.items.findIndex(
            (item: any) => item.productId.toString() === productId
        );

        if (existingItemIndex > -1) {
            // Si existe, actualizar cantidad
            const newQuantity = cart.items[existingItemIndex].quantity + quantity;
            
            // Verificar stock para la nueva cantidad
            if (product.stock < newQuantity) {
                return NextResponse.json({
                    success: false,
                    message: `Stock insuficiente. Tienes ${cart.items[existingItemIndex].quantity} en el carrito. Disponible: ${product.stock}`
                }, { status: 400 });
            }

            cart.items[existingItemIndex].quantity = newQuantity;
            cart.items[existingItemIndex].subtotal = product.price * newQuantity;
        } else {
            // Si no existe, agregar nuevo item
            const newItem = {
                productId: product._id,
                name: product.name,
                price: product.price,
                quantity,
                subtotal: product.price * quantity,
                image: product.images && product.images.length > 0 ? product.images[0] : ""
            };
            cart.items.push(newItem);
        }

        // Recalcular total
        cart.total = cart.items.reduce((sum: number, item: any) => sum + item.subtotal, 0);

        await cart.save();

        // Poblar datos del producto
        await cart.populate("items.productId", "name images price stock");

        return NextResponse.json({
            success: true,
            message: "Producto añadido al carrito",
            data: {
                userId: cart.userId,
                items: cart.items,
                total: cart.total,
                itemCount: cart.items.length
            }
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: "Error al añadir producto al carrito",
            error: error.message
        }, { status: 500 });
    }
}

// PUT - Actualizar cantidad de un producto en el carrito
export async function PUT(request: NextRequest) {
    try {
        await dbConnection();

        const body = await request.json();
        const { userId, productId, quantity } = body;

        // Validaciones
        if (!userId || !productId) {
            return NextResponse.json({
                success: false,
                message: "userId y productId son requeridos"
            }, { status: 400 });
        }

        if (quantity < 0) {
            return NextResponse.json({
                success: false,
                message: "La cantidad no puede ser negativa"
            }, { status: 400 });
        }

        // Buscar carrito
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return NextResponse.json({
                success: false,
                message: "Carrito no encontrado"
            }, { status: 404 });
        }

        // Buscar el item en el carrito
        const itemIndex = cart.items.findIndex(
            (item: any) => item.productId.toString() === productId
        );

        if (itemIndex === -1) {
            return NextResponse.json({
                success: false,
                message: "Producto no encontrado en el carrito"
            }, { status: 404 });
        }

        // Si quantity es 0, eliminar el item
        if (quantity === 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            // Verificar stock disponible
            const product = await Product.findById(productId);
            if (!product) {
                return NextResponse.json({
                    success: false,
                    message: "Producto no encontrado"
                }, { status: 404 });
            }

            if (product.stock < quantity) {
                return NextResponse.json({
                    success: false,
                    message: `Stock insuficiente. Disponible: ${product.stock}`
                }, { status: 400 });
            }

            // Actualizar cantidad y subtotal
            cart.items[itemIndex].quantity = quantity;
            cart.items[itemIndex].price = product.price; // Actualizar precio por si cambió
            cart.items[itemIndex].subtotal = product.price * quantity;
        }

        // Recalcular total
        cart.total = cart.items.reduce((sum: number, item: any) => sum + item.subtotal, 0);

        await cart.save();

        // Poblar datos del producto
        await cart.populate("items.productId", "name images price stock");

        return NextResponse.json({
            success: true,
            message: "Carrito actualizado",
            data: {
                userId: cart.userId,
                items: cart.items,
                total: cart.total,
                itemCount: cart.items.length
            }
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: "Error al actualizar el carrito",
            error: error.message
        }, { status: 500 });
    }
}

// DELETE - Eliminar producto del carrito o vaciar carrito completo
export async function DELETE(request: NextRequest) {
    try {
        await dbConnection();

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const productId = searchParams.get("productId");

        if (!userId) {
            return NextResponse.json({
                success: false,
                message: "userId es requerido"
            }, { status: 400 });
        }

        // Buscar carrito
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return NextResponse.json({
                success: false,
                message: "Carrito no encontrado"
            }, { status: 404 });
        }

        // Si no se especifica productId, vaciar todo el carrito
        if (!productId) {
            cart.items = [];
            cart.total = 0;
            await cart.save();

            return NextResponse.json({
                success: true,
                message: "Carrito vaciado",
                data: {
                    userId: cart.userId,
                    items: cart.items,
                    total: cart.total,
                    itemCount: 0
                }
            }, { status: 200 });
        }

        // Eliminar producto específico
        const itemIndex = cart.items.findIndex(
            (item: any) => item.productId.toString() === productId
        );

        if (itemIndex === -1) {
            return NextResponse.json({
                success: false,
                message: "Producto no encontrado en el carrito"
            }, { status: 404 });
        }

        cart.items.splice(itemIndex, 1);

        // Recalcular total
        cart.total = cart.items.reduce((sum: number, item: any) => sum + item.subtotal, 0);

        await cart.save();

        // Poblar datos del producto
        await cart.populate("items.productId", "name images price stock");

        return NextResponse.json({
            success: true,
            message: "Producto eliminado del carrito",
            data: {
                userId: cart.userId,
                items: cart.items,
                total: cart.total,
                itemCount: cart.items.length
            }
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: "Error al eliminar del carrito",
            error: error.message
        }, { status: 500 });
    }
}
