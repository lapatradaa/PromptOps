export interface NewProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (projectName: string, type: string, llm: string, apiKey: string, systemContent: SystemContent) => void;
    userId: string;
}

export interface SystemContent {
    type: 'qa' | 'none' | 'custom';
    content?: string;
}

export interface FormState {
    projectName: string;
    type: string;
    llm: string;
    apiKey: string;
    systemContent: SystemContent;
    customContent: string;
}