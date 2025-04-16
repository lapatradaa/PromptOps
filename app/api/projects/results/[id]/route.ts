// @/app/api/projects/results/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Authenticate user
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        // Await params first!
        const resolvedParams = params;
        const { id } = await resolvedParams;
        const searchParams = req.nextUrl.searchParams;

        // Extract optional filter parameters
        const promptOption = searchParams.get('option');  // e.g., zero, one, few shot
        const formatType = searchParams.get('format');    // e.g., icqa, std, cot

        // Connect to the database
        const client = await clientPromise;
        const db = client.db("promptops");

        // Find the results tracking document by project ID
        const resultsDoc = await db.collection("results").findOne({ projectId: id });

        // If no results are found, return a successful JSON response with an empty array
        if (!resultsDoc || !resultsDoc.resultIds || resultsDoc.resultIds.length === 0) {
            return NextResponse.json({
                results: [],
                message: "No results found for this project"
            });
        }

        // Build the query based on project id and the optional filters
        let query: any = { projectId: id };
        if (promptOption) query.prompt_option = promptOption;
        if (formatType) query.format_type = formatType;

        // Include only the results that match the tracked result IDs
        const resultIds = resultsDoc.resultIds;
        query._id = { $in: resultIds };

        // Retrieve matching results sorted by creation date (newest first)
        const results = await db.collection("result")
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();

        // If there are no matching results after filtering, return an empty results set
        if (!results || results.length === 0) {
            return NextResponse.json({
                results: [],
                message: "No results found matching the specified criteria"
            });
        }

        // Get the first result (the most recent one that matches criteria)
        const result = results[0];
        return NextResponse.json({
            results: result.results,
            prompt_option: result.prompt_option,
            format_type: result.format_type,
            modelName: result.modelName,
            createdAt: result.createdAt
        });
    } catch (error) {
        console.error(`[API] Error fetching results:`, error);
        return NextResponse.json(
            { error: "Failed to fetch test results" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
