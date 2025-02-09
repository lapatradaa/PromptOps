// /app/project/[id]/page.tsx
"use client"

import { useCallback, useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { DndProvider, useDragLayer } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Components
import Header from './components/Header';
import ProjectBoard from './components/ProjectBoard';
import SecondaryMenu from './components/SecondaryMenu';
import DashboardPanel from './components/DashboardPanel';
import LLMSetting from './components/LLMSetting/LLMSetting';
import ScoreComparison from './components/ScoreComparison/ScoreComparison';

// Hooks
import { useBlockUpdates } from './hooks/useBlockUpdates';
import { useTestLLM } from './hooks/useTestLLM';
import { useProject } from './hooks/useProject';

// Types
import { MenuType } from '@/app/types';
import styles from './project.module.css';
import { RiOrganizationChart } from 'react-icons/ri';
import { FaBrain } from 'react-icons/fa';
import { MdStackedBarChart } from 'react-icons/md';

// DragLayerMonitor component
const DragLayerMonitor = ({ onDragChange }: { onDragChange: (isDragging: boolean) => void }) => {
    const isDragging = useDragLayer((monitor) =>
        monitor.isDragging() && monitor.getItemType() === 'PLACED_BLOCK'
    );

    useEffect(() => {
        onDragChange(isDragging);
    }, [isDragging, onDragChange]);

    return null;
};

const ProjectPage = ({ params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = use(params);
    const searchParams = useSearchParams();

    // State declarations
    const [activeMenu, setActiveMenu] = useState<MenuType>(null);
    const [isDraggingBlock, setIsDraggingBlock] = useState(false);

    // Custom hooks
    const { project, isLoading: projectLoading } = useProject(resolvedParams.id);
    const {
        blocks,
        totalBlocks,
        handleBlocksUpdate,
        handleMoveBlock,
        handleUpdateBlock,
        handleRemoveBlock
    } = useBlockUpdates([]);

    const {
        isLoading,
        isPlaying,
        error,
        testResults,
        handleTest: handleTestLLM,
        handleStop: handleStop,
        clearResults
    } = useTestLLM(blocks, resolvedParams.id);

    const handleMenuClick = useCallback((menuId: MenuType) => {
        setActiveMenu(activeMenu === menuId ? null : menuId);
    }, [activeMenu]);

    const handleDashboardClick = useCallback(() => {
        setActiveMenu('dashboard');
    }, []);

    const handleDragChange = useCallback((isDragging: boolean) => {
        setIsDraggingBlock(isDragging);
    }, []);

    const handlePlayClick = useCallback(async () => {
        await handleTestLLM();
    }, [handleTestLLM]);

    const renderContent = useCallback(() => {
        switch (activeMenu) {
            case 'llm':
                return <LLMSetting />;
            case 'chart':
                return <ScoreComparison />;
            case 'dashboard':
            case 'options':
            case null:
            default:
                return (
                    <div className={styles.contentWrapper}>
                        <div className={styles.boardContainer}>
                            <ProjectBoard
                                initialBlocks={blocks}
                                onBlocksUpdate={handleBlocksUpdate}
                                onDashboardClick={handleDashboardClick}
                            />
                        </div>
                        {activeMenu === 'dashboard' && testResults && (
                            <DashboardPanel
                                results={testResults}
                                onClose={() => setActiveMenu(null)}
                            />
                        )}
                    </div>
                );
        }
    }, [activeMenu, blocks, handleBlocksUpdate, handleDashboardClick, testResults]);

    // Early return for loading state
    if (projectLoading) {
        return <div>Loading...</div>;
    }

    if (!project) {
        return <div>Project not found</div>;
    }

    const projectName = project.name || decodeURIComponent(searchParams.get('name') || 'Untitled Project');

    return (
        <DndProvider backend={HTML5Backend}>
            <DragLayerMonitor onDragChange={handleDragChange} />
            <div className={styles.pageContainer}>
                {/* Header */}
                <Header
                    projectName={projectName}
                    blocksCount={blocks.length}
                    isPlaying={isPlaying}
                    isLoading={isLoading}
                    error={error}
                    onPlay={handlePlayClick}
                    onPause={handleStop}
                />

                <div className={styles.mainGrid}>
                    {/* Menu options */}
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

                    {/* Secondary sidebar */}
                    {activeMenu === 'options' && (
                        <SecondaryMenu
                            activeTab="Setup"
                            blocks={blocks}
                            onBlocksUpdate={handleBlocksUpdate}
                            isDraggingBlock={isDraggingBlock}
                            projectType={project?.type ?? 'default'}
                        />
                    )}

                    {/* Main content */}
                    <div className={styles.mainContent}>
                        {renderContent()}
                    </div>
                </div>
            </div>
        </DndProvider>
    );
};

// Menu options configuration
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

export default ProjectPage;