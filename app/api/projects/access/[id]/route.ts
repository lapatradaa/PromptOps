// app/api/projects/access/[id]/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const client = await clientPromise;
        const db = client.db("promptops");

        // Update the project's lastAccessedAt
        await db.collection("projects").updateOne(
            { _id: new ObjectId(id), userId: session.user.id },
            { $set: { lastAccessedAt: new Date() } }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating project access:", error);
        return NextResponse.json({ error: "Failed to update access time" }, { status: 500 });
    }
}