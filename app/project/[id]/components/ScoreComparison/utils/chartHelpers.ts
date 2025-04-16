// /ScoreComparison/utils/chartHelpers.ts
import { ModelResultData, TopicType } from "@/app/types";
import { getPerturbationDisplayName } from "./nameMappers";

/**
 * Prepares data for model-focused charts
 */
export const prepareModelFocusedData = (
    comparisonData: ModelResultData[],
    activeCategories: (TopicType | 'Overall Score')[]
) => {
    if (!comparisonData.length) return [];

    // Only include perturbations available in the data
    const availablePerturbations = new Set<string>();
    comparisonData.forEach(modelData => {
        if (modelData.results?.performance_score) {
            Object.keys(modelData.results.performance_score).forEach(key => {
                if (key !== 'overall_performance_score') {
                    availablePerturbations.add(key);
                }
            });
        }

        // Check regular tests
        if (modelData.results?.tests && modelData.results.tests.length > 0) {
            modelData.results.tests.forEach(test => {
                if (test.test_type) {
                    availablePerturbations.add(test.test_type);
                }
            });
        }

        // Check robust tests
        if (modelData.results?.robust_results && modelData.results.robust_results.length > 0) {
            availablePerturbations.add('Robustness');
        }
    });

    // Filter active categories to only include available perturbations and Overall
    const filteredCategories = activeCategories.filter(cat =>
        cat === 'Overall Score' || availablePerturbations.has(cat)
    );

    // Reorganize data to match the image format - category-based instead of model-based
    const chartData = filteredCategories.map((category: string) => {
        // Get display name for chart
        const displayName = category === 'Overall Score' ? 'Overall Score' : getPerturbationDisplayName(category);

        const dataPoint: any = { name: displayName };

        // Create unique keys for each model based on name, option, and format
        comparisonData.forEach((modelData, index) => {
            // Use consistent naming for both chart and legend
            const uniqueModelKey = `${modelData.model}_${modelData.option}_${modelData.format}_${index}`;

            if (category === 'Overall Score') {
                // Get from performance_score or calculate from all tests if not available
                let overallScore = modelData.results?.performance_score?.overall_performance_score;
                if (overallScore === undefined) {
                    // Fallback calculation from all tests
                    const allTests = modelData.results?.tests || [];
                    if (allTests.length > 0) {
                        overallScore = allTests.reduce((sum, test) => sum + (test.score_original || 0), 0) / allTests.length;
                    } else {
                        overallScore = 0;
                    }
                }
                dataPoint[uniqueModelKey] = Math.round(overallScore * 100);
            } else if (category.toLowerCase() === 'robust' || category.toLowerCase() === 'robustness') {
                // Use overall_robust_score or calculate from robust_results
                dataPoint[uniqueModelKey] = Math.round(modelData.results?.overall_robust_score || 0);
            } else {
                // For other categories like Vocab and Negation
                let score = modelData.results?.performance_score?.[category];

                // If the score isn't in performance_score, check in tests array
                if (score === undefined) {
                    const relevantTests = modelData.results?.tests?.filter(test => test.test_type === category) || [];
                    if (relevantTests.length > 0) {
                        score = relevantTests.reduce((sum, test) => sum + (test.score_original || 0), 0) / relevantTests.length;
                    }
                }

                dataPoint[uniqueModelKey] = score !== undefined ? Math.round(score * 100) : 0;
            }

            // Store model display name for tooltip or legend if needed
            dataPoint[`${uniqueModelKey}_display`] = modelData.model;
        });

        return dataPoint;
    });

    return chartData;
};