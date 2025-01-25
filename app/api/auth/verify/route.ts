// app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('token');
        
        if (!token?.value) {
            return NextResponse.json({ valid: false }, { status: 401 });
        }

        const decoded = jwt.verify(token.value, process.env.JWT_SECRET!);
        return NextResponse.json({ valid: true, user: decoded });
    } catch (error) {
        return NextResponse.json({ valid: false }, { status: 401 });
    }
}