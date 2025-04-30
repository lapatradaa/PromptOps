import { Block } from './models';

export interface SecondaryMenuProps {
  activeTab: string | null;
  blocks: Block[];
  onBlocksUpdate: (blocks: Block[], totalBlocks: number) => void;
}

export interface Tab {
  id: string;
  label: string;
}

export interface TabMenuProps {
  activeTab: string | null;
  onTabClick: (tabId: string) => void;
  tabs: Tab[];
}

export interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    projectName: string,
    type: ProjectType,
    llm: string,
    url: string,
    apiKey: string,
    systemPrompt: SystemPrompt,
    modelProvider: string,
    customModelName: string
  ) => void;
  userId: string;
}

export type ProjectType = 'qa' | 'sentiment';
export type SystemPromptType = 'default' | 'custom';

export interface SystemPrompt {
  type: SystemPromptType;
  withContext?: boolean;
  defaultPrompt?: string;
  customPrompt?: string;
}

export interface FormState {
  projectName: string;
  type: ProjectType;
  llm: string;
  url?: string;
  apiKey: string;
  systemPrompt: SystemPrompt;
  modelProvider?: string;
  customModelName?: string;
}

export const INITIAL_FORM_STATE: FormState = {
  projectName: '',
  type: 'qa',
  llm: '',
  apiKey: '',
  systemPrompt: { 
    type: 'default',
    withContext: false,
    defaultPrompt: '',
    customPrompt: ''
  },
  url: '',
  modelProvider: '',
  customModelName: ''
};

export const MODEL_OPTIONS = {
  Gemini: [
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', modelProvider: 'gemini' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', modelProvider: 'gemini' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', modelProvider: 'gemini' }
  ],
  GPT: [
    { value: 'gpt-4o', label: 'GPT-4o', modelProvider: 'openai' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', modelProvider: 'openai' },
    { value: 'gpt-4', label: 'GPT-4', modelProvider: 'openai' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', modelProvider: 'openai' }
  ],
  // Claude: [
  //   { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet', modelProvider: 'claude' },
  //   { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet', modelProvider: 'claude' },
  //   { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', modelProvider: 'claude' },
  // ],
  // Llama: [
  //   { value: 'llama-3.2-3b-instruct', label: 'Llama 3.2 3B', modelProvider: 'llama' }
  // ],
  // Typhoon: [
  //   { value: 'typhoon-v2-8b-instruct', label: 'Typhoon v2 8B', modelProvider: 'typhoon' },
  //   { value: 'typhoon-v2-70b-instruct', label: 'Typhoon v2 70B', modelProvider: 'typhoon' },
  // ],
  // Other: [
  //   { value: 'custom', label: 'Custom Model', modelProvider: 'custom' }
  // ]
};