// @/app/api/projects/[id]/test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import TestStore from "@/app/utils/test-utils/test-store";
import { Block } from "@/app/types";
import { decryptApiKey, isEncrypted } from "@/lib/encryption";

// This endpoint handles test initiation and result storage
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        console.log(`[test-api] Processing request for project: ${id}`);

        // Authentication check
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Determine what action to take based on the request Content-Type
        const contentType = request.headers.get("Content-Type") || "";

        // If request is form data, it's starting a new test
        if (contentType.includes("multipart/form-data")) {
            return handleStartTest(request, id, session.user.id);
        }
        // If it's JSON, it might be updating test status or saving results
        else if (contentType.includes("application/json")) {
            const data = await request.json();

            // Check action type from the JSON payload
            const action = data.action || "save-results";

            if (action === "update-status") {
                return handleUpdateStatus(data, id, session.user.id);
            } else if (action === "save-results") {
                return handleSaveResults(data, id, session.user.id);
            }
        }

        return NextResponse.json(
            { error: "Invalid request format" },
            { status: 400 }
        );
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        console.error("[test-api] Error processing request:", errMsg);
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}

// GET endpoint to fetch test results
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        const searchParams = request.nextUrl.searchParams;

        // Authenticate user
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Extract optional filter parameters
        const promptOption = searchParams.get('option');
        const formatType = searchParams.get('format');
        const testId = searchParams.get('testId'); // Optional specific test ID

        // Connect to the database
        const client = await clientPromise;
        const db = client.db("promptops");

        // If testId is provided, check if it's an active test
        if (testId) {
            const testStatus = TestStore.getTestStatus(testId);
            if (testStatus) {
                return NextResponse.json(testStatus);
            }
        }

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
        // Handle both string IDs and ObjectId objects
        query._id = {
            $in: resultIds.map((id: string | ObjectId) =>
                typeof id === 'string' ? new ObjectId(id) : id
            )
        };

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
        console.error(`[test-api] Error fetching results:`, error);
        return NextResponse.json(
            { error: "Failed to fetch test results" },
            { status: 500 }
        );
    }
}

/**
 * Handle a new test initiation request
 */
