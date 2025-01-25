'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from "@/app/types";

import styles from './MyProject.module.css';

import { FaFolder } from "react-icons/fa";
import { FiMoreVertical } from "react-icons/fi";

interface MyProjectProps {
  onProjectSelect?: (project: Project | null) => void;
  projects: Project[];
}

export default function MyProject({ onProjectSelect, projects }: MyProjectProps) {
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [lastClickedProject, setLastClickedProject] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 3;
  const totalPages = Math.max(1, Math.ceil(projects.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProjects = projects.slice(startIndex, startIndex + itemsPerPage);
  const recentProjects = projects.slice(0, 3);

  const handlePrevious = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prevPage) => Math.min(prevPage + 1, totalPages));
  };

  const handleProjectClick = async (project: Project) => {
    const currentTime = new Date().getTime();

    if (lastClickedProject === project._id && currentTime - lastClickTime < 500) {
      const encodedName = encodeURIComponent(project.name);
      await router.push(`/project/${project._id}?name=${encodedName}`);
      setLastClickTime(0);
      setLastClickedProject(null);
    } else {
      setSelectedProject(project);
      onProjectSelect?.(project);
      setLastClickTime(currentTime);
      setLastClickedProject(project._id);
    }
  };

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
      {recentProjects.length > 0 || currentProjects.length > 0 ? (
        <>
          <h2 className={styles.h2}>Recent Projects</h2>
          <div className={styles.recentContainer}>
            {recentProjects.map((project) => (
              <div
                className={styles.folderIcon}
                key={project._id}
                onClick={() => handleProjectClick(project)}
              >
                <div className={styles.iconWithText}>
                  <svg xmlns="http://www.w3.org/2000/svg" className={styles.projectSvg} viewBox="0 0 48 48">
                    <path fill="#9947B5" d="M40 12H22l-4-4H8c-2.2 0-4 1.8-4 4v8h40v-4c0-2.2-1.8-4-4-4" />
                    <path fill="#BA5CDB" d="M40 12H8c-2.2 0-4 1.8-4 4v20c0 2.2 1.8 4 4 4h32c2.2 0 4-1.8 4-4V16c0-2.2-1.8-4-4-4" />
                    <text
                      x="8"
                      y="35"
                      fill="white"
                      fontSize="3"
                    >
                      {project.name.length > 20 ? `${project.name.slice(0, 20)}...` : project.name}
                    </text>
                  </svg>
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
                ${selectedProject?._id === project._id ? styles.selected : ''} 
                ${lastClickedProject === project._id ? styles.clicked : ''}`}
              key={project._id}
              onClick={() => handleProjectClick(project)}
            >
              <div className={styles.projectInfo}>
                <FaFolder />
                <p>{project.name}</p>
              </div>
              <FiMoreVertical />
            </div>
          ))}
        </>
      ) : (
        <div className={styles.emptyState}>
          <p>No projects found. Create a new project to get started!</p>
        </div>
      )}
    </div>
  );
}