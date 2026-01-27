import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

interface JWTPayload {
  id: string;
  email: string;
  role: string;
}

// Generar token JWT
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// Verificar y decodificar token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Extraer token del header Authorization
export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  return authHeader.substring(7);
}

// Obtener usuario autenticado desde el request
export function getAuthUser(req: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(req);
  
  if (!token) {
    return null;
  }
  
  return verifyToken(token);
}
