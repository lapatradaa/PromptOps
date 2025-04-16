import React, { useState } from "react";
import styles from "./FileTemplates.module.css";
import * as XLSX from 'xlsx';
import Spinner from "@/app/components/Spinner";

const InputFormat = () => {
    const [activeTemplateType, setActiveTemplateType] = useState("ICQA");
    const [isAnimating, setIsAnimating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingFormat, setLoadingFormat] = useState<string | null>(null);

    const templates = [
        {
            type: "ICQA",
            formats: ["Zero Shot", "One Shot", "Few Shot"],
            downloadOptions: [".xlsx"]
        },
        {
            type: "Standard",
            formats: ["Zero Shot", "One Shot", "Few Shot"],
            downloadOptions: [".xlsx (Sentiment)", ".xlsx (QA)"]
        }
    ];

    const handleDownload = async (format: string, downloadOption: string): Promise<void> => {
        try {
            setIsLoading(true);
            setLoadingFormat(`${format}-${downloadOption}`);
            
            // Map to correct sheet name
            let sheetPrefix = '';
            if (activeTemplateType === 'Standard') {
                if (downloadOption === '.xlsx (Sentiment)') {
                    sheetPrefix = 'sentiment_std';
                } else if (downloadOption === '.xlsx (QA)') {
                    sheetPrefix = 'qna_std';
                }
            } else if (activeTemplateType === 'ICQA') {
                sheetPrefix = 'icqa';
            }

            const formatSuffix = format.toLowerCase().replace(/\s+/g, "_");
            const sheetName = `${sheetPrefix}_${formatSuffix}`;

            // Fetch and process Excel file
            const response = await fetch("/template_input.xlsx");
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

            if (!workbook.SheetNames.includes(sheetName)) {
                alert(`Template not found: ${sheetName}`);
                setIsLoading(false);
                setLoadingFormat(null);
                return;
            }

            // Create single-sheet workbook
            const newWorkbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(newWorkbook, workbook.Sheets[sheetName], sheetName);
            
            // Download file
            const outputData = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([outputData], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            
            const url = URL.createObjectURL(blob);
            let fileName = '';
            
            if (activeTemplateType === 'Standard') {
                fileName = `standard_${downloadOption.toLowerCase()}_${formatSuffix}.xlsx`;
            } else {
                fileName = `${activeTemplateType.toLowerCase()}_${formatSuffix}.xlsx`;
            }
            
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            link.click();
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error downloading template:", error);
            alert("Download failed. Please try again.");
        } finally {
            setIsLoading(false);
            setLoadingFormat(null);
        }
    };

    // Reset animation and change template type
    const handleTemplateTypeChange = (type: string) => {
        if (type !== activeTemplateType) {
            setIsAnimating(true);
            setActiveTemplateType(type);
            
            // Reset animation state after animation completes
            setTimeout(() => {
                setIsAnimating(false);
            }, 300);
        }
    };

    const currentTemplate = templates.find(t => t.type === activeTemplateType);

    return (
        <div className={styles.inputFormatContainer}>
            <h1 className={styles.formatTitle}>File Templates</h1>

            <div className={styles.templateTypes}>
                {templates.map((template) => (
                    <div
                        key={template.type}
                        className={`${styles.templateTypeButton} ${activeTemplateType === template.type ? styles.activeTemplateType : ''}`}
                        onClick={() => handleTemplateTypeChange(template.type)}
                    >
                        {template.type}
                    </div>
                ))}
            </div>

            <div className={`${styles.templatesGrid} ${isAnimating ? 'animating' : ''}`}>
                {currentTemplate?.formats.map((format) => (
                    <div key={format} className={styles.templateRow}>
                        <div className={styles.formatInfo}>
                            <div className={styles.fileIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#A2C1E0" />
                                </svg>
                            </div>
                            <span>{format}</span>
                        </div>
                        <div className={styles.downloadOptions}>
                            {currentTemplate?.downloadOptions.map((option) => {
                                const buttonKey = `${format}-${option}`;
                                const isButtonLoading = loadingFormat === buttonKey;
                                
                                return (
                                    <button
                                        key={option}
                                        className={styles.downloadButton}
                                        onClick={() => handleDownload(format, option)}
                                        disabled={isLoading}
                                    >
                                        {isButtonLoading ? <Spinner size="small" inline /> : option}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InputFormat;