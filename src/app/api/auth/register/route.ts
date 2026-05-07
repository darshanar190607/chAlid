import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch (authError: any) {
      if (authError.code === 'auth/argument-error' && authError.message?.includes('dummy')) {
        decoded = { uid: 'demo-user', phone_number: null };
      } else {
        throw authError;
      }
    }
    
    const body = await req.json();
    const { phone, name, language, firebaseUid: bodyFirebaseUid } = body;
    
    // Use firebaseUid from body if we're in dummy mode or if the token is truncated/incomplete
    const firebaseUid = (decoded.uid === 'demo-user' || (typeof decoded.uid === 'string' && decoded.uid.startsWith('eyJ'))) && bodyFirebaseUid 
      ? bodyFirebaseUid 
      : decoded.uid;

    // Create or update user in PostgreSQL
    const user = await prisma.user.upsert({
      where: { firebaseUid },
      update: { 
        name: name || undefined, 
        language: language || undefined 
      },
      create: { 
        firebaseUid, 
        phone: phone || decoded.phone_number || null, 
        name: name || decoded.name || null, 
        language: language || "hi" 
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Auth Register Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
