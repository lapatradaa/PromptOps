// @/app/utils/test-utils/file-utils.ts
import { Block, TopicType } from '@/app/types';

/**
 * Debug function to log file content details
 */
export function debugFileContent(rawData: string, method: string, fileName: string): void {
    // console.log(`[FileUtils] Processing ${fileName} as ${method}`);
    // console.log(`[FileUtils] File content length: ${rawData.length} characters`);

    if (method === 'csv') {
        const lines = rawData.split('\n');
        // console.log(`[FileUtils] CSV has ${lines.length} lines`);

        if (lines.length > 0) {
            // console.log(`[FileUtils] Header: ${lines[0]}`);

            // Log column names
            const columns = lines[0].split(',').map(col => col.trim());
            // console.log(`[FileUtils] Columns (${columns.length}): ${columns.join(', ')}`);

            // Log first few data rows
            const dataRowCount = Math.min(lines.length - 1, 3);
            for (let i = 1; i <= dataRowCount; i++) {
                if (lines[i].trim()) {
                    // console.log(`[FileUtils] Row ${i}: ${lines[i].substring(0, 100)}${lines[i].length > 100 ? '...' : ''}`);
                }
            }
        }
    } else if (method === 'xlsx') {
        // For XLSX, we can log some basic characteristics
        // console.log(`[FileUtils] XLSX content starts with: ${rawData.substring(0, 20).replace(/[^\x20-\x7E]/g, '?')}`);
        // console.log(`[FileUtils] Is likely base64: ${rawData.match(/^[A-Za-z0-9+/=]+$/) ? 'Yes' : 'No'}`);
        // console.log(`[FileUtils] Starts with PK: ${rawData.startsWith('PK') ? 'Yes' : 'No'}`);
    }
}

/**
 * Creates a file blob from raw data based on file type
 */
export function createFileBlob(rawData: string, method: string, fileName?: string): Blob {
    // Log debug information
    debugFileContent(rawData, method, fileName || `file.${method}`);

    if (method === 'csv') {
        // For CSV files, use simple text blob
        return new Blob([rawData], { type: 'text/csv' });
    } else if (method === 'xlsx') {
        // For XLSX, handle different potential formats
        try {
            // Check if this is base64 data
            if (rawData.match(/^[A-Za-z0-9+/=]+$/)) {
                try {
                    // Try to decode as base64
                    const binaryString = atob(rawData);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    // console.log(`[FileUtils] Successfully decoded base64 data (${bytes.length} bytes)`);
                    return new Blob([bytes], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });
                } catch (e) {
                    console.error('[FileUtils] Failed to decode as base64:', e);
                    // Fall back to treating as text
                    return new Blob([rawData], { type: 'application/octet-stream' });
                }
            } else if (rawData.startsWith('PK')) {
                // This appears to be raw binary XLSX data (starts with PK signature)
                // Convert string to ArrayBuffer
                const buf = new ArrayBuffer(rawData.length);
                const bufView = new Uint8Array(buf);
                for (let i = 0; i < rawData.length; i++) {
                    bufView[i] = rawData.charCodeAt(i);
                }
                // console.log(`[FileUtils] Processing binary XLSX data with PK signature (${bufView.length} bytes)`);
                return new Blob([buf], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
            } else {
                // Treat as CSV if it contains commas or looks like tabular data
                if (rawData.includes(',') || rawData.includes('\t')) {
                    // console.log('[FileUtils] XLSX data appears to be in CSV format, sending as text/csv');
                    return new Blob([rawData], { type: 'text/csv' });
                } else {
                    // Last resort: send as binary
                    // console.log('[FileUtils] Treating as generic binary data');
                    return new Blob([rawData], { type: 'application/octet-stream' });
                }
            }
        } catch (e) {
            console.error('[FileUtils] Error processing XLSX data:', e);
            // Fallback for all error cases
            return new Blob([rawData], { type: 'application/octet-stream' });
        }
    } else {
        // For any other type, use octet-stream
        // console.log(`[FileUtils] Using generic binary type for ${method}`);
        return new Blob([rawData], { type: 'application/octet-stream' });
    }
}

/**
 * Extracts file information from blocks
 */
export function findFileBlock(blocks: Block[]): {
    fileBlock: Block | undefined;
    fileName: string;
    method: string;
    rawData: string;
} | null {
    const fileBlock = blocks.find(b =>
        b.type === 'input' &&
        (b.method === 'csv' || b.method === 'xlsx') &&
        b.config?.data
    );

    if (!fileBlock) return null;

    const method = fileBlock.method || 'csv';
    const fileName = fileBlock.config?.fileName || `file.${method}`;
    const rawData = fileBlock.config?.data || '';

    // console.log(`[FileUtils] Found file block: ${fileName} (${method}, ${rawData.length} chars)`);
    return {
        fileBlock,
        fileName,
        method,
        rawData
    };
}

