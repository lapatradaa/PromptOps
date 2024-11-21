"use client";
import React, { useState, useRef, useEffect } from "react";
import { FaRegFolderOpen, FaSignOutAlt } from "react-icons/fa";
import { FcManager } from "react-icons/fc";
import { MdOutlineFilePresent } from "react-icons/md";
import { IoMdSettings } from "react-icons/io";
import styles from "./overview.module.css";
import MyProject from "../components/MyProject/MyProject";
import NewProjectModal from "../components/NewProjectModal/NewProjectModal";
// import { useRouter } from "next/router";

interface Project {
  id: number;
  name: string;
}

const Projects: React.FC = () => {
  // const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<string | null>('myProjects');
  const [indicatorPosition, setIndicatorPosition] = useState<number>(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const menuItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateProject = (projectName: string) => {
    console.log('Next Process Creating project:', projectName);
  };

  const handleMenuClick = (menu: string, index: number) => {
    setActiveMenu(menu);
    setIndicatorPosition(menuItemRefs.current[index]?.offsetTop || 0);
  };

  const handleProjectSelect = (project: Project | null) => {
    setSelectedProject(project);
  };

  const handleSettingsClick = () => {
    console.log('Settings clicked');
    setIsUserMenuOpen(false);
  };

  const handleSignOutClick = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to sign out');
      }

      // Redirect to auth page
      // router.replace('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
      // Optionally show error to user
    } finally {
      setIsLoading(false);
      setIsUserMenuOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(`.${styles.userProfileContainer}`)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    setIndicatorPosition(menuItemRefs.current[0]?.offsetTop || 0);
  }, []);

  return (
    <div className={styles.projects}>
      <div className={styles.leftSection}>
        <header className={styles.leftHeader}>
          <div className={styles.iconContainer}>
            <img src="/icons/promptops_icon.svg" alt="PromptOps Icon" />
            <p>PromptOps</p>
          </div>
        </header>
        <main>
          <div className={styles.leftMain}>
            <div
              className={styles.indicator}
              style={{ top: `${indicatorPosition + 8}px` }}
            ></div>
            <h2 className={styles.h2} style={{ letterSpacing: '2px' }}>Projects</h2>
            <div
              className={`${styles.menuItem} ${activeMenu === 'myProjects' ? styles.active : ''}`}
              onClick={() => handleMenuClick('myProjects', 0)}
              ref={(el) => (menuItemRefs.current[0] = el)}
            >
              <FaRegFolderOpen />
              <p>My Projects</p>
            </div>
            <div
              className={`${styles.menuItem} ${activeMenu === 'format' ? styles.active : ''}`}
              onClick={() => handleMenuClick('format', 1)}
              ref={(el) => (menuItemRefs.current[1] = el)}
            >
              <MdOutlineFilePresent />
              <p>Input Format</p>
            </div>
          </div>
        </main>
        <footer className={styles.leftFooter}>
          <div
            className={styles.userProfileContainer}
            onClick={(e) => {
              e.stopPropagation();
              setIsUserMenuOpen(!isUserMenuOpen);
            }}
          >
            <FcManager />
            <span>Name</span>
            {isUserMenuOpen && (
              <div className={styles.userMenu}>
                <button onClick={handleSettingsClick}>
                  <IoMdSettings />
                  Settings
                </button>
                <button onClick={handleSignOutClick} disabled={isLoading}>
                  <FaSignOutAlt />
                  {isLoading ? 'Signing out...' : 'Sign Out'}
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </footer>
      </div>
      <div className={styles.centerSection}>
        <header className={styles.centerHeader}>
          <input
            type="text"
            className={styles.searchBar}
            placeholder="Search here..."
          />
          <button className={styles.newProjectBtn} onClick={() => setIsModalOpen(true)}>+ New Project</button>
        </header>
        <main className={styles.centerMain}>
          {activeMenu === 'myProjects' && <MyProject onProjectSelect={handleProjectSelect} />}
          {/* {activeMenu === 'format' && <InputFormat />} */}
        </main>
      </div>
      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProject}
      />
      <div className={styles.rightSection}>
        <header className={styles.rightHeader}>
          <p className={styles.historyTitle}>Static History</p>
        </header>
        <main className={styles.rightMain}>
          {!selectedProject ? (
            <p className={styles.emptyMessage}>Tap any project to see a static history!</p>
          ) : (
            <div className={styles.historyContent}>
              <p>History for {selectedProject.name}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Projects;