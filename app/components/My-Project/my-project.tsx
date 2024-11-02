import React, { useState } from 'react';
import styles from './my-project.module.css';
import { FaFolder } from "react-icons/fa";
import { FiMoreVertical } from "react-icons/fi";

const MyProject = () => {
  const projects = [
    { id: 1, name: 'Project A' },
    { id: 2, name: 'Project B' },
    { id: 3, name: 'Project C' },
    { id: 4, name: 'Project D' },
    { id: 5, name: 'Project E' },
    { id: 6, name: 'Project F' },
    { id: 7, name: 'Project G' },
    { id: 8, name: 'Project H' },
  ];

  const recentProjects = projects.slice(0, 3);
  const itemsPerPage = 3;
  const [currentPage, setCurrentPage] = useState(1);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProjects = projects.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(projects.length / itemsPerPage);

  const handlePrevious = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prevPage) => Math.min(prevPage + 1, totalPages));
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.h2}>Recent Projects</h2>
      <div className={styles.recentContainer}>
        {recentProjects.map((project) => (
          <div className={styles.folderIcon} key={project.id}>
            <div className={styles.iconWithText}>
              <svg xmlns="http://www.w3.org/2000/svg" width="300px" height="300px" viewBox="0 0 48 48">
                <path fill="#9947B5" d="M40 12H22l-4-4H8c-2.2 0-4 1.8-4 4v8h40v-4c0-2.2-1.8-4-4-4" />
                <path fill="#BA5CDB" d="M40 12H8c-2.2 0-4 1.8-4 4v20c0 2.2 1.8 4 4 4h32c2.2 0 4-1.8 4-4V16c0-2.2-1.8-4-4-4" />
              </svg>
              <span className={styles.iconText}>{project.name}</span>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.allProjects}>
        <h2 className={styles.h2}>All Projects</h2>
        <div className={styles.pagination}>
          <button onClick={handlePrevious} disabled={currentPage === 1}>
            <p>&lt;</p>
          </button>
          <span>{currentPage} / {totalPages}</span>
          <button onClick={handleNext} disabled={currentPage === totalPages}>
            <p>&gt;</p>
          </button>
        </div>
      </div>
      {currentProjects.map((project) => (
        <div className={styles.projectContainer} key={project.id}>
          <div className={styles.projectInfo}>
            <FaFolder />
            <p>{project.name}</p>
          </div>
          <FiMoreVertical />
        </div>
      ))}
    </div>
  );
};

export default MyProject;