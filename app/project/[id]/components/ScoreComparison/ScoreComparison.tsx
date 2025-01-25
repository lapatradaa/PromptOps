"use client";

import React, { useState } from "react";
import styles from "./ScoreComparison.module.css";

import { FaRegTrashAlt } from "react-icons/fa";

const ScoreComparison: React.FC = () => {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [dropdownState, setDropdownState] = useState<string | null>(null);

  const categories = {
    Gemini: ["Gemini 1.0 Pro", "Gemini 1.5 Flash", "Gemini 1.5 Pro"],
    GPT: ["GPT-3.5-turbo", "GPT-4", "GPT-4-turbo", "GPT-4o"],
    Claude: ["Claude 3 Opus", "Claude 3 Sonnet", "Claude 3.5 Haiku"],
    Llama: ["Llama 3.2 3B"],
  };

  const handleRemoveModel = (model: string) => {
    setSelectedModels((prev) => prev.filter((m) => m !== model));
  };

  const handleClearAll = () => {
    setSelectedModels([]);
  };

  const handleCompare = () => {
    console.log("Comparing models:", selectedModels);
  };

  const toggleDropdown = (model: string) => {
    setDropdownState((prev) => (prev === model ? null : model));
  };

  const handleOptionSelect = (model: string, option: string, format: string) => {
    const displayModel = `${model}\n${option} (${format})`; // Add \n explicitly
    if (!selectedModels.includes(displayModel)) {
      setSelectedModels((prev) => [...prev, displayModel]);
    }
    setDropdownState(null);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Score Comparison</h2>

      {/* Categories */}
      <div className={styles.categories}>
        {Object.entries(categories).map(([category, models]) => (
          <div key={category} className={styles.category}>
            <h3 className={styles.categoryTitle}>{category}</h3>
            <div className={styles.modelRow}>
              {models.map((model) => (
                <div key={model} className={styles.dropdownContainer}>
                  <button
                    className={`${styles.versionButton} ${selectedModels.some((m) => m.startsWith(model))
                      ? styles.selected
                      : ""
                      }`}
                    onClick={() => toggleDropdown(model)}
                  >
                    {model}
                  </button>
                  {dropdownState === model && (
                    <div className={styles.dropdownMenu}>
                      <button
                        className={styles.dropdownOption}
                        onClick={() => handleOptionSelect(model, "Zero Shot", "Standard Format")}
                      >
                        Zero Shot
                        <span className={styles.subText}>Standard Format</span>
                      </button>
                      <button
                        className={styles.dropdownOption} style={{ borderTop: "1px solid #ccc", borderBottom: "1px solid #ccc" }}
                        onClick={() => handleOptionSelect(model, "One Shot", "ICQA Format")}
                      >
                        One Shot
                        <span className={styles.subText}>ICQA Format</span>
                      </button>
                      <button
                        className={styles.dropdownOption}
                        onClick={() => handleOptionSelect(model, "Few Shot", "Chain-of-Thought")}
                      >
                        Few Shot
                        <span className={styles.subText}>Chain-of-Thought</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Models */}
      <div className={styles.selectedSection}>
        {/* Models Container */}
        <div className={styles.modelsContainer}>
          <div className={styles.selectedModels}>
            {selectedModels.map((model) => (
              <div key={model} className={styles.selectedModel}>
                <span style={{ whiteSpace: "pre-line" }}>
                  <strong>{model.split("\n")[0]}</strong>
                  <br />
                  {model.split("\n")[1]}
                </span>
                <button
                  className={styles.removeButton}
                  onClick={() => handleRemoveModel(model)}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons Section */}
        <div className={styles.compareActions}>
          {selectedModels.length > 0 && (
            <button className={styles.clearAllButton} onClick={handleClearAll}>
              <FaRegTrashAlt />
            </button>
          )}
          <button
            className={styles.compareButton}
            onClick={handleCompare}
            disabled={selectedModels.length === 0}
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScoreComparison;
