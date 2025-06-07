// app/project/[id]/components/ScoreComparison/ModelSelection.tsx
import React, { useState, useEffect, useRef } from "react";
import styles from "./ScoreComparison.module.css";
import { FaRegTrashAlt, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { ModelSelection, ShotType, TestCaseFormat, MODEL_OPTIONS } from "@/app/types";

interface ModelSelectionPanelProps {
    showModelSelection: boolean;
    selectedModels: ModelSelection[];
    setSelectedModels: React.Dispatch<React.SetStateAction<ModelSelection[]>>;
    handleRemoveModel: (displayName: string) => void;
    handleClearAll: () => void;
    handleCompare: () => void;
    loading: boolean;
    projectId: string;
}

const FORMAT_OPTIONS: TestCaseFormat[] = ["ICQA Format", "Standard"];
const SHOT_OPTIONS: ShotType[] = ["Zero Shot", "One Shot", "Few Shot"];

export const ModelSelectionPanel: React.FC<ModelSelectionPanelProps> = ({
    showModelSelection,
    selectedModels,
    setSelectedModels,
    handleRemoveModel,
    handleClearAll,
    handleCompare,
    loading,
    projectId,
}) => {
    const [dropdownState, setDropdownState] = useState<string | null>(null);
    const [customModelNames, setCustomModelNames] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
        Object.keys(MODEL_OPTIONS).reduce((acc, category) => ({ ...acc, [category]: true }), {})
    );

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Effect to fetch custom model names
    useEffect(() => {
        const fetchCustomModels = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/projects/${projectId}/custom-models`);
                if (response.ok) {
                    const data = await response.json();
                    setCustomModelNames(data.customModels || []);
                }
            } catch (error) {
                console.error("Error fetching custom models:", error);
                setCustomModelNames([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCustomModels();
    }, [projectId]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownState(null);
            }
        }

        if (dropdownState !== null) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownState]);

    const toggleDropdown = (modelId: string, event: React.MouseEvent) => {
        const button = event.currentTarget as HTMLElement;
        const buttonRect = button.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const spaceBelow = windowHeight - buttonRect.bottom;
        const needsUpwardPosition = spaceBelow < 320;

        setDropdownState((prev) => {
            if (prev === modelId) return null;
            return modelId;
        });

        if (needsUpwardPosition) {
            button.dataset.dropPosition = "up";
        } else {
            button.dataset.dropPosition = "down";
        }
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const handleOptionSelect = (
        modelValue: string,
        modelLabel: string,
        modelProvider: string,
        format: TestCaseFormat,
        option: ShotType
    ) => {
        const displayName = `${modelLabel}\n${option} (${format})`;

        if (!selectedModels.some(m => m.displayName === displayName)) {
            setSelectedModels((prev) => [...prev, {
                model: modelValue,
                modelDisplay: modelLabel,
                provider: modelProvider,
                option,
                format,
                displayName
            }]);
        }

        setDropdownState(null);
    };

    const renderDropdownContent = (
        modelValue: string,
        modelLabel: string,
        modelProvider: string
    ) => (
        <table className={styles.optionsTable}>
            <thead>
                <tr>
                    <th></th>
                    {SHOT_OPTIONS.map(shot => (
                        <th key={shot} className={styles.tableHeader}>{shot}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {FORMAT_OPTIONS.map(format => (
                    <tr key={format}>
                        <td className={styles.formatCell}>{format}</td>
                        {SHOT_OPTIONS.map(shot => (
                            <td key={`${format}-${shot}`}>
                                <button
                                    className={styles.tableOption}
                                    onClick={() => handleOptionSelect(
                                        modelValue,
                                        modelLabel,
                                        modelProvider,
                                        format,
                                        shot
                                    )}
                                >
                                    Select
                                </button>
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );

    // Create custom model options for the Other category
    const getCustomModelOptions = () => {
        return customModelNames.map(name => ({
            value: name,
            label: name,
            modelProvider: 'custom'
        }));
    };

    // Get custom model options
    const customModelOptions = getCustomModelOptions();

    return (
        <>
            {/* Model Selection Area */}
            <div className={`${styles.modelSelectionArea} ${showModelSelection ? '' : styles.hidden}`}>
                <div className={styles.categories}>
                    {Object.entries(MODEL_OPTIONS).map(([category, models]) => {
                        // Skip rendering the "Other" category if no custom models
                        if (category === 'Other' && customModelNames.length === 0) {
                            return null;
                        }

                        // For "Other" category, use custom model names instead
                        let displayModels = models;
                        if (category === 'Other' && customModelNames.length > 0) {
                            displayModels = customModelOptions;
                        }

                        return (
                            <div key={category} className={styles.category}>
                                <button
                                    className={styles.categoryHeader}
                                    onClick={() => toggleCategory(category)}
                                >
                                    <h3 className={styles.categoryTitle}>
                                        {category}
                                    </h3>
                                    {expandedCategories[category] ?
                                        <FaChevronUp className={styles.toggleIcon} /> :
                                        <FaChevronDown className={styles.toggleIcon} />
                                    }
                                </button>
                                {expandedCategories[category] && (
                                    <div className={styles.modelRow}>
                                        {displayModels.map((model, index) => (
                                            <div
                                                key={`${model.value}-${index}`}
                                                className={styles.dropdownContainer}
                                                ref={dropdownState === model.value ? dropdownRef : null}
                                            >
                                                <button
                                                    className={`${styles.versionButton} ${selectedModels.some((m) => m.model === model.value)
                                                            ? styles.selected : ""
                                                        }`}
                                                    onClick={(e) => toggleDropdown(model.value, e)}
                                                >
                                                    {model.label}
                                                </button>
                                                {dropdownState === model.value && (
                                                    <div className={`${styles.dropdownMenu} ${document.querySelector(`[data-drop-position="up"]`)
                                                            ? styles.dropdownMenuUp : ''
                                                        }`}>
                                                        {renderDropdownContent(
                                                            model.value,
                                                            model.label,
                                                            model.modelProvider
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Selected Models Section */}
            {showModelSelection && (
                <div className={styles.selectedSection}>
                    <div className={styles.modelsContainer}>
                        <div className={styles.selectedModels}>
                            {selectedModels.map((model, index) => (
                                <div
                                    key={`${model.displayName}-${index}`}
                                    className={styles.selectedModel}
                                    style={{
                                        borderLeft: `4px solid`
                                    }}
                                >
                                    <span style={{ whiteSpace: "pre-line" }}>
                                        <strong>{model.modelDisplay || model.model}</strong>
                                        <br />
                                        {model.format} ({model.option})
                                    </span>
                                    <button
                                        className={styles.removeButton}
                                        onClick={() => handleRemoveModel(model.displayName)}
                                        aria-label={`Remove ${model.modelDisplay || model.model}`}
                                    >
                                        X
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.compareActions}>
                        {selectedModels.length > 0 && (
                            <button
                                className={styles.clearAllButton}
                                onClick={handleClearAll}
                                aria-label="Clear all models"
                            >
                                <FaRegTrashAlt />
                            </button>
                        )}
                        <button
                            className={styles.compareButton}
                            onClick={handleCompare}
                            disabled={selectedModels.length === 0 || loading}
                        >
                            {loading ? "Loading..." : "Compare"}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};