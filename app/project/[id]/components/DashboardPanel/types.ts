// First, define what's in the summary object
interface Summary {
    total_tests: number;
    failures: number;
    fail_rate: number;
}

// Keep your existing TestResult interface
export interface TestResult {
    name?: string;
    prompt?: string;
    result: string | any;
    passed: boolean;
}

// Update TestResults to match the API response structure
export interface TestResults {
    results: any[];  // Empty array in your case but might contain data
    summary: Summary;  // Changed from string to Summary object type
    tests: TestResult[];
    [key: string]: any;  // Keep this for flexibility
}

export interface DashboardPanelProps {
    results: TestResults | null;
    onClose: () => void;
}