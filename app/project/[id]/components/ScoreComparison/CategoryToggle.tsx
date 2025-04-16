// /ScoreComparison/CategoryToggle.tsx
import React from "react";
import styles from "./ScoreComparison.module.css";
import { TopicType } from "@/app/types";
import { getPerturbationDisplayName } from "./utils/nameMappers";

interface CategoryToggleProps {
  activeCategories: (TopicType | 'Overall Score')[];
  availableCategories: (TopicType | 'Overall Score')[];
  toggleCategory: (category: TopicType | 'Overall Score') => void;
}

export const CategoryToggle: React.FC<CategoryToggleProps> = ({
  activeCategories,
  availableCategories,
  toggleCategory,
}) => {
  return (
    <div className={styles.categoryToggle}>
      {/* Overall category first */}
      <button
        className={`${styles.categoryButton} ${activeCategories.includes('Overall Score') ? styles.activeCategory : ''}`}
        onClick={() => toggleCategory('Overall Score')}
      >
        Overall Score
      </button>
      
      {/* Divider */}
      <div className={styles.categoryDivider}></div>
      
      {/* Available perturbation types */}
      {availableCategories
        .filter(cat => cat !== 'Overall Score')
        .sort()
        .map(category => (
          <button
            key={category}
            className={`${styles.categoryButton} ${activeCategories.includes(category) ? styles.activeCategory : ''}`}
            onClick={() => toggleCategory(category)}
          >
            {getPerturbationDisplayName(category)}
          </button>
        ))
      }
    </div>
  );
};