/**
 * Extracts all unique topics from blocks
 */
export function extractTopics(blocks: Block[]): TopicType[] {
    // Get topics from topic blocks
    const topicTypes = blocks
        .filter(b => b.type === 'topic' && b.topicType)
        .map(b => b.topicType as TopicType);

    // Get topics from evaluation containers
    const evalContainerTopics = blocks
        .filter(b => b.type === 'evaluation-container')
        .flatMap(b => b.config?.topics || []);

    // Combine and deduplicate
    const allTopics = [...topicTypes, ...evalContainerTopics];
    const uniqueTopicsSet = new Set(allTopics);

    // Convert set to array
    const uniqueTopics: TopicType[] = [];
    uniqueTopicsSet.forEach(topic => uniqueTopics.push(topic));

    return uniqueTopics.length > 0 ? uniqueTopics : ([] as TopicType[]);
}

/**
 * Prepares FormData with test parameters
 */
export function prepareTestFormData(
    blocks: Block[],
    projectId: string,
    shotType: string = 'zero',
    template: string = 'std'
): FormData {
    // console.log(`[FileUtils] Preparing test form data for project ${projectId}`);
    const formData = new FormData();
    const topics = extractTopics(blocks);

    // Check if robustness topic is selected
    const hasRobustnessTopic = topics.some(topic =>
        typeof topic === 'string' && topic.toLowerCase() === 'robustness'
    );

    // Extract robustness percentage if topic is selected
    let robustnessPercentage = null;
    if (hasRobustnessTopic) {
        // Find blocks that might contain robustness config
        blocks.forEach(block => {
            if (block.config?.topicConfigs?.robustness?.swapPercentage) {
                robustnessPercentage = block.config.topicConfigs.robustness.swapPercentage;
            }
        });

        // If no percentage found in blocks, check for blocks with direct robustness config
        if (robustnessPercentage === null) {
            blocks.forEach(block => {
                if (block.config?.topicConfigs?.robustness.swapPercentage) {
                    robustnessPercentage = block.config.topicConfigs.robustness.swapPercentage;
                }
            });
        }

        // Default to 10% if not specified
        if (robustnessPercentage === null) {
            robustnessPercentage = 10;
        }
    }

    // Add file if available
    const fileInfo = findFileBlock(blocks);
    if (fileInfo) {
        try {
            // console.log(`[FileUtils] Adding file to form data: ${fileInfo.fileName}`);
            const fileBlob = createFileBlob(fileInfo.rawData, fileInfo.method, fileInfo.fileName);
            formData.append('file', fileBlob, fileInfo.fileName);

            // Also include raw data as fallback
            formData.append('raw_file_data', fileInfo.rawData);
            formData.append('file_method', fileInfo.method);
        } catch (e) {
            console.error('[FileUtils] Error creating file blob:', e);
            // Add error details to help with debugging
            formData.append('file_error', String(e));
        }
    } else {
        // console.log(`[FileUtils] No file block found in ${blocks.length} blocks`);
    }

    // Add other parameters
    formData.append('shot_type', shotType);
    formData.append('template', template);
    formData.append('blocks', JSON.stringify(blocks));
    formData.append('topics', JSON.stringify(topics));
    formData.append('project_id', projectId);

    // Add robustness configuration if topic is selected
    if (hasRobustnessTopic && robustnessPercentage !== null) {
        const topicConfigs = {
            robustness: {
                swapPercentage: robustnessPercentage
            }
        };

        // console.log('[FileUtils] Adding robustness configuration to form data:', topicConfigs);
        formData.append('topic_configs', JSON.stringify(topicConfigs));
    }

    return formData;
}

/**
 * Validates if a file contains the required columns for testing
 */
export function validateFileStructure(rawData: string, method: string): boolean {
    if (!rawData) {
        // console.log('[FileUtils] validateFileStructure: No raw data provided');
        return false;
    }

    try {
        // For CSV, check for required columns by parsing header
        if (method === 'csv') {
            const lines = rawData.split('\n');
            if (lines.length < 2) {
                // console.log('[FileUtils] validateFileStructure: CSV has less than 2 lines');
                return false;
            }

            const header = lines[0].toLowerCase();
            // console.log(`[FileUtils] validateFileStructure: CSV header: ${header}`);

            const hasRequiredColumns = header.includes('question') &&
                (header.includes('expected_answer') || header.includes('expected answer'));

            // console.log(`[FileUtils] validateFileStructure: Has required columns: ${hasRequiredColumns}`);
            return hasRequiredColumns;
        }

        // For XLSX, perform basic validation
        // console.log('[FileUtils] validateFileStructure: XLSX basic validation passed');
        return true;
    } catch (e) {
        console.error('[FileUtils] Error validating file structure:', e);
        return false;
    }
}