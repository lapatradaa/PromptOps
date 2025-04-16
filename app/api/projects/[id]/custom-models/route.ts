// app/api/projects/[projectId]/custom-models/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const client = await clientPromise;
    const db = client.db("promptops");
    
    // Find all custom models used by this user
    const customModels = await db.collection("result")
      .find({
        userId: session.user.id,
        modelProvider: 'custom'
      })
      .project({ modelName: 1 })
      .toArray();
    
    // Extract unique model names
    const uniqueModelNames = Array.from(
      new Set(
        customModels
          .map(model => model.modelName)
          .filter(name => name) // Filter out any undefined/null names
      )
    );
    
    return NextResponse.json({
      customModels: uniqueModelNames
    });
  } catch (error) {
    console.error('Error fetching custom models:', error);
    return NextResponse.json({ error: 'Failed to fetch custom models' }, { status: 500 });
  }
}