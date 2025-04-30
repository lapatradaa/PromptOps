import { TopicType } from '@/app/types';

export const TOPIC_MAPPING: Record<string, TopicType[]> = {
    sentiment: [
        'Taxonomy', 'NER', 'Temporal', 'Negation',
        'Vocabulary', 'Fairness', 'Robustness',
    ],
    qa: [
        'Taxonomy', 'Negation', 'Coreference',
        'SRL', 'Vocabulary', 'Fairness', 'Robustness',
    ],
    default: [],
};