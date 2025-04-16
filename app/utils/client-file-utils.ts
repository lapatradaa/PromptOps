// @/app/utils/client-file-utils.ts
import { FileFormat, DownloadOptions, DownloadResponse, createReadableTimestamp } from './file-utils';
import { TestResults } from '@/app/types';

/**
 * Download test results as a file in the browser
 */
export function downloadResults(results: TestResults, options: DownloadOptions = {}): void {
    if (!results) return;

    // Default options
    const format = options.format || 'json';
    const filename = options.filename || `test-results-${createReadableTimestamp()}.${format}`;

    // Prepare the content and mime type
    let blob: Blob;
    let content: string;

    switch (format) {
        case 'csv':
            // Import dynamically to avoid server-side issues
            import('./file-utils').then(utils => {
                content = utils.convertToCSV(results);
                blob = new Blob([content], { type: 'text/csv' });
                triggerDownload(blob, filename);
            });
            break;
        case 'xlsx':
            // This requires special handling with ArrayBuffer
            import('./file-utils').then(async utils => {
                // We need to dynamically import XLSX too
                const XLSX = await import('xlsx');

                // Create workbook and convert to blob
                const buffer = utils.convertToXLSX(results);
                blob = new Blob([buffer], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                triggerDownload(blob, filename);
            });
            break;
        case 'json':
        default:
            content = JSON.stringify(results, null, 2);
            blob = new Blob([content], { type: 'application/json' });
            triggerDownload(blob, filename);
    }
}

/**
 * Helper function to trigger a file download in the browser
 */
function triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}

// Global flag to control whether file checking is enabled
let fileCheckingEnabled = false;
let lastToggleTime = 0;
const DEBOUNCE_DELAY = 500; // milliseconds

/**
 * Enable file checking globally
 */
export function enableFileChecking(): void {
    const now = Date.now();
    if (now - lastToggleTime < DEBOUNCE_DELAY || fileCheckingEnabled === true) {
        return; // Skip if called too quickly or already enabled
    }

    fileCheckingEnabled = true;
    lastToggleTime = now;
    // console.log('[File Utils] File checking has been enabled');
}

/**
 * Disable file checking globally
 */
export function disableFileChecking(): void {
    const now = Date.now();
    if (now - lastToggleTime < DEBOUNCE_DELAY || fileCheckingEnabled === false) {
        return; // Skip if called too quickly or already disabled
    }

    fileCheckingEnabled = false;
    lastToggleTime = now;
    // console.log('[File Utils] File checking has been disabled');
}

/**
 * Modified checkServerFile function with checking control
 */
export async function checkServerFile(
    projectId: string,
    format: FileFormat = 'json',
    retries = 3,
    retryDelay = 1000,
    forceCheck = false
): Promise<boolean> {
    // Skip checking if not enabled and not forced
    if (!fileCheckingEnabled && !forceCheck) {
        // console.log(`[checkServerFile] Skipping check - checking not enabled`);
        return false;
    }

    let attempts = 0;

    while (attempts < retries) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`/api/projects/${projectId}/download/${format}`, {
                method: 'HEAD',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                // console.log(`Server file found: ${format}`);
                return true;
            }

            // If file not found but server responded, no need to retry
            if (response.status === 404) {
                // console.log(`Server file not found (404): ${format}`);
                return false;
            }

            // For server errors, we'll retry
            attempts++;
            // console.log(`Server check attempt ${attempts}/${retries} failed. Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));

        } catch (error) {
            console.error('Error checking server file:', error);
            attempts++;

            if (attempts >= retries) {
                console.error('Max retry attempts reached');
                return false;
            }

            // console.log(`Server check attempt ${attempts}/${retries} failed. Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }

    return false;
}

/**
 * Download test results directly from the server
 */
