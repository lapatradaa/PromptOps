// app/api/projects/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    // Fetch the session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("promptops");

    // Fetch projects that belong to the logged-in user
    const projects = await db.collection("projects")
      .find({ userId: session.user.id }) // Filter by userId
      .sort({ createdAt: -1 })
      .toArray();

    console.log("Session user ID:", session.user.id);

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.error("No user ID found in session.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectName, type, llm, apiKey, systemContent } = await request.json();
    const client = await clientPromise;
    const db = client.db("promptops");

    const newProject = {
      name: projectName,
      userId: session.user.id,
      type,
      llm,
      apiKey: apiKey || null,
      systemContent,
      createdAt: new Date(),
    };

    const result = await db.collection("projects").insertOne(newProject);

    return NextResponse.json({ ...newProject, _id: result.insertedId });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}