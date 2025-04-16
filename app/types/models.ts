// @/app/types/models.ts
import { TopicType, ShotType, TestCaseFormat, BlockType } from './core';
import { TestResults } from './testing';

export interface ModelSelection {
  model: string;
  modelDisplay?: string;
  provider?: string;
  option: ShotType;
  format: TestCaseFormat;
  displayName: string;
}

export interface ModelResultData {
  model: string;           // Display name with optional version suffix (for UI)
  modelValue?: string;     // Original model value (for API)
  timestamp?: Date;
  provider?: string;       // Model provider (openai, claude, etc.)
  option: ShotType;
  format: TestCaseFormat;
  results: TestResults;
  perturbationTypes?: string[];
  raw?: any;
  error?: string;          // Error message if any
}

export interface ExtendedModelResultData extends ModelResultData {
  resultMetadata?: {
    totalResults: number;
    selectedResultId: string;
    selectedResultDate: string;
    isMultipleResults: boolean;
  };
}

export interface Position {
  x: number;
  y: number;
}

// **Here is your Block type included as it was originally defined**
export interface BlockProps {
  type: BlockType;
  label?: string;
  isContainer?: boolean;
  topicType?: TopicType;
  testCaseFormat?: TestCaseFormat;
  shotType?: ShotType;
  method?: string;
  config?: BlockConfig;
  onMetricSelect?: (metric: TopicType) => void;
  onMetricRemove?: (metric: TopicType) => void;
  onRemoveTopic?: (topic: TopicType) => void;
}

export interface BlockConfig {
  topics?: TopicType[];
  topicConfigs?: Record<string, any>;
  data?: string;
  fileName?: string;
  processed?: boolean;
  results?: TestResults | null;
  processAsCSV?: boolean;
  contextOption?: string;
}

export interface Block extends BlockProps {
  id: string;
  position: Position;
}

export interface BlockRequirement {
  type: BlockType;
  label: string;
  required: boolean;
}

export interface BlockValidationCheckerProps {
  blocks: Block[];
  projectType: string;
  isTestAttempted?: boolean;
}

export interface BlockValidationResult {
  isComplete: boolean;
  missingBlocks: BlockRequirement[];
}

export type DragItem = Omit<Block, 'id'> & { id?: string };

export interface DropResult {
  isRemoveZone?: boolean;
}

export interface RobustnessConfig {
  swapPercentage: number;
}