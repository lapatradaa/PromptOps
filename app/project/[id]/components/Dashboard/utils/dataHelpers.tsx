// @/app/project/[id]/components/Dashboard/utils/dataHelpers.tsx

import { TestResults } from "@/app/types";

// Additional interfaces not covered in the types file
export interface ExampleItem {
    text: string;
    reason?: string;
    isCorrect: boolean;
}

export interface TopicData {
    applicable_cases: number;
    total_cases: number;
    pass_percentage: string;
    applicable: string[];
    non_applicable: {
        text: string;
        reason: string;
    }[];
}

export interface PerturbationTopic {
    key: string;
    name: string;
    passPercentage: string;
    isPass: boolean;
    data: TopicData;
}

export interface TrendInfo {
    direction: 'up' | 'down' | 'neutral';
    color: string;
    icon: 'up' | 'down' | 'neutral';
}

/**
 * Validates test results data structure
 */
export const hasValidResults = (results: TestResults | null): boolean => {
    if (!results) return false;

    return (
        !!results.performance_score &&
        !!results.overall_score &&
        Object.keys(results.performance_score || {}).length > 0 &&
        Object.keys(results.overall_score || {}).length > 0
    );
};

/**
 * Extracts perturbation keys from performance score data
 */
export const getPerturbationKeys = (
    performanceScore: Record<string, number> | undefined
): string[] => {
    if (!performanceScore) return [];

    return Object.keys(performanceScore).filter(
        key => key !== "overall_performance_score"
    );
};

/**
 * Determines display name for perturbation key
 */
export const formatPerturbationName = (key: string): string => {
    if (key.toLowerCase().includes("robust")) {
        return "Robustness";
    } else if (key.toLowerCase().includes("vocab")) {
        return "Vocabulary";
    } else if (key.toLowerCase().includes("tax")) {
        return "Taxonomy";
    }

    return key.charAt(0).toUpperCase() + key.slice(1);
};

/**
 * Calculates trend direction compared to baseline
 */
export const calculateTrend = (
    currentValue: number,
    baseValue: number
): TrendInfo => {
    // Use a small threshold to handle floating point precision issues
    const isEqual = Math.abs(currentValue - baseValue) < 0.001;
    const isUp = currentValue > baseValue;

    if (isEqual) {
        return {
            direction: "neutral",
            color: "#808080",
            icon: "neutral"
        };
    } else if (isUp) {
        return {
            direction: "up",
            color: "#45AA13",
            icon: "up"
        };
    } else {
        return {
            direction: "down",
            color: "#BD3131",
            icon: "down"
        };
    }
};

/**
 * Formats perturbation results for display
 */
export const formatPerturbationTopics = (
    perturbationResults: Record<string, TopicData> | undefined
): PerturbationTopic[] => {
    if (!perturbationResults) return [];

    return Object.keys(perturbationResults).map(key => {
        const value = perturbationResults[key] || {};
        const passPercentage = value.pass_percentage || "0%";
        const isPass = parseInt(passPercentage) > 0;

        return {
            key,
            name: key.charAt(0).toUpperCase() + key.slice(1),
            passPercentage,
            isPass,
            data: value
        };
    });
};

/**
 * Formats example items from perturbation data
 */
export const formatExamples = (data: TopicData | undefined): ExampleItem[] => {
    if (!data) return [];

    return [
        ...(data.applicable || []).map((item: string) => {
            const parts = item.split(" | ");
            const text = parts.length > 1 ? parts[1] : item;
            return { text, isCorrect: true };
        }),
        ...(data.non_applicable || []).map((item: { text: string; reason: string }) => {
            return {
                text: item.text,
                reason: item.reason,
                isCorrect: false
            };
        })
    ];
};