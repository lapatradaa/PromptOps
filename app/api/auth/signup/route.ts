import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const { email, username, password } = await request.json();

        // Input validation
        if (!email || !email.includes('@')) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        if (!password || password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        // Username validation
        if (!username || username.trim().length < 3) {
            return NextResponse.json(
                { error: 'Username must be at least 3 characters long' },
                { status: 400 }
            );
        }

        const sanitizedEmail = email.trim().toLowerCase();
        const sanitizedUsername = username.trim().toLowerCase();
        const sanitizedPassword = password.trim();

        const client = await clientPromise;
        const db = client.db("promptops");

        // Check if email or username already exists
        const existingUser = await db.collection("users").findOne({
            $or: [
                { email: sanitizedEmail },
                { username: sanitizedUsername }
            ]
        });

        if (existingUser) {
            // Provide specific error message based on what's already taken
            if (existingUser.email === sanitizedEmail) {
                return NextResponse.json(
                    { error: 'Email already registered' },
                    { status: 400 }
                );
            }
            if (existingUser.username === sanitizedUsername) {
                return NextResponse.json(
                    { error: 'Username already taken' },
                    { status: 400 }
                );
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(sanitizedPassword, 10);

        // Create new user
        const result = await db.collection("users").insertOne({
            email: sanitizedEmail,
            username: sanitizedUsername,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
            role: 'user',
        });

        return NextResponse.json({
            id: result.insertedId,
            email: sanitizedEmail,
            username: sanitizedUsername,
        });
    } catch (error) {
        console.error("Error in user registration:", error);
        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        );
    }
}