// @/app/types/core.ts

export type TestCaseFormat = 'ICQA Format' | 'Standard';

export type ShotType = 'Zero Shot' | 'One Shot' | 'Few Shot';

export type BlockType = 'input' | 'evaluation-container' | 'topic' | 'dashboard' | 'output-container' | 'test-case' | 'metric';

export type TopicType = 'Coreference' | 'Fairness' | 'NER' | 'Negation' | 'Robustness' | 'SRL' | 'Taxonomy' | 'Temporal' | 'Vocabulary';

export type MenuType = 'options' | 'llm' | 'chart' | 'dashboard' | null;

export const SHOT_TYPE_MAP: Record<ShotType, string> = {
  'Zero Shot': 'zero',
  'One Shot': 'one',
  'Few Shot': 'few'
};

export const TEMPLATE_MAP: Record<TestCaseFormat, string> = {
  'ICQA Format': 'icqa',
  'Standard': 'std'
};