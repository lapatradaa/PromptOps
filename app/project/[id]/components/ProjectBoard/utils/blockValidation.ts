// @/app/project/[id]/utils/blockValidation.ts
import { Block, BlockValidationResult } from '@/app/types';
import { getRequiredBlocks } from '@/app/types/blockRequirements';

/**
 * Validates whether all required blocks are present for the project
 * @param blocks Array of blocks currently on the board
 * @param projectType Type of the project (qa, summarization, etc.)
 * @returns Validation result with missing blocks
 */
export function validateBlocks(blocks: Block[], projectType: string): BlockValidationResult {
    // Get required blocks from centralized source
    const requiredBlocks = getRequiredBlocks(projectType);

    // Check which required blocks are missing
    const missingBlocks = requiredBlocks.filter(req => {
        if (!req.required) return false;
        return !blocks.some(block => block.type === req.type);
    });

    // Check if input file has been uploaded
    const inputBlock = blocks.find(block => block.type === 'input');
    if (inputBlock && (!inputBlock.config?.data || !inputBlock.config?.fileName)) {
        missingBlocks.push({
            type: 'input',
            label: 'File Upload',
            required: true
        });
    }

    // Check if evaluation container has topics (if present)
    const evaluationContainer = blocks.find(block => block.type === 'evaluation-container');
    const missingTopics = evaluationContainer &&
        (!evaluationContainer.config?.topics ||
            evaluationContainer.config.topics.length === 0);

    // For QA projects, evaluation container must have at least one topic
    if (missingTopics && (projectType === 'qa' || projectType === 'sentiment')) {
        missingBlocks.push({
            type: 'topic',
            label: 'Evaluation Topics',
            required: true
        });
    }

    // Check if test case has shot type and format
    const testCaseBlock = blocks.find(block => block.type === 'test-case');
    if (testCaseBlock && (!testCaseBlock.shotType || !testCaseBlock.testCaseFormat)) {
        missingBlocks.push({
            type: 'test-case',
            label: 'Test Case Configuration',
            required: true
        });
    }

    return {
        isComplete: missingBlocks.length === 0,
        missingBlocks
    };
}

/**
 * Gets a formatted message about missing blocks
 * @param validationResult Result from validateBlocks function
 * @returns Formatted string describing missing requirements
 */
export function getMissingBlocksMessage(validationResult: BlockValidationResult): string {
    if (validationResult.isComplete) {
        return '';
    }

    const missingItems = validationResult.missingBlocks.map(block => block.label);

    if (missingItems.length === 1) {
        return `Missing required block: ${missingItems[0]}`;
    }

    const lastItem = missingItems.pop();
    return `Missing required blocks: ${missingItems.join(', ')} and ${lastItem}`;
}

/**
 * Checks if the input file has been uploaded
 * @param blocks Array of blocks currently on the board
 * @returns Object with status and message
 */
export function checkInputFileUploaded(blocks: Block[]): { isUploaded: boolean; message: string } {
    // Check if an input block exists
    const inputBlock = blocks.find(block => block.type === 'input');

    if (!inputBlock) {
        return {
            isUploaded: false,
            message: 'Please add an input file block first'
        };
    }

    // Check if file data exists in the block config
    if (!inputBlock.config?.data || !inputBlock.config?.fileName) {
        return {
            isUploaded: false,
            message: 'Please upload a file to the input block'
        };
    }

    return {
        isUploaded: true,
        message: `File "${inputBlock.config.fileName}" is ready`
    };
}