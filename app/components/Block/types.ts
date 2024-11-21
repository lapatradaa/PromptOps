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
    | 'test-case';

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
}

export interface Block extends BlockProps {
    id: string;
    position: Position;
}

export interface DropResult {
    isRemoveZone?: boolean;
}