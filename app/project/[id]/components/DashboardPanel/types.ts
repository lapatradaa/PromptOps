// First, define the structure of the summary object
export interface Summary {
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

// Structure for each robust test result
export interface RobustResult {
    Original_Question_Index: number;
    score: number;
    summary: Summary;
    results: TestResult[];
}

// Structure for overall score
export interface OverallScore {
    overall_total_tests: number;
    overall_failures: number;
    overall_failure_rate: number;
    overall_pass: number;
    overall_pass_rate: number;
}

// Structure for performance score (supports dynamic keys like "robust")
export interface PerformanceScore {
    overall_performance_score: number;
    [key: string]: number;
}

// Updated TestResults to match API response structure
export interface TestResults {
    index_scores: { [key: string]: number }; // Scores per question index
    robust_results: RobustResult[];
    overall_score: OverallScore;
    performance_score: PerformanceScore;
    tests: TestResult[];
    [key: string]: any; // Keep this for flexibility
}

// Dashboard Panel Props
export interface DashboardPanelProps {
    results: TestResults | null;
    onClose: () => void;
}
