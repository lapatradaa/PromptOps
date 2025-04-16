import React, { useState } from "react";
import { BiChevronLeft } from "react-icons/bi";
import { HiThumbUp, HiThumbDown } from "react-icons/hi";
import styles from "../Dashboard.module.css";
import { TopicData } from "../utils/dataHelpers";

interface ExampleItem {
    text: string;
    reason?: string;
    isCorrect: boolean;
}

interface DetailViewProps {
    topic: string;
    data: TopicData;
    onBack: () => void;
}

const PerturbationDetail: React.FC<DetailViewProps> = ({ topic, data, onBack }) => {
    const [currentExample, setCurrentExample] = useState(0);

    // Format pass/fail counts based on API response
    const passCount = data.applicable_cases || 0;
    const totalCount = data.total_cases || 0;
    const failCount = totalCount - passCount;
    const passRate = Math.round((passCount / totalCount) * 100) || 0;
    const failRate = Math.round((failCount / totalCount) * 100) || 0;

    // Example data from applicable or non-applicable cases
    const examples: ExampleItem[] = [
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

    const hasExamples = examples.length > 0;
    const example = hasExamples ? examples[currentExample] : null;

    // Handle pagination
    const handlePrev = () => {
        if (currentExample > 0) {
            setCurrentExample(prev => prev - 1);
        }
    };

    const handleNext = () => {
        if (currentExample < examples.length - 1) {
            setCurrentExample(prev => prev + 1);
        }
    };

    return (
        <div className={styles.dashboardSidebar}>
            <div className={styles.dashboardHeader}>
                <div className={styles.detailHeader}>
                    <button className={styles.backButton} onClick={onBack}>
                        <BiChevronLeft />
                    </button>
                    {/* Format topic name based on specific cases */}
                    <h2>
                        {topic.toLowerCase() === "ner" ? "NER" :
                            topic.toLowerCase() === "vocab" ? "Vocabulary" :
                                topic.toLowerCase() === "srl" ? "SRL" :
                                    topic}
                    </h2>
                </div>
            </div>

            <div className={styles.dashboardContent}>
                {/* Circle chart */}
                <div className={styles.circleChartContainer}>
                    <div className={styles.donutChart}>
                        <div className={styles.donutInner}>
                            <div className={styles.donutLabel}>{passRate}%</div>
                        </div>
                        <svg width="100%" height="100%" viewBox="0 0 42 42" className={styles.donutSvg}>
                            <circle
                                className={styles.donutRing}
                                cx="21"
                                cy="21"
                                r="16.91549430918954"
                                fill="transparent"
                                stroke="#d2d3d4"
                                strokeWidth="5"
                            />
                            <circle
                                className={styles.donutSegment}
                                cx="21"
                                cy="21"
                                r="16.91549430918954"
                                fill="transparent"
                                stroke="#8eda92"
                                strokeWidth="5"
                                strokeDasharray={`${passRate} ${100 - passRate}`}
                                strokeDashoffset="25"
                            />
                        </svg>
                    </div>

                    <div className={styles.voteContainer}>
                        <div className={styles.voteItem}>
                            <HiThumbUp className={styles.thumbUp} />
                            <span>{`${passRate}% (${passCount})`}</span>
                        </div>
                        <div className={styles.voteItem}>
                            <HiThumbDown className={styles.thumbDown} />
                            <span>{`${failRate}% (${failCount})`}</span>
                        </div>
                    </div>
                </div>

                {/* Pagination info - separated from circleChartContainer */}
                {hasExamples && (
                    <div className={styles.paginationInfo}>
                        {currentExample + 1} / {examples.length}
                    </div>
                )}

                {/* Example content */}
                {hasExamples && example && (
                    <div className={styles.exampleSection}>
                        <div className={styles.instructionBox}>
                            <div className={styles.instructionIcon}>ℹ️</div>
                            <p>Answer the question based on the context below. Answer each question with a simple Boolean answer (Yes or No).</p>
                        </div>

                        {example.isCorrect ? (
                            // Show transformable content
                            <div className={styles.contextBox}>
                                <div className={styles.contextHeader}>
                                    <div className={styles.contextIcon}>📝</div>
                                    <p>{example.text}</p>
                                </div>
                            </div>
                        ) : (
                            // Show reason for non-applicability
                            <div className={styles.contextBox}>
                                <div className={styles.contextHeader}>
                                    <div className={styles.contextIcon}>❌</div>
                                    <p>{example.text}</p>
                                </div>
                                <p className={styles.reasonText}>Reason: {example.reason}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation buttons */}
                {hasExamples && (
                    <div className={styles.navigationButtons}>
                        <button
                            className={`${styles.navButton} ${currentExample <= 0 ? styles.disabled : ''}`}
                            onClick={handlePrev}
                            disabled={currentExample <= 0}
                        >
                            &lt;
                        </button>
                        <button
                            className={`${styles.navButton} ${currentExample >= examples.length - 1 ? styles.disabled : ''}`}
                            onClick={handleNext}
                            disabled={currentExample >= examples.length - 1}
                        >
                            &gt;
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PerturbationDetail;