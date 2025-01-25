import { FormState } from './types';

export const INITIAL_FORM_STATE: FormState = {
    projectName: '',
    type: '',
    llm: '',
    apiKey: '',
    systemContent: { type: 'none' },
    customContent: ''
};

export const MODEL_OPTIONS = {
    Gemini: [
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' }
    ],
    GPT: [
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ],
    Claude: [
        { value: 'claude', label: 'Claude' }
    ],
    Llama: [
        { value: 'llama-3.2-3b', label: 'Llama 3.2 3B' }
    ],
    Other: [
        { value: 'custom', label: 'Custom Model' }
    ]
} as const;