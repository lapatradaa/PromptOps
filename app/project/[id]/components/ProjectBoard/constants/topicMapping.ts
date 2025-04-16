import { TopicType } from '@/app/types';

export const TOPIC_MAPPING: Record<string, TopicType[]> = {
    sentiment: [
        'Taxonomy', 'NER', 'Temporal', 'Negation',
        'Vocabulary', 'Fairness', 'Robustness',
    ],
    qa: [
        'Taxonomy', 'NER', 'Negation', 'Coreference',
        'SRL', 'Logic', 'Vocabulary', 'Fairness', 'Robustness',
    ],
    default: [],
};