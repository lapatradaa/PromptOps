// app/api/projects/[id]/download/[format]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from 'xlsx';

import { createReadableTimestamp, convertToCSV, convertToXLSX } from "@/app/utils/file-utils";

// Helper functions for format conversion
function getContentTypeForFormat(format: string): string {
  switch (format.toLowerCase()) {
    case 'csv':
      return 'text/csv';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'json':
    default:
      return 'application/json';
  }
}

/**
 * HEAD route to check if a file is available
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; format: string }> }
) {
  try {
    const { id, format } = await params;

    // Validate format
    if (!['json', 'csv', 'xlsx'].includes(format)) {
      console.warn(`Invalid format requested: ${format}`);
      return new NextResponse(null, { status: 400 });
    }

    // First check if results exist in MongoDB
    const client = await clientPromise;
    const db = client.db("promptops");

    // Check for results document with projectId field
    const resultsDoc = await db.collection("results").findOne({ projectId: id });

    if (!resultsDoc || !resultsDoc.resultIds || resultsDoc.resultIds.length === 0) {
      // console.log(`No results tracking document found for project ${id}`);
      return new NextResponse(null, {
        status: 404,
        headers: { "X-Results-Available": "false" }
      });
    }

    // Get the most recent result ID
    const latestResultId = resultsDoc.resultIds[resultsDoc.resultIds.length - 1];

    // Fetch the actual result document
    const result = await db.collection("result").findOne({ _id: latestResultId });

    if (!result) {
      // console.log(`Result document not found: ${latestResultId}`);
      return new NextResponse(null, {
        status: 404,
        headers: { "X-Results-Available": "false" }
      });
    }

    // If results exist, return success
    return new NextResponse(null, {
      status: 200,
      headers: { "X-Results-Available": "true" }
    });
  } catch (error) {
    console.error(`Error in HEAD download route:`, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET route to download the file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; format: string }> }
) {
  try {
    // Await the params before using them
    const { id, format } = await params;

    // console.log(`[API] Downloading ${format} results for project ${id}`);

    // Validate user authorization
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate format
    if (!['json', 'csv', 'xlsx'].includes(format)) {
      console.warn(`Invalid format requested: ${format}`);
      return NextResponse.json(
        { error: `Invalid format: ${format}` },
        { status: 400 }
      );
    }

    // Check if the user has access to this project
    const client = await clientPromise;
    const db = client.db("promptops");

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

    if (!resultsDoc || !resultsDoc.resultIds || resultsDoc.resultIds.length === 0) {
      return NextResponse.json(
        { error: "No results found for this project" },
        { status: 404 }
      );
    }

    // Get the most recent result ID
    const latestResultId = resultsDoc.resultIds[resultsDoc.resultIds.length - 1];

    // Fetch the actual result document
    const result = await db.collection("result").findOne({ _id: latestResultId });

    if (!result) {
      return NextResponse.json(
        { error: "Result data not found" },
        { status: 404 }
      );
    }

    // Extract the test results data
    let resultData;
    if (result.results && typeof result.results === 'object') {
      resultData = result.results;
    } else {
      resultData = result;
    }

    // Generate a filename
    const timestamp = createReadableTimestamp();
    const projectName = project.name?.replace(/\s+/g, '-').toLowerCase() || 'project';
    const filename = `${projectName}-results-${timestamp}.${format}`;

    // Convert the results to the requested format
    const contentType = getContentTypeForFormat(format);

    let content: string | ArrayBuffer;

    switch (format.toLowerCase()) {
      case 'csv':
        content = convertToCSV(resultData);
        break;

      case 'xlsx':
        // Use the improved XLSX conversion function
        // This replaces the inline XLSX generation with the new function
        if (typeof convertToXLSX === 'function') {
          // If you've imported the function, use it directly
          content = convertToXLSX(resultData);
        } else {
          // Fallback to inline generation (but prefer using the imported function)
          // Create a new workbook
          const wb = XLSX.utils.book_new();

          // Add summary sheet with better formatting
          const summaryData: any[][] = [];
          summaryData.push(['Test Results Summary']);
          summaryData.push(['Generated', new Date().toLocaleString()]);
          summaryData.push([]);

          // Add overall scores if available
          if (resultData.overall_score) {
            summaryData.push(['Overall Score']);
            summaryData.push(['Total Tests', resultData.overall_score.overall_total_tests || 0]);
            summaryData.push(['Passed', resultData.overall_score.overall_pass || 0]);
            summaryData.push(['Failed', resultData.overall_score.overall_failures || 0]);
            summaryData.push(['Pass Rate', `${resultData.overall_score.overall_pass_rate || 0}%`]);
            summaryData.push([]);
          }

          // Add performance scores if available
          if (resultData.performance_score) {
            summaryData.push(['Performance Scores']);
            Object.entries(resultData.performance_score).forEach(([key, value]) => {
              summaryData.push([key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), value]);
            });
            summaryData.push([]);
          }

          const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
          summarySheet['!cols'] = [{ width: 25 }, { width: 15 }];
          XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

          // Add tests sheet with better formatting
          if (resultData.results && resultData.results.length > 0) {
            // Format the test results for better readability
            const formattedTests = resultData.results.map((test: any) => ({
              'Test Name': test.name || '',
              'Type': test.test_type || '',
              'Description': test.description || '',
              'Pass Condition': test.pass_condition || '',
              'Original Score': test.score_original,
              'Perturbed Score': test.score_perturb,
              'Result': test.fail === false ? 'Pass' : 'Fail',
              'Prompt': test.prompt || '',
              'Expected Result': test.expected_result || '',
              'Original Response': test.response_original || '',
              'Perturbed Text': test.perturb_text || '',
              'Perturbed Response': test.response_perturb || ''
            }));

            const testsSheet = XLSX.utils.json_to_sheet(formattedTests);

            // Set column widths
            testsSheet['!cols'] = [
              { width: 20 }, { width: 12 }, { width: 20 }, { width: 15 },
              { width: 12 }, { width: 12 }, { width: 10 }, { width: 40 },
              { width: 20 }, { width: 40 }, { width: 40 }, { width: 40 }
            ];

            XLSX.utils.book_append_sheet(wb, testsSheet, 'Tests');
          }

          // Add robust results sheet if available
          if (resultData.robust_results && resultData.robust_results.length > 0) {
            const formattedRobustResults = resultData.robust_results.map((item: any) => {
              const result: Record<string, any> = {};

              if ('Original_Question_Index' in item) result['Question Index'] = item.Original_Question_Index;
              if ('score' in item) result['Score'] = item.score;

              if (item.summary) {
                if ('total_tests' in item.summary) result['Total Tests'] = item.summary.total_tests;
                if ('failures' in item.summary) result['Failures'] = item.summary.failures;
                if ('fail_rate' in item.summary) result['Fail Rate'] = `${item.summary.fail_rate}%`;
              }

              return result;
            });

            const robustSheet = XLSX.utils.json_to_sheet(formattedRobustResults);
            robustSheet['!cols'] = [
              { width: 15 }, { width: 10 }, { width: 12 },
              { width: 10 }, { width: 10 }
            ];

            XLSX.utils.book_append_sheet(wb, robustSheet, 'Robustness');
          }

          // Convert to buffer
          content = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        }
        break;

      case 'json':
      default:
        content = JSON.stringify(resultData, null, 2);
    }

    // Create response with appropriate headers
    const headers = new Headers({
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': contentType
    });

    // Return the file
    return new NextResponse(content, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error(`Error in GET download route:`, error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}