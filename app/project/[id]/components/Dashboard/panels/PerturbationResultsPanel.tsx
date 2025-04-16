// @/app/project/[id]/components/Dashboard/panels/PerturbationResultsPanel.tsx

import React, { useState } from "react";
import { GrFormClose } from "react-icons/gr";
import { BiChevronRight } from "react-icons/bi";
import styles from "../Dashboard.module.css";
import PerturbationDetail from "../components/PerturbationDetail";
import { TopicData } from "../utils/dataHelpers";
import { FaCheck } from "react-icons/fa";
import { MdOutlineWarning } from "react-icons/md";

interface PerturbationResultsPanelProps {
    results: {
        perturbation_results?: Record<string, TopicData>;
    } | null;
    onClose: () => void;
    fileName?: string;
    isVisible?: boolean;
    projectType: string;
}

const PerturbationResultsPanel: React.FC<PerturbationResultsPanelProps> = ({
    results,
    onClose,
    fileName = "File1",
    isVisible = true,
    projectType
}) => {
    // State to track which topic is selected for detailed view
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

    if (!isVisible) return null;

    // Parse and organize results from the API
    const parsedResults = results || {};
    const perturbationResults: Record<string, TopicData> = parsedResults.perturbation_results || {};

    // Get list of topics from the results
    const perturbationTopics = Object.keys(perturbationResults).map(key => {
        // Convert keys like "taxonomy" to "Taxonomy"
        return key.charAt(0).toUpperCase() + key.slice(1);
    });

    // Calculate overall pass rate
    const totalTests = perturbationTopics.length;
    const passedTests = Object.values(perturbationResults).filter(
        (result) => parseInt(result.pass_percentage) > 0
    ).length;

    // If a topic is selected, show its detail view
    if (selectedTopic) {
        const normalizedTopic = selectedTopic.toLowerCase();
        const topicData = perturbationResults[normalizedTopic];

        if (topicData) {
            return (
                <PerturbationDetail
                    topic={selectedTopic}
                    data={topicData}
                    onBack={() => setSelectedTopic(null)}
                />
            );
        }
    }

    // Main topic list view
    return (
        <div className={styles.dashboardSidebar}>
            <div className={styles.dashboardHeader}>
                <div className={styles.headerContent}>
                    <h2>Test Result</h2>
                    <p>Pre-Processing</p>
                </div>
                <button className={styles.closeButton} onClick={onClose}>
                    <GrFormClose />
                </button>
            </div>

            <div className={styles.dashboardContent}>
                <div className={styles.nameContainer}>
                    <p>Name: {fileName}</p>
                </div>

                <div className={styles.perturbationContainer}>
                    <div className={styles.perturbationHeader}>
                        <p>PERTURBATION</p>
                        <div className={styles.passNoContainer}>
                            <p>Pass: {passedTests}/{totalTests}</p>
                        </div>
                    </div>

                    <div className={styles.perturbationList}>
                        {perturbationTopics.map((topic) => {
                            const key = topic.toLowerCase();
                            const value = perturbationResults[key] || {};
                            const passPercentage = value.pass_percentage || "0%";
                            const isPass = parseInt(passPercentage) > 0;

                            // Format display name
                            let displayName = topic;
                            if (topic.toLowerCase() === "ner") {
                                displayName = "NER";
                            } else if (topic.toLowerCase() === "vocab") {
                                displayName = "Vocabulary";
                            } else if (topic.toLowerCase() === "tax") {
                                displayName = "Taxonomy";
                            } else if (topic.toLowerCase() === "srl") {
                                displayName = "SRL";
                            }

                            return (
                                <div
                                    key={key}
                                    className={styles.perturbationItem}
                                    onClick={() => setSelectedTopic(topic)}
                                >
                                    <div className={styles.perturbationItemContent}>
                                        {isPass ? (
                                            <div className={styles.checkmark}> <FaCheck /> </div>
                                        ) : (
                                            <div className={styles.warning}> <MdOutlineWarning /> </div>
                                        )}

                                        <div className={styles.perturbationName}>{displayName}</div>

                                        <div className={styles.chevronContainer}>
                                            <BiChevronRight />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerturbationResultsPanel;