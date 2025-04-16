import React from "react";
import styles from "../Dashboard.module.css";

const NoResults = ({ 
  message = "No results available yet.",
  subMessage = "Run a test to see results here.",
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className={styles.noResults}>
        <p>Loading data...</p>
      </div>
    );
  }
  
  return (
    <div className={styles.noResults}>
      <p>{message}</p>
      {subMessage && <p>{subMessage}</p>}
    </div>
  );
};

export default NoResults;