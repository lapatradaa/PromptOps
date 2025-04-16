// @/app/api/projects/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { encryptApiKey, isEncrypted } from "@/lib/encryption";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const updateData = await req.json();
    const client = await clientPromise;
    const db = client.db("promptops");
    // First verify the project belongs to the user
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id),
      userId: session.user.id
    });
    if (!project) {
      return NextResponse.json(
        { error: "Project not found or unauthorized" },
        { status: 404 }
      );
    }
    // Create update object based on provided fields
    const updateFields: Record<string, any> = {};
    // Handle project name update
    if (updateData.name !== undefined) {
      if (!updateData.name.trim()) {
        return NextResponse.json(
          { error: "Project name cannot be empty" },
          { status: 400 }
        );
      }
      updateFields.name = updateData.name.trim();
    }
    // Handle LLM settings update
    if (updateData.type !== undefined) updateFields.type = updateData.type;
    if (updateData.llm !== undefined) updateFields.llm = updateData.llm;
    if (updateData.apiKey !== undefined) {
      // Only encrypt if the API key isn't already encrypted
      if (updateData.apiKey && !isEncrypted(updateData.apiKey)) {
        updateFields.apiKey = encryptApiKey(updateData.apiKey);
      } else {
        updateFields.apiKey = updateData.apiKey;
      }
    }
    if (updateData.systemPrompt !== undefined) {
      // Check if system prompt is actually different from existing one
      const existingPrompt = project.systemPrompt;
      const newPrompt = updateData.systemPrompt;
      let isDifferent = false;

      if (typeof newPrompt === 'object' && typeof existingPrompt === 'object') {
        // Compare objects by properties
        isDifferent =
          newPrompt.type !== existingPrompt.type ||
          newPrompt.withContext !== existingPrompt.withContext ||
          newPrompt.defaultPrompt !== existingPrompt.defaultPrompt ||
          newPrompt.customPrompt !== existingPrompt.customPrompt;
      } else {
        // Simple comparison for strings or other types
        isDifferent = JSON.stringify(newPrompt) !== JSON.stringify(existingPrompt);
      }

      if (isDifferent) {
        // Only update if there's an actual change
        updateFields.systemPrompt = typeof newPrompt === 'object'
          ? {
            type: newPrompt.type || 'default',
            withContext: newPrompt.withContext || false,
            defaultPrompt: newPrompt.defaultPrompt || '',
            customPrompt: newPrompt.customPrompt || ''
          }
          : newPrompt;
      }
    }
    if (updateData.modelProvider !== undefined) updateFields.modelProvider = updateData.modelProvider;
    if (updateData.url !== undefined) updateFields.url = updateData.url;

    // Skip update if no changes were detected
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { message: "No changes detected" },
        { status: 200 }
      );
    }

    // Update the project
    const result = await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    // Return the updated project
    const updatedProject = await db.collection("projects").findOne({
      _id: new ObjectId(id)
    });
    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// GET route handler to fetch project details
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await context.params;

    // Check if user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("promptops");

    // Find the project and check if user has access
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id),
      userId: session.user.id
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or unauthorized" },
        { status: 404 }
      );
    }

    // Update last accessed timestamp
    await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      { $set: { lastAccessedAt: new Date() } }
    );

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // First verify the project belongs to the user
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id),
      userId: session.user.id
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or unauthorized" },
        { status: 404 }
      );
    }

    // Find the results tracking document
    const resultsDoc = await db.collection("results").findOne({ projectId: id });

    // Delete individual result documents if the tracking document exists
    if (resultsDoc && resultsDoc.resultIds && resultsDoc.resultIds.length > 0) {
      await db.collection("result").deleteMany({
        _id: { $in: resultsDoc.resultIds.map((resultId: string) => new ObjectId(resultId)) }
      });
    }

    // Delete individual result documents by projectId (backup)
    await db.collection("result").deleteMany({
      projectId: id
    });

    // Delete the results tracking document
    await db.collection("results").deleteOne({
      projectId: id
    });

    // Delete the project
    const result = await db.collection("projects").deleteOne({
      _id: new ObjectId(id),
      userId: session.user.id
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete project" },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}