"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Project } from "@/app/types";

import styles from "./overview.module.css";

import MyProject from "../components/MyProject/MyProject";
import NewProjectModal from "../components/NewProjectModal";

import { FaRegFolderOpen, FaSignOutAlt } from "react-icons/fa";
import { FcManager } from "react-icons/fc";
import { MdOutlineFilePresent } from "react-icons/md";
import { IoMdSettings } from "react-icons/io";

const Projects: React.FC = () => {
  const { data: session } = useSession();
  const [activeMenu, setActiveMenu] = useState<string>("myProjects");
  const [indicatorPosition, setIndicatorPosition] = useState<number>(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const menuItemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const handleCreateProject = async (
    projectName: string,
    type: string,
    llm: string,
    apiKey: string,
    systemContent: {
      type: "qa" | "none" | "custom";
      content?: string;
    }
  ) => {
    if (!session?.user) {
      console.error("User is not logged in");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName,
          type,
          llm,
          apiKey,
          systemContent,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      // After creating the project, fetch the updated list
      const newProject = await response.json();
      setProjects((prev) => [newProject, ...prev]);

      // Optionally, fetch the latest list from the server
      await fetchProjects();

      setIsModalOpen(false); // Close modal after success
    } catch (error) {
      console.error("Error creating project:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) {
        // Parse error message from the API response
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch projects");
      }
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  // Call fetchProjects when the session is ready
  useEffect(() => {
    if (session?.user?.id) {
      fetchProjects();
    }
  }, [session]);

  const handleMenuClick = (menu: string, index: number) => {
    setActiveMenu(menu);
    setIndicatorPosition(menuItemRefs.current[index]?.offsetTop || 0);
  };

  const handleProjectSelect = (project: Project | null) => {
    setSelectedProject(project);
  };

  const handleSettingsClick = () => {
    console.log("Settings clicked");
    setIsUserMenuOpen(false);
  };

  const handleSignOutClick = async () => {
    setIsLoading(true);
    try {
      await signOut({
        redirect: true,
        callbackUrl: "/auth", // Redirect to sign-in page
      });
    } catch (error) {
      // Only handle errors and reset states if the redirect fails
      console.error("Sign out error:", error);
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

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    setIndicatorPosition(menuItemRefs.current[0]?.offsetTop || 0);
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      setUserId(session.user.id);
    }
  }, [session]);

  return (
    <div className={styles.projects}>
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
          ></div>
          <h2 className={styles.h2} style={{ letterSpacing: "2px" }}>
            Projects
          </h2>
          <div
            className={`${styles.menuItem} ${activeMenu === "myProjects" ? styles.active : ""
              }`}
            onClick={() => handleMenuClick("myProjects", 0)}
            ref={(el) => (menuItemRefs.current[0] = el)}
          >
            <FaRegFolderOpen />
            <p>My Projects</p>
          </div>
          <div
            className={`${styles.menuItem} ${activeMenu === "format" ? styles.active : ""
              }`}
            onClick={() => handleMenuClick("format", 1)}
            ref={(el) => (menuItemRefs.current[1] = el)}
          >
            <MdOutlineFilePresent />
            <p>Input Format</p>
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
                <button onClick={handleSettingsClick}>
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
      <div className={styles.centerSection}>
        <header className={styles.centerHeader}>
          <input
            type="text"
            className={styles.searchBar}
            placeholder="Search here..."
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
            <MyProject onProjectSelect={handleProjectSelect} projects={projects} />
          )}
        </main>
      </div>
      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProject}
        userId={userId}
      />
      <div className={styles.rightSection}>
        <header className={styles.rightHeader}>
          <p className={styles.historyTitle}>Static History</p>
        </header>
        <main className={styles.rightMain}>
          {!selectedProject ? (
            <p className={styles.emptyMessage}>
              Tap any project to see a static history!
            </p>
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
