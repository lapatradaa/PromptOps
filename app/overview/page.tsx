"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Project } from "@/app/types";
import { Toaster, toast } from 'react-hot-toast';
import styles from "./overview.module.css";
import MyProject from "./components/MyProject";
import NewProjectModal from "./components/NewProjectModal";
import Spinner from "../components/Spinner";
import { FaRegFolderOpen, FaSignOutAlt } from "react-icons/fa";
import { FcManager } from "react-icons/fc";
import { MdOutlineFilePresent } from "react-icons/md";
import { IoMdSettings } from "react-icons/io";
import { ProjectType, SystemPrompt } from "@/app/types";
import InputFormat from "./components/FileTemplates";

const Projects: React.FC = () => {
  const { data: session } = useSession();
  const menuItemRefs = useRef<Array<HTMLDivElement | null>>([]);

  // UI State
  const [activeMenu, setActiveMenu] = useState<string>("myProjects");
  const [indicatorPosition, setIndicatorPosition] = useState<number>(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Project State
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  // Project Search and Filter
  const getFilteredProjects = () => {
    if (!searchQuery.trim()) return projects;

    const lowercaseQuery = searchQuery.toLowerCase();
    return projects.filter((project) =>
      project.name.toLowerCase().includes(lowercaseQuery) ||
      project.type.toLowerCase().includes(lowercaseQuery) ||
      project.llm.toLowerCase().includes(lowercaseQuery)
    );
  };

  // API Handlers
  const fetchProjects = async () => {
    try {
      setIsProjectsLoading(true); // Set loading to true before fetch
      const response = await fetch("/api/projects");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch projects");
      }
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to fetch projects");
    } finally {
      setIsProjectsLoading(false); // Set loading to false after fetch completes
    }
  };

  const handleCreateProject = async (
    projectName: string,
    type: ProjectType,
    llm: string,
    url: string,
    apiKey: string,
    systemPrompt: SystemPrompt,
    modelProvider: string
  ) => {
    if (!session?.user) {
      toast.error("Please sign in to create a project");
      return;
    }

    try {
      setIsLoading(true);
      const loadingToast = toast.loading('Creating project...');

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName,
          type,
          llm,
          url,
          apiKey,
          systemPrompt,
          modelProvider,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      const newProject = await response.json();
      setProjects((prev) => [newProject, ...prev]);
      await fetchProjects();
      setIsModalOpen(false);
      toast.success('Project created successfully', { id: loadingToast });
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error('Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  // UI Event Handlers
  const handleMenuClick = (menu: string, index: number) => {
    setActiveMenu(menu);
    setIndicatorPosition(menuItemRefs.current[index]?.offsetTop || 0);
  };

  const handleSignOutClick = async () => {
    setIsLoading(true);
    try {
      const loadingToast = toast.loading('Signing out...');
      await signOut({
        redirect: true,
        callbackUrl: "/auth",
      });
      toast.success('Signed out successfully', { id: loadingToast });
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error('Failed to sign out');
      setIsLoading(false);
      setIsUserMenuOpen(false);
    }
  };

  // Effects
  useEffect(() => {
    if (session?.user?.id) {
      setUserId(session.user.id);
      fetchProjects();
    }
  }, [session]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(`.${styles.userProfileContainer}`)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    setIndicatorPosition(menuItemRefs.current[0]?.offsetTop || 0);
  }, []);

  // Render Components
  const renderSidebar = () => (
    <div className={styles.leftSection}>
      <header className={styles.leftHeader}>
        <div className={styles.iconContainer}>
          <img src="/icons/promptops_icon.svg" alt="PromptOps Icon" />
          <p>PromptOps</p>
        </div>
      </header>
      <main className={styles.leftMain}>
        <div
          className={styles.indicator}
          style={{ top: `${indicatorPosition + 8}px` }}
        />
        <div
          className={`${styles.menuItem} ${activeMenu === "myProjects" ? styles.active : ""}`}
          onClick={() => handleMenuClick("myProjects", 0)}
          ref={(el) => (menuItemRefs.current[0] = el)}
        >
          <FaRegFolderOpen />
          <p>My Projects</p>
        </div>
        <div
          className={`${styles.menuItem} ${activeMenu === "format" ? styles.active : ""}`}
          onClick={() => handleMenuClick("format", 1)}
          ref={(el) => (menuItemRefs.current[1] = el)}
        >
          <MdOutlineFilePresent />
          <p>File Templates</p>
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
          <span>{session?.user?.username || "User"}</span>
          {isUserMenuOpen && (
            <div className={styles.userMenu}>
              <button onClick={() => {
                console.log("Settings clicked");
                setIsUserMenuOpen(false);
              }}>
                <IoMdSettings />
                Settings
              </button>
              <button onClick={handleSignOutClick} disabled={isLoading}>
                <FaSignOutAlt />
                {isLoading ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );

  const renderMainContent = () => (
    <div className={styles.centerSection}>
      <header className={styles.centerHeader}>
        <input
          type="text"
          className={styles.searchBar}
          placeholder="Search project..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          className={styles.newProjectBtn}
          onClick={() => setIsModalOpen(true)}
        >
          + New Project
        </button>
      </header>
      <main className={styles.centerMain}>
        {activeMenu === "myProjects" && (
          isProjectsLoading ? (
            <Spinner />
          ) : (
            <MyProject
              onProjectSelect={setSelectedProject}
              projects={getFilteredProjects()}
              searchQuery={searchQuery}
              onRefresh={fetchProjects}
              isLoading={isProjectsLoading}
            />
          )
        )}
        {activeMenu === "format" && (
          <InputFormat />
        )}
      </main>
    </div>
  );

  return (
    <>
      <Toaster position="bottom-right" />
      <div className={styles.projects}>
        {renderSidebar()}
        {renderMainContent()}
        <NewProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateProject}
          userId={userId}
        />
      </div>
    </>
  );
};

export default Projects;