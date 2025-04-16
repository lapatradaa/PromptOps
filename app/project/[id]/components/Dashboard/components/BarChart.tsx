import React, { useEffect, useState } from "react";

interface BarChartProps {
  performanceScore: number;
  barColor?: string;
  fontColor?: string;
  isRobustness?: boolean; // New prop to identify robustness scores
}

const BarChart: React.FC<BarChartProps> = ({
  performanceScore,
  barColor = "#",
  fontColor = "#",
  isRobustness = false // Default to false
}) => {
  const [percentage, setPercentage] = useState("0.00");

  useEffect(() => {
    if (typeof performanceScore === "number") {
      // Don't multiply by 100 if it's a robustness score
      setPercentage(isRobustness
        ? performanceScore.toFixed(0)
        : (performanceScore * 100).toFixed(0));
    }
  }, [performanceScore, isRobustness]);

  return (
    <div style={{ display: "flex", alignItems: "center", width: "350px" }}>
      {/* Fixed width progress bar container */}
      <div
        style={{
          width: "210px",
          height: "30px",
          backgroundColor: "#F4F4F8",
          borderRadius: "12px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Filled portion using the custom barColor */}
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            backgroundColor: barColor,
            borderRadius: "12px 0 0 12px",
            position: "absolute",
            left: 0,
            top: 0,
          }}
        />
      </div>
      {/* Percentage text outside the bar */}
      <div
        style={{
          width: "40px",
          fontSize: "14px",
          fontWeight: "500",
          color: fontColor,
          textAlign: "right",
          whiteSpace: "nowrap",
        }}
      >
        {percentage}%
      </div>
    </div>
  );
};

export default BarChart;