// app/project/[id]/components/ScoreComparison/ResultsVisualization.tsx
import React from "react";
import styles from "./ScoreComparison.module.css";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { ModelResultData, TopicType } from "@/app/types";
import { CategoryToggle } from "./CategoryToggle";
import { prepareModelFocusedData } from "./utils/chartHelpers";

interface ResultsVisualizationProps {
    comparisonData: ModelResultData[];
    activeCategories: (TopicType | 'Overall Score')[];
    availableCategories: (TopicType | 'Overall Score')[];
    toggleCategory: (category: TopicType | 'Overall Score') => void;
}

export const ResultsVisualization: React.FC<ResultsVisualizationProps> = ({
    comparisonData,
    activeCategories,
    availableCategories,
    toggleCategory
}) => {
    // Custom colors for each model index
    const modelColors = ['#CCA3DA', '#9DC4E1', '#ABA6D6'];

    // Helper function to format date with 24-hour format
    const formatDate = (date: Date | undefined) => {
        if (!date) return '';
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: false
        });
    };

    return (
        <div className={styles.resultsContainer}>
            {/* Category Selection */}
            <CategoryToggle
                activeCategories={activeCategories}
                availableCategories={availableCategories}
                toggleCategory={toggleCategory}
            />

            {/* Chart View */}
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={400} minHeight={400}>
                    <BarChart
                        data={prepareModelFocusedData(comparisonData, activeCategories)}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        barGap={8}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#666', fontSize: 14 }}
                        />
                        <YAxis
                            hide={true}
                            domain={[0, 100]}
                        />
                        <Tooltip
                            formatter={(value) => [`${value}%`]}
                            cursor={{ fill: 'transparent' }}
                        />

                        {/* Render bars for each model */}
                        {comparisonData.map((modelData, index) => {
                            const uniqueModelKey = `${modelData.model}_${modelData.option}_${modelData.format}_${index}`;
                            return (
                                <Bar
                                    key={`model-${uniqueModelKey}`}
                                    dataKey={uniqueModelKey}
                                    name={modelData.model}
                                    fill={modelColors[index % modelColors.length]}
                                    radius={[4, 4, 0, 0]}
                                    barSize={40}
                                >
                                    <LabelList
                                        dataKey={uniqueModelKey}
                                        position="top"
                                        formatter={(value: number) => `${value}%`}
                                        style={{ fontSize: '14px', fill: '#666' }}
                                    />
                                </Bar>
                            );
                        })}
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Legend for Models */}
            <div className={styles.legendContainer}>
                {comparisonData.map((modelData, index) => (
                    <div key={`legend-${modelData.model}-${index}`} className={styles.legendItem}>
                        <span
                            className={styles.legendColor}
                            style={{ backgroundColor: modelColors[index % modelColors.length] }}
                        ></span>
                        <div className={styles.legendText}>
                            <div className={styles.legendModelName}>
                                {modelData.model}
                            </div>
                            <div className={styles.legendModelInfo}>
                                {modelData.option} ({modelData.format})
                            </div>
                            <div className={styles.legendModelTimeStamp}>
                                {modelData.timestamp ? formatDate(modelData.timestamp) : ''}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};