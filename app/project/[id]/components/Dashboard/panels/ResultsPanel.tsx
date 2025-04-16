// @/app/project/[id]/components/Dashboard/panels/ResultsPanel.tsx
import {
    getPerturbationKeys,
    formatPerturbationName,
    calculateTrend
} from "../utils/dataHelpers"; import React from "react";
import { HiOutlineTrendingUp, HiOutlineTrendingDown } from "react-icons/hi";
import styles from "../Dashboard.module.css";
import Header from "../components/Header";
import CircleChart from "../components/CircleChart";
import BarChart from "../components/BarChart";
import NoResults from "../components/NoResults";
import { TestResults } from "@/app/types/testing";

interface ResultsPanelProps {
    results: TestResults | null;
    onClose: () => void;
    fileName?: string;
    onViewModeToggle?: () => void;
    isLoading?: boolean;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({
    results,
    onClose,
    fileName = "Untitled",
    onViewModeToggle,
    isLoading = false
}) => {
    // Early return for loading state
    if (isLoading) {
        return (
            <div className={styles.dashboardSidebar}>
                <Header
                    title="Visualize Dashboard"
                    onClose={onClose}
                />
                <div className={styles.dashboardContent}>
                    <NoResults isLoading={true} />
                </div>
            </div>
        );
    }

    // Early return if no results
    if (!results || !results.performance_score || !results.overall_score) {
        return (
            <div className={styles.dashboardSidebar}>
                <Header
                    title="Visualize Dashboard"
                    onClose={onClose}
                    onViewModeToggle={onViewModeToggle}
                    toggleLabel="View Applicability"
                />
                <div className={styles.dashboardContent}>
                    <NoResults />
                </div>
            </div>
        );
    }

    const { performance_score: performanceScore, overall_score: overallScore } = results;

    // Extract perturbation keys (excluding the overall score)
    const perturbationKeys = getPerturbationKeys(performanceScore);

    const renderTrendIcon = (direction: string, color: string) => {
        if (direction === "neutral") {
            return <span>―</span>;
        } else if (direction === "up") {
            return <HiOutlineTrendingUp color={color} />;
        } else {
            return <HiOutlineTrendingDown color={color} />;
        }
    };

    return (
        <div className={styles.dashboardSidebar}>
            <Header
                title="Visualize Dashboard"
                onClose={onClose}
                onViewModeToggle={onViewModeToggle}
                toggleLabel="View Applicability"
            />

            <div className={styles.dashboardContent}>
                <div className={styles.resultContainer}>
                    <div className={styles.scoreSection}>
                        <h2>Score</h2>
                        {/* Pass the entire overallScore object to CircleChart */}
                        <CircleChart overallScore={overallScore} />
                    </div>

                    <div className={styles.beforePerturbSection}>
                        <h2>Before Perturbation</h2>
                        <BarChart
                            performanceScore={performanceScore.overall_performance_score}
                            barColor="#CCA3DA"
                            fontColor="#9F19CC"
                        />
                    </div>

                    <div className={styles.afterPerturbationContainer}>
                        <h2 className={styles.afterPerturbHeader}>After Perturbation</h2>
                        {perturbationKeys.map((key, index) => {
                            const displayKey = formatPerturbationName(key);
                            const currentScore = performanceScore[key];
                            const baseValue = performanceScore.overall_performance_score;

                            // Skip if it's robustness with zero score
                            if (displayKey === "Robustness" && (!currentScore || currentScore === 0)) {
                                return null;
                            }

                            // Calculate trend
                            const trend = calculateTrend(currentScore, baseValue);

                            return (
                                <div
                                    key={key}
                                    className={styles.afterPerturbSection}
                                    style={index > 0 ? { marginTop: '15px' } : {}}
                                >
                                    <p style={{ color: trend.color }}>
                                        <span className={styles.trendIcon}>
                                            {renderTrendIcon(trend.direction, trend.color)}
                                        </span>
                                        {displayKey}
                                    </p>
                                    <BarChart
                                        performanceScore={currentScore}
                                        barColor="#9DC4E1"
                                        fontColor="#2196F3"
                                        isRobustness={displayKey === "Robustness"} // Pass true if this is the Robustness score
                                    />
                                </div>
                            );
                        }).filter(Boolean)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultsPanel;