import React, { useEffect, useState } from "react";
import { GrFormClose } from "react-icons/gr";
import { HiOutlineTrendingUp, HiOutlineTrendingDown } from "react-icons/hi";
import styles from "./DashboardPanel.module.css";
import { DashboardPanelProps } from "./types";
import CircleChart from "./components/CircleChart";
import BarChart from "./components/BarChart";

const DashboardPanel = ({ results, onClose }: DashboardPanelProps) => {
  const [overallScore, setOverallScore] = useState(results?.overall_score || null);
  const [performanceScore, setPerformanceScore] = useState(results?.performance_score || null);
  const [dummy, setDummy] = useState(0); // Dummy state for forcing re-render

  useEffect(() => {
    setOverallScore(results?.overall_score || null);
    setPerformanceScore(results?.performance_score || null);
    setDummy((dummy) => dummy + 1);
  }, [results]);

  // Extract perturbation keys (excluding the overall score if necessary)
  const perturbationKeys =
    performanceScore && typeof performanceScore === "object"
      ? Object.keys(performanceScore).filter(key => key !== "overall_performance_score")
      : [];

  return (
    <div className={styles.dashboardSidebar}>
      <div className={styles.dashboardHeader}>
        <h2>Visualize Dashboard</h2>
        <button className={styles.closeButton} onClick={onClose}>
          <GrFormClose />
        </button>
      </div>

      <div className={styles.dashboardContent}>
        <div className={styles.resultContainer}>
          {overallScore && performanceScore ? (
            <>
              <div className={styles.scoreSection}>
                <h2>Score</h2>
                <CircleChart overallScore={overallScore} />
              </div>

              <div className={styles.beforePerturbSection}>
                <h2>Before Perturbation</h2>
                <BarChart performanceScore={performanceScore.overall_performance_score} barColor="#CCA3DA" fontColor="#9F19CC" />
              </div>

              <div className={styles.afterPerturbationContainer}>
                <h2 className={styles.afterPerturbHeader}>
                  After Perturbation
                </h2>
                {perturbationKeys.map(key => {
                  let displayKey = key;
                  let currentScore = performanceScore[key];

                  // If key is "robust" or "vocab", adjust the display name and score normalization
                  if (key.toLowerCase().includes("robust")) {
                    displayKey = "Robustness";
                    currentScore = performanceScore[key] / 100;
                  } else if (key.toLowerCase().includes("vocab")) {
                    displayKey = "Vocabulary";
                  }

                  if (
                    (displayKey === "Robustness") &&
                    (!currentScore || currentScore === 0)
                  ) {
                    return null;
                  }

                  // Determine if the current key has an "up" or "down" trend
                  const isUp = performanceScore[key] > performanceScore.overall_performance_score;
                  // Choose the color based on the trend
                  const trendColor = isUp ? "#45AA13" : "#BD3131";

                  return (
                    <div key={key} className={styles.afterPerturbSection}>
                      <p style={{ color: trendColor }}>
                        <span className={styles.trendIcon}>
                          {isUp ? (
                            <HiOutlineTrendingUp color={trendColor} />
                          ) : (
                            <HiOutlineTrendingDown color={trendColor} />
                          )}
                        </span>
                        {displayKey}
                      </p>
                      <BarChart
                        performanceScore={currentScore}
                        barColor="#9DC4E1"
                        fontColor="#2196F3"
                      />
                    </div>
                  );
                }).filter((item) => item !== null)}
              </div>
            </>
          ) : (
            <div className={styles.noResults}>
              <p>No test results available yet.</p>
              <p>Run a test to see the results here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel;
