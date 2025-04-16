'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from "@/app/types";
import styles from './MyProject.module.css';
import { FaEdit, FaFolder, FaTrash } from "react-icons/fa";
import { FiMoreVertical } from "react-icons/fi";
import toast from 'react-hot-toast';

interface MyProjectProps {
  onProjectSelect?: (project: Project | null) => void;
  projects: Project[];
  searchQuery?: string;
  onRefresh: () => Promise<void>;
  isLoading?: boolean;
}

export default function MyProject({ onProjectSelect, projects, searchQuery = '', onRefresh, isLoading = false }: MyProjectProps) {
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [lastClickedProject, setLastClickedProject] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number; projectId: string | null }>({ x: 0, y: 0, projectId: null });
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const itemsPerPage = 3;

  // Get recent projects based on lastAccessedAt
  const recentProjects = projects
    .filter(project => project.lastAccessedAt)
    .sort((a, b) => {
      const dateA = new Date(a.lastAccessedAt || 0).getTime();
      const dateB = new Date(b.lastAccessedAt || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 3);

  // Get all other projects for pagination
  const totalPages = Math.max(1, Math.ceil(projects.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProjects = projects.slice(startIndex, startIndex + itemsPerPage);

  const updateProjectAccess = async (projectId: string) => {
    try {
      await fetch(`/api/projects/access/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error updating project access:', error);
    }
  };

  const handleProjectClick = async (project: Project) => {
    const currentTime = new Date().getTime();

    // Update access time for the project
    await updateProjectAccess(project._id);

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

  const handleMenuClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation(); // Prevent project click event
    const rect = e.currentTarget.getBoundingClientRect();

    // Toggle menu if clicking on the same project
    if (menuPosition.projectId === projectId) {
      setMenuPosition({ x: 0, y: 0, projectId: null });
      return;
    }

    // Get viewport dimensions
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Menu dimensions (adjust based on actual size)
    const menuHeight = 100;
    const menuWidth = 180;

    // Available space calculations
    const bottomSpace = viewportHeight - rect.bottom;
    const rightSpace = viewportWidth - rect.right;

    // Determine optimal position
    let positionY, positionX;

    // Y-axis positioning
    if (bottomSpace < menuHeight && rect.top > menuHeight) {
      // Place above if not enough space below but enough space above
      positionY = rect.top - menuHeight;
    } else {
      // Otherwise place below with adjustment if needed
      positionY = Math.min(rect.bottom, viewportHeight - menuHeight - 10);
    }

    // X-axis positioning
    if (rightSpace < menuWidth) {
      // Align to right edge if close to right viewport edge
      positionX = viewportWidth - menuWidth - 10;
    } else {
      // Otherwise align with the button
      positionX = rect.left;
    }

    setMenuPosition({
      x: positionX,
      y: positionY,
      projectId: projectId
    });
  };

  const handleEditClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setIsEditing(project._id);
    setEditName(project.name);
    setMenuPosition({ x: 0, y: 0, projectId: null });
  };

  const handleDeleteClick = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        setIsDeleting(true); // Set deleting state to true
        const loadingToast = toast.loading('Deleting project...');
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          await onRefresh(); // Refresh projects after successful deletion
          toast.success('Project deleted successfully', { id: loadingToast });
        } else {
          throw new Error('Failed to delete project');
        }
      } catch (error) {
        console.error('Error deleting project:', error);
        toast.error('Failed to delete project');
      } finally {
        setIsDeleting(false); // Reset deleting state
      }
    }
    setMenuPosition({ x: 0, y: 0, projectId: null });
  };

  const handleSaveEdit = async (projectId: string) => {
    if (!editName.trim()) {
      toast.error('Project name cannot be empty');
      return;
    }

    try {
      const loadingToast = toast.loading('Updating project name...');
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project name');
      }

      await onRefresh(); // Refresh projects after successful update
      toast.success('Project name updated successfully', { id: loadingToast });
      setIsEditing(null);
    } catch (error) {
      console.error('Error updating project name:', error);
      toast.error('Failed to update project name');
    }
  };

  // Add click outside handler to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuPosition.projectId && !(event.target as Element).closest(`.${styles.contextMenu}`) &&
        !(event.target as Element).closest(`.${styles.menuIcon}`)) {
        setMenuPosition({ x: 0, y: 0, projectId: null });
      }
    };

    // Handle window resize to close menu
    const handleResize = () => {
      if (menuPosition.projectId) {
        setMenuPosition({ x: 0, y: 0, projectId: null });
      }
    };

    // Handle scroll to close menu
    const handleScroll = () => {
      if (menuPosition.projectId) {
        setMenuPosition({ x: 0, y: 0, projectId: null });
      }
    };

    document.addEventListener('click', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [menuPosition.projectId]);

  // Reset pagination when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (lastClickTime > 0 && new Date().getTime() - lastClickTime > 500) {
        setLastClickTime(0);
        setLastClickedProject(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [lastClickTime]);

  const handlePrevious = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prevPage) => Math.min(prevPage + 1, totalPages));
  };

  // Highlight matching text in project name
  const highlightMatch = (text: string) => {
    if (!searchQuery) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ?
        <span key={i} className={styles.highlight}>{part}</span> : part
    );
  };

  // Render loading spinner
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}>
          <div className={styles.spinnerCircle}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {(recentProjects.length > 0 || currentProjects.length > 0) ? (
        <>
          {!searchQuery && recentProjects.length > 0 && (
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
                        <text x="8" y="35" fill="white" fontSize="3">
                          {project.name.length > 20 ? `${project.name.slice(0, 20)}...` : project.name}
                        </text>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className={styles.allProjects}>
            <h2 className={styles.h2}>{searchQuery ? 'Search Results' : 'All Projects'}</h2>
            {projects.length > itemsPerPage && (
              <div className={styles.pagination}>
                <button onClick={handlePrevious} disabled={currentPage === 1}>
                  <p>&lt;</p>
                </button>
                <span>{currentPage} / {totalPages}</span>
                <button onClick={handleNext} disabled={currentPage === totalPages}>
                  <p>&gt;</p>
                </button>
              </div>
            )}
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
                {isEditing === project._id ? (
                  <div className={styles.editContainer} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={styles.editInput}
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(project._id)}
                      className={styles.saveButton}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(null)}
                      className={styles.cancelButton}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p>{highlightMatch(project.name)}</p>
                )}
              </div>
              <div className={styles.menuContainer}>
                <FiMoreVertical
                  onClick={(e) => handleMenuClick(e, project._id)}
                  className={styles.menuIcon}
                />
                {menuPosition.projectId === project._id && (
                  <div
                    className={styles.contextMenu}
                    style={{
                      position: 'fixed',
                      top: menuPosition.y,
                      left: menuPosition.x,
                      maxHeight: '200px', // Limit maximum height
                      overflowY: 'auto',
                      zIndex: 1050
                    }}
                  >
                    <button
                      onClick={(e) => handleEditClick(e, project)}
                      className={styles.menuItem}
                      disabled={isDeleting}
                    >
                      <FaEdit style={{ width: "22px", height: "22px" }} /> Edit Name
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, project._id)}
                      className={styles.menuItem}
                      disabled={isDeleting}
                    >
                      <FaTrash style={{ width: "22px", height: "22px" }} />
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className={styles.emptyState}>
          <p>{searchQuery ? 'No matching projects found.' : 'No projects found. Create a new project to get started!'}</p>
        </div>
      )}
    </div>
  );
}