"use client";

import React, { useState, useRef, useEffect } from "react";
import { FaRegFolderOpen } from "react-icons/fa";
// import { FiSearch } from "react-icons/fi";
import { MdOutlineFilePresent } from "react-icons/md";
import "./projects.css";
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
    <div className="projects">
      <div className="left-section">
        <header>
          <div className='iconContainer'>
            <img src="/icons/promptops_icon.svg" alt="PromptOps Icon"></img>
            <p>PromptOps</p>
          </div>
        </header>
        <main>
          <div className={`menuContainer`}>
            <div
              className="indicator"
              style={{ top: `${indicatorPosition + 8}px` }}
            ></div>
            <h2>Projects</h2>
            <div
              className={`menuItem ${activeMenu === 'myProjects' ? 'active' : ''}`}
              onClick={() => handleMenuClick('myProjects', 0)}
              ref={(el) => (menuItemRefs.current[0] = el)}
            >
              <FaRegFolderOpen />
              <p>My Projects</p>
            </div>
            <div
              className={`menuItem ${activeMenu === 'format' ? 'active' : ''}`}
              onClick={() => handleMenuClick('format', 1)}
              ref={(el) => (menuItemRefs.current[1] = el)}
            >
              <MdOutlineFilePresent />
              <p>Input Format</p>
            </div>
          </div>
        </main>
      </div>
      <div className="center-section">
        <header>
          <input
            type="text"
            className="search-bar"
            placeholder="Search here..."
          />
          <button>+ New Project</button>
        </header>
        <main>
          {activeMenu === 'myProjects' && <MyProject />}
          {activeMenu === 'format' && <InputFormat />}
        </main>
      </div>
      <div className="right-section">
        <header>
          <p>Static History</p>
        </header>
      </div>
    </div>
  );
};

export default Projects;
