// app/project/[id]/components/ScoreComparison/utils/chartHelpers.ts

import { ModelResultData, TopicType } from "@/app/types";
import { getPerturbationDisplayName } from "./nameMappers";

/**
 * Prepares data for model‐focused charts, mapping each active category
 * (including Robustness) through the same lookup in performance_score.
 */
export const prepareModelFocusedData = (
    comparisonData: ModelResultData[],
    activeCategories: (TopicType | 'Overall Score')[]
) => {
    if (!comparisonData.length) return [];

    // Check if we're dealing with sentiment data
    const isSentimentProject = comparisonData[0]?.raw?.projectType === 'sentiment';
    console.log('Project type:', isSentimentProject ? 'sentiment' : 'qa');

    return activeCategories.map(category => {
        const displayName = category === 'Overall Score'
            ? 'Overall Score'
            : getPerturbationDisplayName(category);

        const dataPoint: Record<string, any> = { name: displayName };

        comparisonData.forEach((modelData, index) => {
            const key = `${modelData.model}_${modelData.option}_${modelData.format}_${index}`;

            let rawValue: number;
            if (category === 'Overall Score') {
                rawValue = modelData.results.performance_score.overall_performance_score ?? 0;
            } else {
                const lookupKey = category === 'Robustness' ? 'robust' : category as string;
                rawValue = modelData.results.performance_score[lookupKey] ?? 0;
            }

            console.log(`Raw value for ${category}: ${rawValue}`);

            // For sentiment projects, always multiply by 100 except for robust
            let finalValue;
            if (isSentimentProject) {
                finalValue = category.toLowerCase() === 'robust' || category.toLowerCase() === 'Robustness'
                    ? Math.round(rawValue)
                    : Math.round(rawValue * 100);
            } else {
                // For QA projects, use existing logic
                finalValue = rawValue > 1 ? Math.round(rawValue) : Math.round(rawValue * 100);
            }

            console.log(`Final value for ${category}: ${finalValue}`);
            dataPoint[key] = finalValue;
        });

        return dataPoint;
    });
};