// @/app/types/testing.ts
import { TopicType } from './core';

export interface Summary {
  total_tests: number;
  failures: number;
  fail_rate: number;
}

export interface TestResult {
  name: string;
  description?: string;
  test_type: string | TopicType;
  prompt: string;
  expected_result?: string;
  perturb_text?: string;
  pass_condition?: string;
  response_original?: string;
  response_perturb?: string;
  score_original?: number;
  score_perturb?: number;
  fail?: boolean;
  passed?: boolean;
  result?: string | any;
}

export interface OverallScore {
  overall_total_tests: number;
  overall_failures: number;
  overall_failure_rate: number;
  overall_pass: number;
  overall_pass_rate: number;
}

export interface PerformanceScore {
  overall_performance_score: number;
  [key: string]: number;
}

export interface TestResults {
  tests: TestResult[];
  robust_results: any[];
  overall_score: OverallScore;
  performance_score: PerformanceScore;
  index_scores: Record<string, number>;
  summary?: Summary;
  overall_robust_score?: number | null;
  error?: string | null;
}

export const DEFAULT_TEST_RESULTS: TestResults = {
  tests: [],
  robust_results: [],
  overall_score: {
    overall_total_tests: 0,
    overall_failures: 0,
    overall_failure_rate: 0,
    overall_pass: 0,
    overall_pass_rate: 0,
  },
  performance_score: {
    overall_performance_score: 0,
  },
  index_scores: {},
  summary: {
    total_tests: 0,
    failures: 0,
    fail_rate: 0,
  },
};
