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
    | 'preprocessing'
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
    config?: BlockConfig;
    onMetricSelect?: (metric: TopicType) => void;
    onMetricRemove?: (metric: TopicType) => void;
    onRemoveTopic?: (topic: TopicType) => void;
}

interface BlockConfig {
    topics?: TopicType[];
    data?: string;        // CSV text or base64 for XLSX
    fileName?: string;    // store the real file name
}

export interface Block extends BlockProps {
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
