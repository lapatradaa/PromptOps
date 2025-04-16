// @/app/utils/file-utils.ts
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// File type options
export type FileFormat = 'json' | 'csv' | 'xlsx';

// Download options interface
export interface DownloadOptions {
    filename?: string;
    format?: FileFormat;
}

// Download response interface
export interface DownloadResponse {
    success: boolean;
    message?: string;
    url?: string;
}

/**
 * Creates a human-readable timestamp for filenames in format YYYY-MM-DD-HHMM
 */
export function createReadableTimestamp(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}-${hours}.${minutes}`;
}

/**
 * Convert test results to CSV format - Updated to work with your data structure
 */
export function convertToCSV(data: any): string {
    // Check for the actual data structure with 'results' array (not 'tests')
    if (data?.results && Array.isArray(data.results) && data.results.length > 0) {
        return formatTestResultsToCSV(data);
    }

    // Fallback for other data structures (keep your existing generic logic)
    if (!data) return '';

    // Handle arrays of objects
    const array = Array.isArray(data) ? data : [data];
    if (array.length === 0) return '';

    // Get all possible headers from all objects
    const headers = new Set<string>();
    array.forEach(item => {
        Object.keys(item).forEach(key => headers.add(key));
    });

    // First transform the data to handle complex objects
    const transformedArray = array.map(item => {
        const transformedItem: Record<string, string> = {};
        Array.from(headers).forEach(header => {
            const value = item[header];
            if (value === null || value === undefined) {
                transformedItem[header] = '';
            } else if (typeof value === 'object') {
                transformedItem[header] = JSON.stringify(value);
            } else {
                transformedItem[header] = String(value);
            }
        });
        return transformedItem;
    });

    return Papa.unparse(transformedArray, {
        header: true,
        skipEmptyLines: true,
        quotes: true
    });
}

/**
 * Format test results to CSV with improved readability - adapted for your data structure
 */
function formatTestResultsToCSV(data: any): string {
    // Extract the test results array (which is under 'results', not 'tests')
    const testResults = data.results;

    if (!testResults || !Array.isArray(testResults) || testResults.length === 0) {
        return "No test results available";
    }

    // Map test results to a more readable format with separate columns
    const formattedTests = testResults.map(test => ({
        'Test Name': test.name || '',
        'Type': test.test_type || '',
        'Description': test.description || '',
        'Prompt': cleanText(test.prompt || ''),
        'Expected Result': cleanText(test.expected_result || ''),
        'Perturbed Text': cleanText(test.perturb_text || ''),
        'Original Response': cleanText(test.response_original || ''),
        'Perturbed Response': cleanText(test.response_perturb || ''),
        'Original Score': test.score_original != null ? test.score_original : '',
        'Perturbed Score': test.score_perturb != null ? test.score_perturb : '',
        'Pass Condition': test.pass_condition || '',
        'Passed': test.fail === false ? 'Yes' : 'No'  // Note: using fail === false
    }));

    return Papa.unparse(formattedTests, {
        header: true,
        skipEmptyLines: true,
        quotes: true  // Ensures proper handling of text with commas, quotes, etc.
    });
}

/**
 * Clean text for better CSV readability
 */
function cleanText(text: string): string {
    if (!text) return '';

    // Replace newlines with a visible marker
    const withVisibleNewlines = text.replace(/\n/g, ' [NEWLINE] ');

    return withVisibleNewlines;
}

/**
 * Convert test results to XLSX format with dedicated robustness sheet - with fixed ranges
 */
export function convertToXLSX(data: any): ArrayBuffer {
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Add summary sheet with overall metrics
    createSummarySheet(wb, data);

    // Add topic-specific sheets for regular tests
    if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        createTopicSheets(wb, data.results);
    }

    // Add dedicated robustness sheet for robust_results - with fixed logic to avoid range errors
    if (data.robust_results && Array.isArray(data.robust_results) && data.robust_results.length > 0) {
        try {
            createRobustnessSheet(wb, data.robust_results, data.overall_robust_score);
        } catch (error) {
            console.error("Error creating robustness sheet:", error);
            // Create a fallback simple robustness sheet
            createSimpleRobustnessSheet(wb, data.robust_results, data.overall_robust_score);
        }
    }

    // Write workbook to array buffer
    try {
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    } catch (error) {
        console.error("Error creating XLSX:", error);
        // Fallback to a very simple workbook
        const simpleWb = XLSX.utils.book_new();
        const simpleSheet = XLSX.utils.aoa_to_sheet([
            ["Error creating full XLSX file"],
            ["Please check the logs for details"],
            ["Fallback to simple export"]
        ]);
        XLSX.utils.book_append_sheet(simpleWb, simpleSheet, "Error");
        const buffer = XLSX.write(simpleWb, { type: 'buffer', bookType: 'xlsx' });
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }
}

/**
 * Create a well-formatted summary sheet
 */
function createSummarySheet(wb: any, data: any): void {
    const summaryData: any[][] = [];

    // Add title with formatting
    summaryData.push(['Test Results Summary']);
    summaryData.push(['Generated', new Date().toLocaleString()]);
    summaryData.push([]);

    // Add overall scores if available
    if (data.overall_score) {
        summaryData.push(['Overall Score']);
        summaryData.push(['Total Tests', data.overall_score.overall_total_tests || 0]);
        summaryData.push(['Passed', data.overall_score.overall_pass || 0]);
        summaryData.push(['Failed', data.overall_score.overall_failures || 0]);
        summaryData.push(['Pass Rate', `${data.overall_score.overall_pass_rate || 0}%`]);
        summaryData.push([]);
    }

    // Add robustness overall score if available
    if (data.overall_robust_score !== undefined) {
        summaryData.push(['Robustness Score', data.overall_robust_score]);
        summaryData.push([]);
    }

    // Add performance scores if available
    if (data.performance_score) {
        summaryData.push(['Performance Scores']);

        Object.entries(data.performance_score).forEach(([key, value]) => {
            if (key !== 'overall_performance_score') {
                summaryData.push([formatTitle(key), value]);
            }
        });

        // Add overall performance score at the end if it exists
        if (data.performance_score.overall_performance_score !== undefined) {
            summaryData.push([]);
            summaryData.push(['Overall Performance Score', data.performance_score.overall_performance_score]);
        }

        summaryData.push([]);
    }

    // Add topic-specific scores if available
    if (data.index_scores && Object.keys(data.index_scores).length > 0) {
        summaryData.push(['Topic Scores']);

        Object.entries(data.index_scores).forEach(([topic, score]) => {
            summaryData.push([formatTitle(String(topic)), score]);
        });

        summaryData.push([]);
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

    // Apply some basic styling
    if (!summarySheet['!cols']) summarySheet['!cols'] = [];
    summarySheet['!cols'][0] = { width: 25 }; // Column A width
    summarySheet['!cols'][1] = { width: 15 }; // Column B width

    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
}

/**
 * Create sheets for each topic
 */
function createTopicSheets(wb: any, results: any[]): void {
    // Group tests by topic
    const testsByTopic: Record<string, any[]> = {};

    // Group tests by their test_type (topic)
    results.forEach(test => {
        const topic = test.test_type || 'Unknown';
        if (!testsByTopic[topic]) {
            testsByTopic[topic] = [];
        }
        testsByTopic[topic].push(test);
    });

    // Create a sheet for each topic with enough tests
    Object.entries(testsByTopic).forEach(([topic, topicTests]) => {
        // Only create a sheet if there are tests for this topic
        if (topicTests.length > 0) {
            // Format the topic tests
            const formattedTopicTests = topicTests.map(test => ({
                'Test Name': test.name || '',
                'Description': test.description || '',
                'Prompt': test.prompt || '',
                'Expected Result': test.expected_result || '',
                'Perturbed Text': test.perturb_text || '',
                'Original Response': test.response_original || '',
                'Perturbed Response': test.response_perturb || '',
                'Original Score': test.score_original != null ? test.score_original : '',
                'Perturbed Score': test.score_perturb != null ? test.score_perturb : '',
                'Pass Condition': test.pass_condition || '',
                'Passed': test.fail === false ? 'Yes' : 'No'
            }));

            // Create the sheet
            const topicSheet = XLSX.utils.json_to_sheet(formattedTopicTests);

            // Set column widths
            topicSheet['!cols'] = [
                { width: 20 }, // Test Name
                { width: 20 }, // Description
                { width: 40 }, // Prompt
                { width: 20 }, // Expected Result
                { width: 40 }, // Perturbed Text
                { width: 40 }, // Original Response
                { width: 40 }, // Perturbed Response
                { width: 12 }, // Original Score
                { width: 12 }, // Perturbed Score
                { width: 15 }, // Pass Condition
                { width: 10 }  // Passed
            ];

            // Add the sheet with a clean topic name
            const safeTopicName = formatTitle(topic).replace(/[^\w\s-]/g, '');
            XLSX.utils.book_append_sheet(wb, topicSheet, safeTopicName);
        }
    });
}

/**
 * Create a dedicated robustness sheet for robust_results data.
 *
 * The function sorts the robust results by "Original_Question_Index" and adds a new
 * "Formatted Details" column that concatenates key fields from each test for improved readability.
 */
function createRobustnessSheet(wb: any, robustResults: any[], overallRobustScore: number | null): void {
    // Sort robustResults by "Original_Question_Index" in ascending order.
    const sortedRobustResults = robustResults.slice().sort((a, b) => {
        const idxA = (a.Original_Question_Index !== undefined ? a.Original_Question_Index : Number.MAX_SAFE_INTEGER);
        const idxB = (b.Original_Question_Index !== undefined ? b.Original_Question_Index : Number.MAX_SAFE_INTEGER);
        return idxA - idxB;
    });

    // Map each robust result into a readable format.
    const formattedResults = sortedRobustResults.map((item, index) => {
        const questionIndex = item.Original_Question_Index !== undefined ? item.Original_Question_Index : (index + 1);

        // Prepare custom columns: extract test names and create a multi-line formatted string.
        let testNames = 'N/A';
        let formattedDetails = 'N/A';
        if (item.results && Array.isArray(item.results) && item.results.length > 0) {
            testNames = item.results
                .map((test: any) => test.name || 'Unnamed Test')
                .join(', ');
            formattedDetails = item.results
                .map((test: any) => {
                    return `Name: ${test.name || ''}\nDescription: ${test.description || ''}\nTest Type: ${test.test_type || ''}\nPrompt: ${test.prompt || ''}\nExpected: ${test.expected_result || ''}\nResponse: ${test.response_original || ''}\nScore: ${test.score_original != null ? test.score_original : ''}`;
                })
                .join("\n\n---\n\n");
        }

        return {
            'Question Index': questionIndex,
            'Score': item.score !== undefined ? item.score : 'N/A',
            'Test Names': testNames,
            'Details': formattedDetails,
            'Total Tests': item.summary?.total_tests || 0,
            'Failures': item.summary?.failures || 0,
            'Fail Rate': item.summary?.fail_rate !== undefined ? `${item.summary.fail_rate}%` : 'N/A',
        };
    });

    // Create a worksheet from the formatted robust results.
    const robustSheet = XLSX.utils.json_to_sheet(formattedResults);

    // Set column widths for improved readability.
    robustSheet['!cols'] = [
        { width: 15 }, // Question Index
        { width: 12 }, // Score
        { width: 30 }, // Test Names
        { width: 70 }, // Formatted Details
        { width: 12 }, // Total Tests
        { width: 12 }, // Failures
        { width: 12 }, // Fail Rate
    ];

    // Append the sheet with the name "Robustness" to the workbook.
    XLSX.utils.book_append_sheet(wb, robustSheet, 'Robustness');
}

/**
 * Create a simple robustness sheet as fallback to avoid range errors
 */
function createSimpleRobustnessSheet(wb: any, robustResults: any[], overallRobustScore: number | null): void {
    // Create a much simpler sheet with just the core data
    const rows = [];

    // Add header row
    rows.push(['Robustness Results']);
    rows.push(['Overall Score', overallRobustScore || 'N/A']);
    rows.push([]);

    // Add column headers
    rows.push(['Question Index', 'Score', 'Results', 'Total Tests', 'Failures', 'Fail Rate']);

    // Add data rows
    robustResults.forEach((item, index) => {
        const row = [
            item.Original_Question_Index || (index + 1),
            item.score || 'N/A',
            // For the results column, simplify to avoid Excel issues
            item.results ? `${Array.isArray(item.results) ? item.results.length : 1} perturbation(s)` : 'N/A',
            item.summary?.total_tests || 0,
            item.summary?.failures || 0,
            item.summary?.fail_rate ? `${item.summary.fail_rate}%` : 'N/A'
        ];
        rows.push(row);
    });

    // Create the sheet from the array of arrays
    const robustSheet = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    robustSheet['!cols'] = [
        { width: 15 }, // Question Index
        { width: 12 }, // Score
        { width: 30 }, // Results (simplified)
        { width: 12 }, // Total Tests
        { width: 12 }, // Failures
        { width: 12 }  // Fail Rate
    ];

    // Add sheet to workbook
    XLSX.utils.book_append_sheet(wb, robustSheet, 'Robustness');
}

/**
 * Format a key into a readable title
 */
function formatTitle(key: string): string {
    return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Detect file format from block properties
 */
export function detectFormatFromBlock(method?: string, label?: string): FileFormat {
    // Default to JSON
    let format: FileFormat = 'json';

    // Check method first if available
    if (method) {
        const methodLower = method.toLowerCase();
        if (methodLower === 'csv') {
            format = 'csv';
        } else if (methodLower === 'xlsx' || methodLower.includes('excel')) {
            format = 'xlsx';
        }
    }
    // Then check label if method didn't match
    else if (label) {
        const labelLower = label.toLowerCase();
        if (labelLower.includes('csv')) {
            format = 'csv';
        } else if (labelLower.includes('xlsx') || labelLower.includes('excel')) {
            format = 'xlsx';
        }
    }

    return format;
}

/**
 * Get a user-friendly file size string
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get user-friendly format name
 */
export function getFormatDisplayName(format: FileFormat): string {
    switch (format) {
        case 'csv':
            return 'CSV';
        case 'xlsx':
            return 'Excel';
        case 'json':
            return 'JSON';
        default:
            return (format as string).toUpperCase();
    }
}

/**
 * Check if a file exists on the server (Node.js environment)
 */
export async function checkFileExists(filePath: string): Promise<boolean> {
    // Only run in Node.js environment (server-side)
    if (typeof window === 'undefined') {
        try {
            const fs = await import('fs/promises');
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
    return false;
}