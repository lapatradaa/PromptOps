import { GrFormClose } from "react-icons/gr";
import styles from './DashboardPanel.module.css';
import { DashboardPanelProps } from "./types";

const DashboardPanel = ({ results, onClose }: DashboardPanelProps) => {
  return (
    <div className={styles.dashboardSidebar}>
      <div className={styles.dashboardHeader}>
        <h2>Test Results</h2>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close dashboard"
        >
          <GrFormClose />
        </button>
      </div>
      <div className={styles.dashboardContent}>
        {results ? (
          <div className={styles.resultContainer}>
            {/* Statistics from summary */}
            <div className={styles.summarySection}>
              <h3>Statistics</h3>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <label>Total Tests:</label>
                  <span>{results.summary.total_tests}</span>
                </div>
                <div className={styles.statItem}>
                  <label>Failures:</label>
                  <span>{results.summary.failures}</span>
                </div>
                <div className={styles.statItem}>
                  <label>Fail Rate:</label>
                  <span>{(results.summary.fail_rate * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Tests section */}
            {results.tests && results.tests.length > 0 && (
              <div className={styles.testsSection}>
                <h3>Tests</h3>
                <div className={styles.testsList}>
                  {results.tests.map((test, index) => (
                    <div key={index} className={styles.testItem}>
                      <pre>{JSON.stringify(test, null, 2)}</pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw results */}
            <div className={styles.rawResults}>
              <h3>Raw Response</h3>
              <pre>{JSON.stringify(results, null, 2)}</pre>
            </div>
          </div>
        ) : (
          <div className={styles.noResults}>
            <p>No test results available yet.</p>
            <p>Run a test to see the results here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPanel;