// app/project/[id]/components/ScoreComparison/index.tsx
"use client";
import React, { useState, useEffect } from "react";
import styles from "./ScoreComparison.module.css";
import { FaArrowLeft } from "react-icons/fa";
import { ModelResultData, ModelSelection, TopicType } from "@/app/types";
import { ModelSelectionPanel } from "./ModelSelection";
import { ResultsVisualization } from "./ResultsVisualization";
import { FilterControls } from "./FilterControls";
import { fetchModelResults } from "./utils/dataFetchers";

const ScoreComparison: React.FC<{ projectId: string }> = ({ projectId }) => {
  // State variables 
  const [selectedModels, setSelectedModels] = useState<ModelSelection[]>([]);
  const [comparisonData, setComparisonData] = useState<ModelResultData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [projectType, setProjectType] = useState<'qa' | 'sentiment'>('qa');
  const [comparisonView] = useState<'byModel'>('byModel');
  const [selectedPerturbation, setSelectedPerturbation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModelSelection, setShowModelSelection] = useState<boolean>(true);
  const [activeCategories, setActiveCategories] = useState<(TopicType | 'Overall Score')[]>(['Overall Score']);
  const [availableCategories, setAvailableCategories] = useState<(TopicType | 'Overall Score')[]>(['Overall Score']);
  const [availablePerturbations, setAvailablePerturbations] = useState<string[]>([]);

  // Update available categories and perturbations when comparison data changes
  useEffect(() => {
    if (comparisonData.length > 0) {
      const categories = getAvailableCategories(comparisonData);
      setAvailableCategories(categories);
      if (activeCategories.length <= 1 && activeCategories.every(c => c === 'Overall Score')) {
        setActiveCategories(categories);
      }
      const perturbations = getAllPerturbationTypes(comparisonData);
      setAvailablePerturbations(perturbations);
    }
  }, [comparisonData, activeCategories]);

  // Helper functions
  const getAvailableCategories = (data: ModelResultData[]): (TopicType | 'Overall Score')[] => {
    if (!data.length) return ['Overall Score'];
    const categories = new Set(['Overall Score']);
    
    data.forEach(modelData => {
      if (modelData.results?.performance_score) {
        Object.keys(modelData.results.performance_score).forEach(key => {
          if (key !== 'overall_performance_score') {
            categories.add(key as TopicType);
          }
        });
      }

      if (modelData.results?.tests) {
        modelData.results.tests.forEach(test => {
          if (test.test_type) {
            categories.add(test.test_type as TopicType);
          }
        });
      }
    });

    return Array.from(categories) as (TopicType | 'Overall Score')[];
  };

  const getAllPerturbationTypes = (data: ModelResultData[]): string[] => {
    const types = new Set<string>();

    data.forEach(modelData => {
      if (modelData.results?.performance_score) {
        Object.keys(modelData.results.performance_score).forEach(key => {
          if (key !== 'overall_performance_score') {
            types.add(key);
          }
        });
      }
      if (modelData.results?.tests) {
        modelData.results.tests.forEach(test => {
          if (test.test_type) {
            types.add(test.test_type);
          }
        });
      }
    });

    return Array.from(types).sort();
  };

  // Event handlers
  const handleRemoveModel = (displayName: string) => {
    setSelectedModels(prev => prev.filter(m => m.displayName !== displayName));
  };

  const handleClearAll = () => {
    setSelectedModels([]);
    setComparisonData([]);
    setSelectedPerturbation(null);
    setError(null);
    setShowModelSelection(true);
  };

  const handleProjectTypeChange = (type: 'qa' | 'sentiment') => {
    if (type !== projectType) {
      setProjectType(type);
      setComparisonData([]);
      setSelectedPerturbation(null);
      setError(null);
      setShowModelSelection(true);
      setActiveCategories(['Overall Score']);
    }
  };

  const toggleCategory = (category: TopicType | 'Overall Score') => {
    setActiveCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleCompare = async () => {
    setLoading(true);
    setError(null);

    try {
      const perturbationArray = selectedPerturbation ? [selectedPerturbation] : undefined;
      const resultsArrays = await Promise.all(
        selectedModels.map(async (model) => {
          try {
            return await fetchModelResults(model, projectId, projectType, perturbationArray);
          } catch (error) {
            console.error(`Error fetching data for ${model.model}:`, error);
            return []; 
          }
        })
      );

      const allResults = resultsArrays.flat() as ModelResultData[];

      if (allResults.length === 0) {
        setError(`No data found for any of the selected models with project type: ${projectType}`);
        setComparisonData([]);
      } else {
        setComparisonData(allResults);
        setShowModelSelection(false);

        const modelsWithResults = resultsArrays.filter(results => results.length > 0).length;
        if (modelsWithResults < selectedModels.length) {
          setError(`Data only found for ${modelsWithResults} of ${selectedModels.length} selected models`);
        }
      }
    } catch (error) {
      console.error("Error during comparison:", error);
      setError(`Error comparing models: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleBack = () => {
    setShowModelSelection(true);
    setComparisonData([]);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Score Comparison</h2>

      {!showModelSelection && comparisonData.length > 0 && (
        <button className={styles.backButton} onClick={handleBack}>
          <FaArrowLeft /> Back to Model Selection
        </button>
      )}

      <FilterControls
        projectType={projectType}
        onProjectTypeChange={handleProjectTypeChange}
        error={error}
        showProjectType={showModelSelection}
      />

      <ModelSelectionPanel
        showModelSelection={showModelSelection}
        selectedModels={selectedModels}
        setSelectedModels={setSelectedModels}
        handleRemoveModel={handleRemoveModel}
        handleClearAll={handleClearAll}
        handleCompare={handleCompare}
        loading={loading}
        projectId={projectId}
      />

      {comparisonData.length > 0 && (
        <ResultsVisualization
          comparisonData={comparisonData}
          activeCategories={activeCategories}
          availableCategories={availableCategories}
          toggleCategory={toggleCategory}
        />
      )}
    </div>
  );
};

export default ScoreComparison;