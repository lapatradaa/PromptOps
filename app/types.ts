// types.ts
export type TestCaseFormat =
    | 'ICQA Format'
    | 'Standard'
    | 'Chain-of-Thought';

export type ShotType =
    | 'Zero Shot'
    | 'One Shot'
    | 'Few Shot';

export type BlockType =
    | 'input'
    | 'evaluation-container'
    | 'topic'
    | 'dashboard'
    | 'output-container'
    | 'test-case'
    | 'metric';

export type TopicType =
    | 'Coreference'
    | 'Fairness'
    | 'Logic'
    | 'NER'
    | 'Negation'
    | 'Robustness'
    | 'SRL'
    | 'Taxonomy'
    | 'Temporal'
    | 'Vocabulary';

export type MenuType = 'options' | 'llm' | 'chart' | 'dashboard' | null;

export interface Position {
    x: number;
    y: number;
}

export interface BlockProps {
    type: BlockType;
    label?: string;
    isContainer?: boolean;
    topicType?: TopicType;
    testCaseFormat?: TestCaseFormat;
    shotType?: ShotType;
    method?: string;
    config?: {
        topics?: TopicType[];
    };
    onMetricSelect?: (metric: TopicType) => void;
    onMetricRemove?: (metric: TopicType) => void;
    onRemoveTopic?: (topic: TopicType) => void;
}

// Add a TestBlockProps interface to extend BlockProps with API-specific fields
export interface TestBlockProps extends BlockProps {
    method?: string;
    config?: Record<string, any>;
}

// Update Block interface to extend TestBlockProps
export interface Block extends TestBlockProps {
    id: string;
    position: Position;
}

// Add DragItem type based on Block but with optional id
export type DragItem = Omit<Block, 'id'> & { id?: string };

export interface DropResult {
    isRemoveZone?: boolean;
}

export interface ProjectBoardProps {
    initialBlocks?: Block[];
    onBlocksUpdate?: (blocks: Block[]) => void;
    onDashboardClick?: () => void;
}

export interface Project {
    _id: string;
    name: string;
    llm: string;
    type: string;
    apiKey?: string;
    systemContent: {
        type: "qa" | "none" | "custom";
        content?: string;
    };
    createdAt: Date;
    userId?: string;
}
