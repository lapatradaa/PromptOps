import { NextResponse, NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Note the type change: params is now a Promise<{ id: string }>
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        // Await the params before using them
        const { id } = await params;
        console.log("Fetching project with ID:", id);

        const client = await clientPromise;
        const db = client.db("promptops");
        const project = await db.collection("projects").findOne({
            _id: new ObjectId(id),
        });

        if (!project) {
            console.log("Project not found for ID:", id);
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        return NextResponse.json(project);
    } catch (error) {
        console.error("Error fetching project:", error);
        return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
    }
}

// pages/api/projects/[projectId].ts

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
    try {
        const data = await req.json();
        const foundBlock = Array.isArray(data.blocks)
            ? data.blocks.find((b: { method: string; }) => b.method === "csv" || b.method === "xlsx")
            : null;

        const formData = new FormData();

        // If there's a file block, build the Blob ...
        if (foundBlock) {
            const rawData = foundBlock.config?.data;
            const filename = foundBlock.config?.fileName || `test.${foundBlock.method}`;

            const fileBlob =
                foundBlock.method === "csv"
                    ? new Blob([rawData], { type: "text/csv" })
                    : new Blob([Uint8Array.from(atob(rawData), (c) => c.charCodeAt(0))], {
                        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    });

            formData.append("file", fileBlob, filename);
        }

        formData.append("shot_type", data.shot_type || "");
        formData.append("template", data.template || "");
        formData.append("blocks", JSON.stringify(data.blocks || []));
        formData.append("topics", JSON.stringify(data.topics || []));

        const response = await fetch(`http://127.0.0.1:5328/process-combined`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`FastAPI error ${response.status}: ${await response.text()}`);
        }

        // Return the combined JSON with both normal & robust data
        const combinedResult = await response.json();
        return NextResponse.json(combinedResult);
    } catch (error) {
        console.error("❌ Error in Next.js route:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
