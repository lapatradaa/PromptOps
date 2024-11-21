// app/project/[id]/page.tsx
"use client"

import { RiStopCircleFill, RiPlayCircleFill, RiOrganizationChart } from "react-icons/ri";
import { FaAngleLeft, FaBrain } from 'react-icons/fa';
import { GrFormClose } from "react-icons/gr";
import { MdStackedBarChart } from 'react-icons/md';
import { FiSearch } from 'react-icons/fi';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DndProvider, useDragLayer } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import ProjectBoard from '@/app/components/ProjectBoard/ProjectBoard';
import TestSetup from '@/app/components/TestSetup/TestSetup';
import styles from './project.module.css';
import TestCase from "@/app/components/TestCase/TestCase";
import LLMSetting from "@/app/components/LLMSetting/LLMSetting";

type MenuType = 'options' | 'llm' | 'chart' | 'dashboard' | null;

// DragLayerMonitor component
const DragLayerMonitor = ({ onDragChange }: { onDragChange: (isDragging: boolean) => void }) => {
    useDragLayer((monitor) => {
        const isDragging = monitor.isDragging() && monitor.getItemType() === 'PLACED_BLOCK';
        onDragChange(isDragging);
        return { isDragging };
    });
    return null;
};

// Main ProjectPage component
const ProjectPage = () => {
    const searchParams = useSearchParams();
    const [activeMenu, setActiveMenu] = useState<MenuType>(null);
    const [activeTab, setActiveTab] = useState<string | null>('Setup');
    const [openMenuItem, setOpenMenuItem] = useState<string | null>(null);
    const [isDraggingBlock, setIsDraggingBlock] = useState(false);

    const projectName = decodeURIComponent(searchParams.get('name') || 'Untitled Project');

    const menuOptions = [
        {
            id: 'options' as MenuType,
            icon: <RiOrganizationChart />,
            className: styles.optionsMenu
        },
        {
            id: 'llm' as MenuType,
            icon: <FaBrain />,
            className: styles.llmMenu
        },
        {
            id: 'chart' as MenuType,
            icon: <MdStackedBarChart />,
            className: styles.chartMenu
        }
    ];

    const handleMenuItemClick = (item: string) => {
        setOpenMenuItem(openMenuItem === item ? null : item);
    };

    const handleMenuClick = (menuId: MenuType) => {
        if (activeMenu === menuId) {
            setActiveMenu(null);
        } else {
            setActiveMenu(menuId);
        }
    };

    const handleDashboardClick = useCallback(() => {
        setActiveMenu('dashboard');
    }, []);

    const renderContent = () => {
        switch (activeMenu) {
            case 'llm':
                return <LLMSetting />;
            case 'chart':
                return <div>Chart Content</div>;
            case 'dashboard':
            case 'options':
            case null:
            default:
                return (
                    <div className={styles.contentWrapper}>
                        <div className={styles.boardContainer}>
                            <ProjectBoard onDashboardClick={handleDashboardClick} />
                        </div>
                        {activeMenu === 'dashboard' && (
                            <div className={styles.dashboardSidebar}>
                                <div className={styles.dashboardHeader}>
                                    <h2>Visualize Dashboard</h2>
                                    <button
                                        className={styles.closeButton}
                                        onClick={() => setActiveMenu(null)}
                                    >
                                        <GrFormClose />
                                    </button>
                                </div>
                                <div className={styles.dashboardContent}>
                                    
                                </div>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <DragLayerMonitor onDragChange={setIsDraggingBlock} />
            <div className={styles.pageContainer}>
                <svg width="0" height="0" style={{ position: 'absolute' }}>
                    <defs>
                        <linearGradient id="buttonGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#BA5CDB" />
                            <stop offset="100%" stopColor="#42A7F1" />
                        </linearGradient>
                    </defs>
                </svg>

                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <div className={styles.backLinkContainer}>
                            <Link href="/overview" className={styles.backLink}>
                                <span className={styles.backIcon}>
                                    <FaAngleLeft />
                                </span>
                            </Link>
                        </div>
                    </div>
                    <div className={styles.headerCenter}>
                        <h1 className={styles.title}>{projectName}</h1>
                    </div>
                    <div className={styles.headerRight}>
                        <span className={styles.pauseButton}>
                            <RiStopCircleFill />
                        </span>
                        <span className={styles.playButton}>
                            <RiPlayCircleFill />
                        </span>
                    </div>
                </header>

                <div className={styles.mainGrid}>
                    <div className={styles.leftSidebar}>
                        {menuOptions.map((option) => (
                            <span
                                key={option.id}
                                className={`${option.className} ${activeMenu === option.id ? styles.active : ''}`}
                                onClick={() => handleMenuClick(option.id)}
                            >
                                {option.icon}
                            </span>
                        ))}
                    </div>

                    <div className={`${styles.secondarySidebar} ${activeMenu === 'options' ? styles.show : ''}`}>
                        <div className={styles.searchContainer}>
                            <FiSearch />
                            <input
                                type="text"
                                placeholder="Search..."
                                className={styles.searchInput}
                            />
                        </div>

                        <div className={styles.tabContainer}>
                            <div
                                className={`${styles.tab} ${activeTab === 'Setup' ? styles.active : ''}`}
                                onClick={() => setActiveTab(activeTab === 'Setup' ? null : 'Setup')}
                            >
                                Test Setup
                            </div>
                            <div
                                className={`${styles.tab} ${activeTab === 'Test case' ? styles.active : ''}`}
                                onClick={() => setActiveTab(activeTab === 'Test case' ? null : 'Test case')}
                            >
                                Prompt Test Case
                            </div>
                        </div>

                        <div className={styles.menuList}>
                            {/* <RemoveZone isDragging={isDraggingBlock} /> */}
                            {activeTab === 'Setup' ? (
                                <TestSetup
                                    openMenuItem={openMenuItem}
                                    handleMenuItemClick={handleMenuItemClick}
                                    isDraggingBlock={isDraggingBlock}
                                />
                            ) : activeTab === 'Test case' ? (
                                <>
                                    <TestCase
                                        openMenuItem={openMenuItem}
                                        handleMenuItemClick={handleMenuItemClick}
                                        isDraggingBlock={isDraggingBlock}
                                    />
                                </>
                            ) : null}
                        </div>
                    </div>

                    <div className={styles.mainContent}>
                        {renderContent()}
                    </div>
                </div>
            </div>
        </DndProvider>
    );
};

export default ProjectPage;