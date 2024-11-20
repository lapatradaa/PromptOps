// MyProject.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import Link from 'next/link';
import styles from './MyProject.module.css';
import { FaFolder } from "react-icons/fa";
import { FiMoreVertical } from "react-icons/fi";

interface Project {
  id: number;
  name: string;
}

interface MyProjectProps {
  onProjectSelect?: (project: Project | null) => void;
}

export default function MyProject({ onProjectSelect }: MyProjectProps) {
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [lastClickedProject, setLastClickedProject] = useState<number | null>(null);

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

  const handleProjectClick = async (project: Project) => {
    const currentTime = new Date().getTime();
    
    if (lastClickedProject === project.id && currentTime - lastClickTime < 500) {
      // Use encodeURIComponent to handle special characters in the name
      const encodedName = encodeURIComponent(project.name);
      await router.push(`/project/${project.id}?name=${encodedName}`);
      setLastClickTime(0);
      setLastClickedProject(null);
    } else {
      // First click
      setSelectedProject(project);
      onProjectSelect?.(project);
      setLastClickTime(currentTime);
      setLastClickedProject(project.id);
    }
};

  // Reset click state if too much time has passed
  useEffect(() => {
    const timer = setTimeout(() => {
      if (lastClickTime > 0 && new Date().getTime() - lastClickTime > 500) {
        setLastClickTime(0);
        setLastClickedProject(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [lastClickTime]);

  return (
    <div className={styles.container}>
      <h2 className={styles.h2}>Recent Projects</h2>
      <div className={styles.recentContainer}>
        {recentProjects.map((project) => (
          <div 
            className={styles.folderIcon} 
            key={project.id}
            onClick={() => handleProjectClick(project)}
          >
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
        <div
          className={`${styles.projectContainer} 
            ${selectedProject?.id === project.id ? styles.selected : ''} 
            ${lastClickedProject === project.id ? styles.clicked : ''}`}
          key={project.id}
          onClick={() => handleProjectClick(project)}
        >
          <div className={styles.projectInfo}>
            <FaFolder />
            <p>{project.name}</p>
          </div>
          <FiMoreVertical />
        </div>
      ))}
    </div>
  );
}