export async function downloadServerFile(
    projectId: string,
    format: FileFormat = 'json'
): Promise<DownloadResponse> {
    try {

        const filename = `test-results-${createReadableTimestamp()}.${format}`;

        // Use a fetch request to get the file as a blob
        const response = await fetch(`/api/projects/${projectId}/download/${format}`, {
            method: 'GET',
            headers: {
                'Accept': '*/*',
            },
        });

        if (!response.ok) {
            console.error(`Server responded with status: ${response.status}`);
            return {
                success: false,
                message: `Failed to download ${format.toUpperCase()} file: ${response.statusText}`
            };
        }

        // Get the blob from response
        const blob = await response.blob();

        // Get filename from Content-Disposition if available
        const disposition = response.headers.get('Content-Disposition');
        let finalFilename = filename;

        if (disposition && disposition.includes('filename=')) {
            const filenameMatch = disposition.match(/filename="(.+)"/);
            if (filenameMatch && filenameMatch[1]) {
                finalFilename = filenameMatch[1];
            }
        }

        // Create object URL
        const url = window.URL.createObjectURL(blob);

        // Create and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', finalFilename);
        document.body.appendChild(link);
        link.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);

        return {
            success: true,
            message: `Downloaded ${format.toUpperCase()} file successfully`,
            url: url
        };
    } catch (error) {
        console.error('Error downloading server file:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error during download'
        };
    }
}

/**
 * Process and download results in one step
 */
export async function processAndDownload(
    projectId: string,
    data: any,
    format: FileFormat = 'json',
    waitForResults: boolean = true
): Promise<DownloadResponse> {
    try {
        // Step 1: Process the data
        // console.log('Processing data and preparing download...');
        const processResponse = await fetch(`/api/projects/${projectId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!processResponse.ok) {
            const errorData = await processResponse.json();
            throw new Error(errorData.error || `Processing failed with status ${processResponse.status}`);
        }

        // If we don't need to wait for results, just return success
        if (!waitForResults) {
            return {
                success: true,
                message: 'Processing initiated. Download will be available shortly.'
            };
        }

        // Step 2: Wait for the file to become available (with retries)
        // console.log('Waiting for file to become available...');
        const maxAttempts = 10;
        let attempts = 0;
        let fileAvailable = false;

        while (attempts < maxAttempts && !fileAvailable) {
            // Wait between checks
            await new Promise(resolve => setTimeout(resolve, 2000));
            fileAvailable = await checkServerFile(projectId, format);
            attempts++;

            if (!fileAvailable) {
                console.log(`Check attempt ${attempts}/${maxAttempts}: File not yet available`);
            }
        }

        if (!fileAvailable) {
            return {
                success: false,
                message: 'Timeout waiting for file to become available'
            };
        }

        // Step 3: Download the file
        // console.log('File is available, downloading...');
        return await downloadServerFile(projectId, format);

    } catch (error) {
        console.error('Error in processAndDownload:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error during processing and download'
        };
    }
}

/**
 * Download results directly from the API
 */
export async function downloadResultsFromApi(
    projectId: string,
    format: FileFormat = 'json'
): Promise<DownloadResponse> {
    try {
        // Create a URL with the format parameter
        const apiUrl = `/api/projects/${projectId}/download?format=${format}`;

        // Create a hidden anchor element to trigger the download
        const link = document.createElement('a');
        link.href = apiUrl;
        link.target = '_blank'; // To open in a new tab for large downloads

        // Append to the document and click
        document.body.appendChild(link);
        link.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(link);
        }, 100);

        return {
            success: true,
            message: `Download initiated for ${format.toUpperCase()} file`
        };
    } catch (error) {
        console.error('Error downloading results from API:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error during API download'
        };
    }
}

/**
 * Process project data and download results through the API
 */
export async function apiProcessAndDownload(
    projectId: string,
    data: any,
    format: FileFormat = 'json'
): Promise<DownloadResponse> {
    try {
        // Create the URL with format parameter
        const apiUrl = `/api/projects/${projectId}/download?format=${format}`;

        // Make the POST request
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to process and download');
        }

        // Get the blob from the response
        const blob = await response.blob();

        // Get the filename from Content-Disposition header if available
        let filename = `results.${format}`;
        const disposition = response.headers.get('Content-Disposition');
        if (disposition && disposition.includes('filename=')) {
            const filenameMatch = disposition.match(/filename="(.+)"/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }

        // Create object URL for the blob
        const blobUrl = window.URL.createObjectURL(blob);

        // Create download link
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', filename);

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Clean up
        link.remove();
        window.URL.revokeObjectURL(blobUrl);

        return {
            success: true,
            message: `Downloaded ${format.toUpperCase()} file successfully`,
            url: blobUrl
        };
    } catch (error) {
        console.error('Error processing and downloading:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error during processing'
        };
    }
}