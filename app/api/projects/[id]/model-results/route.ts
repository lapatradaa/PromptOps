// app/api/projects/[id]/model-results/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TestResult } from "@/app/types";

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id: projectId } = params;
        const searchParams = request.nextUrl.searchParams;

        // Extract all filter parameters
        const model = searchParams.get('model');
        const option = searchParams.get('option');
        const format = searchParams.get('format');
        const projectType = searchParams.get('projectType');
        const perturbationType = searchParams.get('perturbationType') || null;

        // console.log(`[API] Fetching results with filters:`, {
        //     projectId,
        //     model,
        //     option,
        //     format,
        //     projectType,
        //     perturbationType
        // });

        // Authenticate user
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const client = await clientPromise;
        const db = client.db("promptops");

        // Build the base query
        const baseQuery: any = {
            userId: session.user.id,
            projectId: projectId,
        };

        // CRITICAL: Add project type to query if specified
        // This ensures we only return results matching the selected project type
        if (projectType) {
            baseQuery.projectType = projectType;
        }

        if (model) {
            baseQuery.modelName = {
                $regex: model.replace(/\s+/g, '.*'),
                $options: 'i'
            };
        }

        if (option) {
            baseQuery.prompt_option = { $regex: option, $options: 'i' };
        }

        if (format) {
            baseQuery.format_type = { $regex: format, $options: 'i' };
        }

        // Try to find matching results
        let results = await db.collection("result")
            .find(baseQuery)
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();

        // console.log(`[API] Found ${results.length} results with query:`, baseQuery);

        // If no results, return error specifically mentioning the project type constraint
        if (results.length === 0) {
            return NextResponse.json({
                error: projectType
                    ? `No results found for project type: ${projectType}`
                    : "No results found for this project",
                query: baseQuery
            }, { status: 404 });
        }

        // Filter results by perturbation type if specified
        let filteredResults = results;
        if (perturbationType) {
            // Parse multiple perturbation types if passed as comma-separated
            const perturbationTypes = perturbationType.split(',');

            filteredResults = results.filter(result => {
                return perturbationTypes.some(type => {
                    // Check tests and performance_score for this perturbation type
                    return result.results?.tests?.some((test: TestResult) => test.test_type === type) ||
                        (result.results?.performance_score && type in result.results.performance_score);
                });
            });
        }

        // Check if the raw parameter is set to true
        const raw = searchParams.get('raw') === 'true';

        // If raw is true, return all results without deduplication
        if (raw) {
            // console.log(`[API] Returning all ${filteredResults.length} results without deduplication`);
            return NextResponse.json({
                count: filteredResults.length,
                rawResults: filteredResults
            });
        }

        // Return the formatted results - take the latest result for each model
        const modelResults = new Map();

        // Create a map that groups results by model config + perturbation type
        filteredResults.forEach(result => {
            const modelName = result.modelName || 'unknown';
            const promptOption = result.prompt_option || 'default';
            const formatType = result.format_type || 'default';

            // Get perturbation types from this result
            // Define the array with a specific type
            const perturbTypes: string[] = [];

            // Add robust perturbation type if robust_results exist
            if (result.results?.robust_results?.length > 0) {
                perturbTypes.push('Robustness');
            }

            if (result.results?.tests?.length > 0) {
                // Safely extract test types
                const testTypes = new Set(
                    result.results.tests
                        .map((test: TestResult) => test.test_type as string)
                        .filter(Boolean)
                );

                testTypes.forEach(type => perturbTypes.push(type as string));
            }

            // For each perturbation type, create a separate entry
            perturbTypes.forEach(perturbType => {
                const key = `${modelName}-${promptOption}-${formatType}-${perturbType}`;
                modelResults.set(key, result);
            });
        });

        const uniqueResults = Array.from(modelResults.values());
        // console.log(`[API] Final unique results count: ${uniqueResults.length}`);

        return NextResponse.json({
            count: uniqueResults.length,
            results: uniqueResults
        });
    } catch (error) {
        console.error(`[API] Error fetching model results:`, error);
        return NextResponse.json(
            { error: "Failed to fetch model results", details: (error as Error).message },
            { status: 500 }
        );
    }
}