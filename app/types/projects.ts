// @/app/types/projects.ts

import { Block } from './models'
import { TestResults } from './testing';
import { SystemPrompt } from './ui';

export interface Project {
    _id: string;
    name: string;
    llm: string;
    type: string;
    apiKey?: string;
    url?: string;
    modelProvider?: string;
    SystemPrompt: SystemPrompt
    createdAt: Date;
    lastAccessedAt?: Date;
    userId?: string;
}

export interface ProjectBoardProps {
    initialBlocks: Block[];
    onBlocksUpdate: (blocks: Block[], totalCount: number) => void;
    onDashboardClick?: () => void;
    projectType: string;
    onApplicabilityResults?: (results: any) => void;
    showDashboardResults?: (mode: 'applicability' | 'results') => void;
    clearResults?: () => void;
    testResults?: TestResults | null;
    testRunId?: string | null;
    projectId?: string;
    sseStatus?: any;
    testAttemptedWithMissingBlocks?: boolean;
}