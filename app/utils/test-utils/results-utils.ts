// @/app/utils/test-utils/results-utils.ts
import { TestResults, DEFAULT_TEST_RESULTS } from '@/app/types';

/**
 * Normalizes test results with defaults to ensure consistent structure
 */
export function normalizeTestResults(data: any): TestResults {
  // If data is null or undefined, return default results
  if (!data) {
    console.error('Received null or undefined test results data');
    return { ...DEFAULT_TEST_RESULTS };
  }

  // Ensure performance_score is in the right format
  let performanceScore = DEFAULT_TEST_RESULTS.performance_score;
  if (data.performance_score) {
    // Handle case when performance_score is a JSON string instead of an object
    if (typeof data.performance_score === 'string') {
      try {
        performanceScore = JSON.parse(data.performance_score);
      } catch (e) {
        console.error('Failed to parse performance_score string:', e);
      }
    } else {
      performanceScore = data.performance_score;
    }
  }

  // Ensure overall_score is in the right format
  let overallScore = DEFAULT_TEST_RESULTS.overall_score;
  if (data.overall_score) {
    // Handle case when overall_score is a JSON string instead of an object
    if (typeof data.overall_score === 'string') {
      try {
        overallScore = JSON.parse(data.overall_score);
      } catch (e) {
        console.error('Failed to parse overall_score string:', e);
      }
    } else {
      overallScore = data.overall_score;
    }
  }

  // Ensure we get test data from the most appropriate location
  // This covers all possible locations in your data structures
  let tests = [];
  if (data.tests && Array.isArray(data.tests)) {
    // FastAPI returns tests directly in the root
    tests = data.tests;
    // console.log(`Found ${tests.length} tests in data.tests`);
  } else if (data.results && Array.isArray(data.results)) {
    // Legacy format with tests in results array
    tests = data.results;
    // console.log(`Found ${tests.length} tests in data.results array`);
  } else if (data.results && data.results.tests && Array.isArray(data.results.tests)) {
    // Nested tests in results.tests
    tests = data.results.tests;
    // console.log(`Found ${tests.length} tests in data.results.tests`);
  }

  // Get robust results from various possible locations
  let robustResults = [];
  if (data.robust_results && Array.isArray(data.robust_results)) {
    robustResults = data.robust_results;
  } else if (data.results && data.results.robust_results && Array.isArray(data.results.robust_results)) {
    robustResults = data.results.robust_results;
  }

  // Get summary data from various possible locations
  let summary = DEFAULT_TEST_RESULTS.summary;
  if (data.summary) {
    summary = data.summary;
  } else if (data.results && data.results.summary) {
    summary = data.results.summary;
  }

  // Return the normalized results with proper structure
  return {
    tests: tests,
    robust_results: robustResults,
    index_scores: data.index_scores || (data.results && data.results.index_scores) || {},
    summary: summary,
    overall_robust_score: data.overall_robust_score || (data.results && data.results.overall_robust_score) || null,
    overall_score: overallScore,
    performance_score: performanceScore,
    error: data.error || (data.results && data.results.error) || null
  };
}