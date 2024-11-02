"use client";
import React, { useState, useRef, useEffect } from "react";
import { FaRegFolderOpen } from "react-icons/fa";
import { MdOutlineFilePresent } from "react-icons/md";
import styles from "./projects.module.css";
import MyProject from "../components/My-Project/my-project";
import InputFormat from "../components/Input-Format/input-format";

const Projects: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>('myProjects');
  const [indicatorPosition, setIndicatorPosition] = useState<number>(0);
  const menuItemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const handleMenuClick = (menu: string, index: number) => {
    setActiveMenu(menu);
    setIndicatorPosition(menuItemRefs.current[index]?.offsetTop || 0);
  };

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
          <div className={styles.menuContainer}>
            <div
              className={styles.indicator}
              style={{ top: `${indicatorPosition + 8}px` }}
            ></div>
            <h2 className={styles.h2}>Projects</h2>
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
      </div>
      <div className={styles.centerSection}>
        <header className={styles.centerHeader}>
          <input
            type="text"
            className={styles.searchBar}
            placeholder="Search here..."
          />
          <button className={styles.newProjectBtn}>+ New Project</button>
        </header>
        <main className={styles.centerMain}>
          {activeMenu === 'myProjects' && <MyProject />}
          {activeMenu === 'format' && <InputFormat />}
        </main>
      </div>
      <div className={styles.rightSection}>
        <header className={styles.rightHeader}>
          <p>Static History</p>
        </header>
      </div>
    </div>
  );
};

export default Projects;