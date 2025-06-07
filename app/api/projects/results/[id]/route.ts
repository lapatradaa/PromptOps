// File: app/api/projects/results/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const client = await clientPromise;
    const db = client.db("promptops");

    // fetch container of recent runs
    const container = await db.collection("results").findOne({ projectId: id });
    if (!container?.resultIds?.length) {
        return NextResponse.json({ results: {} });
    }

    const latest = await db
        .collection("result")
        .find({ projectId: id, _id: { $in: container.resultIds } })
        .sort({ createdAt: -1 })
        .limit(1)
        .next();

    if (!latest) {
        return NextResponse.json({ results: {} });
    }

    // wrap stored `latest.results` under `results`
    return NextResponse.json({
        results: latest.results,
        prompt_option: latest.prompt_option,
        format_type: latest.format_type,
        modelName: latest.modelName,
        createdAt: latest.createdAt
    });
}


export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const data = await req.json();

        // Extract option and format from the request, with default values
        const prompt_option = data.prompt_option || "zero";
        const format_type = data.format_type || "icqa";

        // Remove these fields from the result data (they won't be stored directly in the test results)
        const resultData = { ...data };
        delete resultData.prompt_option;
        delete resultData.format_type;

        const client = await clientPromise;
        const db = client.db("promptops");

        // Retrieve project details for additional fields
        const project = await db.collection("projects").findOne({ _id: new ObjectId(id) });
        const projectType = project?.type || "unknown";
        const modelName = project?.llm || "unknown";
        const modelProvider = project?.modelProvider || "unknown";
        const userId = project?.userId;

        // Create a new result document for storing all test data
        const newResult = {
            projectId: id,
            projectType,
            modelName,
            modelProvider,
            prompt_option,
            format_type,
            results: resultData,
            userId,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Insert the new result document and get its ID
        const insertResult = await db.collection("result").insertOne(newResult);
        const resultId = insertResult.insertedId;

        // Retrieve or create the container document for tracking result IDs
        let resultsDoc = await db.collection("results").findOne({ projectId: id });
        if (!resultsDoc) {
            const newResultsDoc = {
                projectId: id,
                resultIds: [resultId],
                updatedAt: new Date()
            };
            await db.collection("results").insertOne(newResultsDoc);
        } else {
            const resultIds = resultsDoc.resultIds || [];
            resultIds.push(resultId);

            // Retain only the most recent 3 results
            if (resultIds.length > 3) {
                const oldestResultId = resultIds.shift();
                await db.collection("result").deleteOne({ _id: oldestResultId });
            }

            // Update the container document with the new set of result IDs
            await db.collection("results").updateOne(
                { projectId: id },
                {
                    $set: {
                        resultIds: resultIds,
                        updatedAt: new Date()
                    },
                    $unset: {
                        results: "",
                        userId: "",
                        projectType: "",
                        modelName: "",
                        createdAt: ""
                    }
                }
            );
        }

        return NextResponse.json({
            success: true,
            resultId: resultId.toString(),
            prompt_option,
            format_type
        });
    } catch (error) {
        console.error(`[API] Error saving results:`, error);
        return NextResponse.json({ error: "Failed to save test results" }, { status: 500 });
    }
}