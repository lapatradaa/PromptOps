import React, { useEffect, useState } from "react";

interface BarChartProps {
  performanceScore: number;
  barColor?: string;
  fontColor?: string;
}

const BarChart: React.FC<BarChartProps> = ({
  performanceScore,
  barColor = "#",
  fontColor = "#"
}) => {
  const [percentage, setPercentage] = useState("0.00");

  useEffect(() => {
    if (typeof performanceScore === "number") {
      setPercentage((performanceScore * 100).toFixed(2));
    }
  }, [performanceScore]);

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
          width: "50px",
          marginLeft: "10px",
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
