// app/api/projects/[id]/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        console.log("Fetching project with ID:", params.id); // Log the ID

        const client = await clientPromise;
        const db = client.db("promptops");

        const project = await db.collection("projects").findOne({
            _id: new ObjectId(params.id),
        });

        if (!project) {
            console.log("Project not found for ID:", params.id); // Log missing project
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        console.log("Project found:", project);
        return NextResponse.json(project);
    } catch (error) {
        console.error("Error fetching project:", error);
        return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
    }
}