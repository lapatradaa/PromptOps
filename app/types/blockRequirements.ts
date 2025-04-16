// @/app/types/blockRequirements.ts
import { BlockRequirement } from '@/app/types';

/**
 * Gets the required blocks for a specific project type
 * @param projectType Type of the project ('qa', 'sentiment', etc.)
 * @returns Array of required block requirements
 */
export function getRequiredBlocks(projectType: string): BlockRequirement[] {
    // Base requirements for all project types
    const baseRequirements: BlockRequirement[] = [
        { type: 'input', label: 'Input File', required: true },
        { type: 'test-case', label: 'Test Case', required: true },
        { type: 'output-container', label: 'Output', required: true },
        { type: 'dashboard', label: 'Dashboard', required: true },
    ];

    // Add project-specific requirements
    if (projectType === 'qa' || projectType === 'sentiment') {
        baseRequirements.push({
            type: 'evaluation-container',
            label: 'Evaluation Container',
            required: true
        });
    }

    return baseRequirements;
}

/**
 * Gets block requirements for initialization (when no blocks exist yet)
 * @param projectType Type of the project
 * @returns Array of block requirements used for initial validation state
 */
export function getInitialRequirements(projectType: string): BlockRequirement[] {
    return getRequiredBlocks(projectType);
}