async function handleStartTest(request: NextRequest, projectId: string, userId: string) {
    try {
        // Parse form data
        const formData = await request.formData();

        if (!formData.has("blocks")) {
            return NextResponse.json({ error: "Missing blocks data" }, { status: 400 });
        }

        let blocks: Block[];
        try {
            blocks = JSON.parse(formData.get("blocks") as string);
        } catch (e) {
            console.error("Error parsing blocks", e);
            return NextResponse.json({ error: "Invalid blocks JSON" }, { status: 400 });
        }

        // Extract test configuration
        const shotType = formData.get("shot_type") as string || "zero";
        const template = formData.get("template") as string || "std";
        const topicsStr = formData.get("topics") as string || "[]";
        const topics = JSON.parse(topicsStr);

        // Verify project exists and belongs to user
        const client = await clientPromise;
        const db = client.db("promptops");
        const project = await db.collection("projects").findOne({
            _id: new ObjectId(projectId),
            userId: userId
        });

        if (!project) {
            return NextResponse.json(
                { error: "Project not found or unauthorized" },
                { status: 404 }
            );
        }

        // Generate a unique test ID
        const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create initial test status document in MongoDB
        await db.collection("test_status").insertOne({
            testId,
            projectId,
            userId,
            status: "running",
            started: new Date(),
            shotType,
            template,
            topics,
            progress: "Test initiated",
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Add test to in-memory TestStore for SSE updates
        TestStore.setTest(testId, {
            userId: userId,
            projectId: projectId,
            progress: "Test initiated"
        });

        // Prepare data for FastAPI request
        const fastApiFormData = new FormData();
        fastApiFormData.append("blocks", JSON.stringify(blocks));
        fastApiFormData.append("shot_type", shotType);
        fastApiFormData.append("template", template);
        fastApiFormData.append("topics", topicsStr);
        fastApiFormData.append("test_id", testId);
        fastApiFormData.append("project_id", projectId);

        // Add model information if available
        if (project.modelProvider) {
            fastApiFormData.append("model_provider", project.modelProvider);
        }

        if (project.llm) {
            fastApiFormData.append("model", project.llm);
        }

        if (project.apiKey) {
            // Decrypt the API key before sending to FastAPI
            const decryptedApiKey = isEncrypted(project.apiKey)
                ? decryptApiKey(project.apiKey)
                : project.apiKey;

            // Only send if decryption was successful
            if (decryptedApiKey) {
                fastApiFormData.append("api_key", decryptedApiKey);
                console.log(`[test-api] API key decrypted successfully for ${project.modelProvider}`);
            } else {
                console.error(`[test-api] Failed to decrypt API key for project ${projectId}`);
            }
        }

        if (project.url) {
            fastApiFormData.append("url", project.url);
        }

        if (project.systemPrompt) {
            if (typeof project.systemPrompt === 'object') {
                const promptToUse = project.systemPrompt.type === 'custom'
                    ? project.systemPrompt.customPrompt
                    : project.systemPrompt.defaultPrompt;
                fastApiFormData.append("system_content", promptToUse);
            } else if (typeof project.systemPrompt === 'string') {
                fastApiFormData.append("system_content", project.systemPrompt);
            }
        }

        // Get topic configs if any
        const evalBlock = blocks.find(b => b.type === "evaluation-container");
        if (evalBlock?.config?.topicConfigs) {
            fastApiFormData.append("topic_configs", JSON.stringify(evalBlock.config.topicConfigs));
        }

        // Call FastAPI to start the test
        try {
            const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
            console.log(`[test-api] Calling FastAPI at ${fastApiUrl}/process-combined`);

            // Start the FastAPI test asynchronously
            fetch(`${fastApiUrl}/process-combined`, {
                method: 'POST',
                headers: {
                    'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || ''
                },
                body: fastApiFormData,
            })
            .catch(err => {
                console.error('[test-api] Error calling FastAPI:', err);
                // Update test status on error
                TestStore.updateTest(testId, {
                    status: "error",
                    error: `Failed to communicate with test engine: ${err.message}`
                });
            });

            // Update test status to indicate FastAPI processing
            TestStore.updateTest(testId, {
                progress: "Test sent to processing engine"
            });
        } catch (fastApiError) {
            console.error('[test-api] Error preparing FastAPI request:', fastApiError);
            // Continue even if FastAPI call fails - we'll handle it through polling
        }

        // Create a placeholder entry in the results collection
        // This will be updated when the test completes
        const resultDoc = {
            projectId,
            testId,
            userId,
            prompt_option: shotType,
            format_type: template,
            results: null, // Will be populated when test completes
            modelName: project.llm || "unknown",
            modelProvider: project.modelProvider || "unknown",
            projectType: project.type || "unknown",
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const resultInsert = await db.collection("result").insertOne(resultDoc);
        const resultId = resultInsert.insertedId;

        // Update the results tracking document
        let resultsDoc = await db.collection("results").findOne({ projectId });
        if (!resultsDoc) {
            await db.collection("results").insertOne({
                projectId,
                resultIds: [resultId],
                updatedAt: new Date()
            });
        } else {
            const resultIds = resultsDoc.resultIds || [];
            resultIds.push(resultId);

            // Retain only the most recent 3 results
            if (resultIds.length > 3) {
                const oldestResultId = resultIds.shift();
                await db.collection("result").deleteOne({ _id: oldestResultId });
            }

            await db.collection("results").updateOne(
                { projectId },
                {
                    $set: {
                        resultIds: resultIds,
                        updatedAt: new Date()
                    }
                }
            );
        }

        // Return the test ID so client can connect to SSE
        return NextResponse.json({
            testId,
            resultId: resultId.toString(),
            message: "Test initiated. Use the SSE endpoint to monitor progress."
        });
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        console.error("[test-api] Error starting test:", errMsg);
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}

/**
 * Handle updating a test's status
 */
async function handleUpdateStatus(data: any, projectId: string, userId: string) {
    try {
        const { testId, status, progress, error } = data;
        if (!testId) {
            return NextResponse.json({ error: "Missing testId" }, { status: 400 });
        }

        // If status is "aborted", we need to send an abort request to FastAPI
        if (status === "aborted") {
            try {
                const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
                console.log(`[test-api] Sending abort request to FastAPI for test ${testId}`);

                const abortResponse = await fetch(`${fastApiUrl}/abort-test/${testId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        reason: "User-initiated abort"
                    })
                });

                if (!abortResponse.ok) {
                    console.warn(`[test-api] FastAPI abort request failed: ${abortResponse.statusText}`);
                    // Continue with local status update even if FastAPI abort fails
                } else {
                    console.log(`[test-api] FastAPI abort request successful for test ${testId}`);
                }
            } catch (abortError) {
                console.error(`[test-api] Error sending abort request to FastAPI:`, abortError);
                // Continue with local status update even if FastAPI abort request fails
            }
        }

        // Update in-memory test status for SSE
        const updated = TestStore.updateTest(testId, {
            status: status || "running",
            progress: progress || undefined,
            error: error || undefined
        });

        if (!updated) {
            return NextResponse.json({ error: "Test not found" }, { status: 404 });
        }

        // Update status in database
        const client = await clientPromise;
        const db = client.db("promptops");

        await db.collection("test_status").updateOne(
            { testId, projectId, userId },
            {
                $set: {
                    status: status || "running",
                    progress: progress || "In progress",
                    error: error || null,
                    updatedAt: new Date()
                }
            }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        console.error("[test-api] Error updating test status:", errMsg);
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}

/**
 * Handle saving test results when a test completes
 */
async function handleSaveResults(data: any, projectId: string, userId: string) {
    try {
        const { testId, results, prompt_option, format_type } = data;
        if (!testId || !results) {
            return NextResponse.json(
                { error: "Missing testId or results" },
                { status: 400 }
            );
        }

        // Update in-memory test status for SSE
        TestStore.updateTest(testId, {
            status: "completed",
            progress: "Test completed",
            results: results
        });

        // Update result document with the actual results
        const client = await clientPromise;
        const db = client.db("promptops");

        // Find the result document created during test initiation
        const result = await db.collection("result").findOne({
            testId,
            projectId,
            userId
        });

        if (!result) {
            return NextResponse.json({ error: "Result not found" }, { status: 404 });
        }

        // Update with actual results
        await db.collection("result").updateOne(
            { testId, projectId, userId },
            {
                $set: {
                    results: results,
                    prompt_option: prompt_option || result.prompt_option,
                    format_type: format_type || result.format_type,
                    updatedAt: new Date(),
                    completedAt: new Date()
                }
            }
        );

        // Update test status
        await db.collection("test_status").updateOne(
            { testId, projectId, userId },
            {
                $set: {
                    status: "completed",
                    progress: "Test completed successfully",
                    updatedAt: new Date(),
                    completedAt: new Date()
                }
            }
        );

        return NextResponse.json({
            success: true,
            message: "Results saved successfully"
        });
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        console.error("[test-api] Error saving results:", errMsg);
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}