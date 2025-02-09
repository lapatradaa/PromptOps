import React, { useState, useEffect, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import { HiThumbUp, HiThumbDown } from "react-icons/hi";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    Plugin,
    ChartType
} from "chart.js";
import { OverallScore } from "../types";

ChartJS.register(ArcElement, Tooltip, Legend);

interface OverallScoreProps {
    overallScore: OverallScore;
}

const CircleChart: React.FC<OverallScoreProps> = ({ overallScore }) => {
    const chartRef = useRef(null);
    // Initial state with centerText as "N/A"
    const [chartData, setChartData] = useState({
        passRate: 0,
        failureRate: 0,
        centerText: "N/A"
    });

    // Create a ref to hold the current centerText value
    const centerTextRef = useRef(chartData.centerText);

    useEffect(() => {
        if (overallScore) {
            const newPassRate = overallScore.overall_pass_rate ?? 0;
            const newFailureRate = overallScore.overall_failure_rate ?? 0;
            const newCenterText = `${newPassRate.toFixed(0)}%`;

            setChartData({
                passRate: newPassRate,
                failureRate: newFailureRate,
                centerText: newCenterText
            });

            // Update the ref so our plugin uses the latest value
            centerTextRef.current = newCenterText;

            // Force Chart.js to re-render the chart
            if (chartRef.current) {
                (chartRef.current as any).update();
            }
        }
    }, [overallScore]);

    const data = {
        labels: ["Pass Rate", "Failure Rate"],
        datasets: [{
            data: [chartData.passRate, chartData.failureRate],
            backgroundColor: ["#97DF73", "#EA8585"],
            hoverBackgroundColor: ["#97DF73", "#EA8585"],
            borderWidth: 0,
            cutout: "70%" 
        }]
    };

    // Use the ref inside your plugin callback
    const centerTextPlugin: Plugin<ChartType> = {
        id: "centerText",
        beforeDraw: (chart) => {
            const { ctx, chartArea } = chart;
            if (!chartArea) return;

            ctx.save();
            ctx.font = "24px Kanit";
            ctx.fillStyle = "#52BE1C";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = (chartArea.top + chartArea.bottom) / 2;

            // Use the updated value from the ref
            ctx.clearRect(centerX - 25, centerY - 15, 50, 30);
            ctx.fillText(centerTextRef.current, centerX, centerY);

            ctx.restore();
        }
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
        }
    };

    return (
        <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
        }}>
            <div style={{ width: "80%", height: "80%" }}>
                <Doughnut
                    ref={chartRef} 
                    data={data}
                    options={options}
                    plugins={[centerTextPlugin]}
                />
            </div>
            <div style={{
                display: "flex",
                justifyContent: "center",
                gap: "30px",
                marginTop: "10px"
            }}>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px"
                }}>
                    <HiThumbUp style={{ color: "#97DF73" }} size={25} />
                    <p style={{
                        fontSize: "14px",
                        color: "#97DF73",
                        margin: 0
                    }}>
                        {chartData.passRate.toFixed(0)}% ({overallScore?.overall_pass || 0})
                    </p>
                </div>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px"
                }}>
                    <HiThumbDown style={{ color: "#EA8585" }} size={25} />
                    <p style={{
                        fontSize: "14px",
                        color: "#EA8585",
                        margin: 0
                    }}>
                        {chartData.failureRate.toFixed(0)}% ({overallScore?.overall_failures || 0})
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CircleChart;
