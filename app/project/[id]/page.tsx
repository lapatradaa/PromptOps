// @/app/project/[id]/page.tsx
"use client"

import React, { useCallback, useEffect, useState, useRef, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { DndProvider, useDragLayer } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import toast, { Toaster } from 'react-hot-toast';

// Icons
import { RiOrganizationChart } from 'react-icons/ri';
import { FaBrain } from 'react-icons/fa';
import { MdStackedBarChart } from 'react-icons/md';

// Components
import Header from './components/Header';
import ProjectBoard from './components/ProjectBoard';
import SecondaryMenu from './components/SecondaryMenu';
import LLMSetting from './components/LLMSetting';
import ScoreComparison from './components/ScoreComparison';
import DeferredSSEConnector from './components/DeferredSSEConnector';
import DashboardHandler from './components/Dashboard/DashboardHandler';

// Hooks
import { useBlockUpdates } from './hooks/useBlockUpdates';
import { useTestLLM } from './hooks/useTestLLM'; // Updated hook with SSE
import { useProject } from './hooks/useProject';

// Utils
import { getMissingBlocksMessage, validateBlocks } from './components/ProjectBoard/utils/blockValidation';

// Types
import { MenuType, BlockRequirement } from '@/app/types';

// Styles
import styles from './project.module.css';
import { getInitialRequirements } from '@/app/types/blockRequirements';

// Menu Options Configuration
const MENU_OPTIONS = [
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

// Drag Layer Monitor Component
const DragLayerMonitor: React.FC<{ onDragChange: (isDragging: boolean) => void }> = ({ onDragChange }) => {
    const isDragging = useDragLayer((monitor) =>
        monitor.isDragging() && monitor.getItemType() === 'PLACED_BLOCK'
    );

    useEffect(() => {
        onDragChange(isDragging);
    }, [isDragging, onDragChange]);

    return null;
};

// Main Project Page Component
const ProjectPage = ({ params }: { params: Promise<{ id: string }> }) => {
    // Resolve params
    const resolvedParams = use(params);
    const searchParams = useSearchParams();

    // State Management
    const [activeMenu, setActiveMenu] = useState<MenuType>(null);
    const [isDraggingBlock, setIsDraggingBlock] = useState(false);
    const [applicabilityResults, setApplicabilityResults] = useState<any>(null);
    const [dashboardMode, setDashboardMode] = useState<'applicability' | 'results'>('results');
    const [projectType, setProjectType] = useState<string>('qa');
    const [sseStatus, setSSEStatus] = useState<any>(null);
    const [buttonPulsing, setButtonPulsing] = useState(false);
    const [showSSEConnector, setShowSSEConnector] = useState(false);
    const [testAttemptedWithMissingBlocks, setTestAttemptedWithMissingBlocks] = useState(false);

    // Ref for board container to force rerender on menu changes
    const boardContainerRef = useRef<HTMLDivElement>(null);

    // Custom Hooks
    const { project, isLoading: projectLoading } = useProject(resolvedParams.id);
    const {
        blocks,
        handleBlocksUpdate,
    } = useBlockUpdates([]);

    // Update project type when project changes
    useEffect(() => {
        if (project?.type) {
            setProjectType(project.type);
        }
    }, [project]);

    // Handle project type change from LLMSetting
    const handleProjectTypeChange = useCallback(async (newType: string) => {
        setProjectType(newType);
        // Clear existing blocks when project type changes
        handleBlocksUpdate([], 0);
    }, [handleBlocksUpdate]);

    const [blockValidationResult, setBlockValidationResult] = useState({
        isComplete: false,
        missingBlocks: [] as BlockRequirement[]
    });

    useEffect(() => {
        if (blocks && blocks.length > 0) {
            const validation = validateBlocks(blocks, projectType);
            setBlockValidationResult(validation);
        } else {
            // Get requirements from the centralized source
            const initialRequirements = getInitialRequirements(projectType);

            setBlockValidationResult({
                isComplete: false,
                missingBlocks: initialRequirements
            });
        }
    }, [blocks, projectType]);

    // Get test hook including SSE status
    const {
        isPlaying,
        error,
        testResults,
        testRunId,
        handleTest,
        // handleStop,
        clearResults,
        resetStates,
        clearTestRunId
    } = useTestLLM(blocks, resolvedParams.id);

    // Handle SSE status changes
    const handleSSEStatusChange = useCallback((status: any) => {
        console.log("SSE Status update:", status);
        setSSEStatus(status);

        // When the test completes or errors, ensure states are reset
        if (status.type === 'completed' || status.type === 'error' || status.type === 'aborted') {
            resetStates();
            // Explicitly stop the button from pulsing
            setButtonPulsing(false);

            // Hide the SSE connector after a delay
            setTimeout(() => {
                setShowSSEConnector(false);
            }, 1000);
        }
    }, [resetStates]);

    // Cleanup when component unmounts
    useEffect(() => {
        return () => {
            // Reset all test states on unmount
            resetStates();
            setButtonPulsing(false);
        };
    }, [resetStates]);

    // Menu Interaction Handler
    const handleMenuClick = useCallback((menuId: MenuType) => {
        setActiveMenu(prevMenu => {
            const newMenu = prevMenu === menuId ? null : menuId;
            // Force a reflow of the board container when the menu changes
            setTimeout(() => {
                if (boardContainerRef.current) {
                    const event = new Event('resize');
                    window.dispatchEvent(event);
                }
            }, 50);
            return newMenu;
        });
    }, []);

    // Drag Change Handler
    const handleDragChange = useCallback((isDragging: boolean) => {
        setIsDraggingBlock(isDragging);
    }, []);

    // Play Click Handler
    const handlePlayClick = useCallback(async () => {
        // First check if all required blocks are present
        if (!blockValidationResult.isComplete) {
            // Show toast notification about missing blocks
            toast.error(getMissingBlocksMessage(blockValidationResult), {
                duration: 4000,
                position: 'bottom-right',
            });

            // Set flag for visual feedback in ProjectBoard
            if (blocks.length > 0) {
                setTestAttemptedWithMissingBlocks(true);

                // Auto-reset after 5 seconds
                setTimeout(() => {
                    setTestAttemptedWithMissingBlocks(false);
                }, 5000);
            }

            return;
        }

        // Additional check for file upload
        const inputBlock = blocks.find(b => b.type === 'input');
        if (inputBlock && (!inputBlock.config?.data || !inputBlock.config?.fileName)) {
            toast.error('Please upload a file to the input block', {
                duration: 4000,
                position: 'bottom-right',
            });

            setTestAttemptedWithMissingBlocks(true);
            setTimeout(() => {
                setTestAttemptedWithMissingBlocks(false);
            }, 5000);

            return;
        }

        // Additional validation for test case format and shot type
        const testCaseBlock = blocks.find(b => b.type === 'test-case');
        if (testCaseBlock && (!testCaseBlock.shotType || !testCaseBlock.testCaseFormat)) {
            toast.error('Test case configuration is incomplete', {
                duration: 4000,
                position: 'bottom-right',
            });
            return;
        }

        // Reset SSE status when starting a new test
        setSSEStatus(null);
        // Explicitly set button to pulsing
        setButtonPulsing(true);
        // Clear any cached/stored test results
        clearResults();
        // Explicitly clear the test run ID
        clearTestRunId();

        // Start the test
        const success = await handleTest();

        // If test started successfully, show the SSE connector
        if (success) {
            setShowSSEConnector(true);
        } else {
            // If test failed to start, stop pulsing
            setButtonPulsing(false);
        }
    }, [blockValidationResult, blocks, handleTest, clearResults, clearTestRunId, setTestAttemptedWithMissingBlocks]);

    // Stop Click Handler
    // const handleStopClick = useCallback(() => {
    //     handleStop();
    //     // Explicitly stop pulsing when manually stopped
    //     setButtonPulsing(false);
    // }, [handleStop]);

    // Dashboard visibility handler with debounce
    const handleShowDashboard = useCallback((mode: 'applicability' | 'results') => {
        if (activeMenu === 'dashboard') {
            setDashboardMode(mode);
            return;
        }
        setDashboardMode(mode);
        setTimeout(() => {
            setActiveMenu('dashboard');
        }, 0);
    }, [activeMenu]);

    // Compute effective playing state
    const effectiveIsPlaying = isPlaying && !(sseStatus?.type === 'completed' ||
        sseStatus?.type === 'error' || sseStatus?.type === 'aborted');

    const projectName = project?.name ||
        decodeURIComponent(searchParams.get('name') || 'Untitled Project');

    return (
        <DndProvider backend={HTML5Backend}>
            <Toaster position="bottom-right" />
            <DragLayerMonitor onDragChange={handleDragChange} />

            <div className={`${styles.variables} ${styles.pageContainer}`}>
                <Header
                    projectName={projectName}
                    blocksCount={blocks.length}
                    isPlaying={effectiveIsPlaying}
                    isLoading={buttonPulsing}
                    error={error || sseStatus?.error}
                    validationResult={blockValidationResult}
                    onPlay={handlePlayClick}
                // onPause={handleStopClick}
                />

                {testRunId && showSSEConnector ? (
                    <DeferredSSEConnector
                        projectId={resolvedParams.id}
                        testId={testRunId}
                        // className={styles.connectionStatus}
                        onStatusChange={handleSSEStatusChange}
                    />
                ) : null}

                <div className={styles.mainGrid}>
                    <div className={styles.leftSidebar}>
                        {MENU_OPTIONS.map((option) => (
                            <span
                                key={option.id}
                                className={`${option.className} ${activeMenu === option.id ? styles.active : ''}`}
                                onClick={() => handleMenuClick(option.id)}
                            >
                                {option.icon}
                            </span>
                        ))}
                    </div>

                    <div className={styles.mainContent}>
                        {(() => {
                            switch (activeMenu) {
                                case 'llm':
                                    return <LLMSetting onProjectTypeChange={handleProjectTypeChange} />;
                                case 'chart':
                                    return <ScoreComparison projectId={resolvedParams.id} />;
                                case 'dashboard':
                                case 'options':
                                case null:
                                default:
                                    return (
                                        <div className={styles.contentWrapper}>
                                            {activeMenu === 'options' && (
                                                <SecondaryMenu
                                                    activeTab="Setup"
                                                    blocks={blocks}
                                                    onBlocksUpdate={handleBlocksUpdate}
                                                    isDraggingBlock={isDraggingBlock}
                                                    projectType={projectType}
                                                />
                                            )}
                                            <div ref={boardContainerRef} className={styles.boardContainer}>
                                                <ProjectBoard
                                                    projectType={projectType}
                                                    initialBlocks={blocks}
                                                    onBlocksUpdate={handleBlocksUpdate}
                                                    onDashboardClick={() => handleShowDashboard('results')}
                                                    onApplicabilityResults={(results) => {
                                                        setApplicabilityResults(results);
                                                        handleShowDashboard('applicability');
                                                    }}
                                                    showDashboardResults={handleShowDashboard}
                                                    testResults={testResults}
                                                    testRunId={testRunId}
                                                    clearResults={clearResults}
                                                    projectId={resolvedParams.id}
                                                    sseStatus={sseStatus}
                                                />
                                            </div>
                                            {activeMenu === 'dashboard' && (
                                                <DashboardHandler
                                                    testResults={testResults}
                                                    applicabilityResults={applicabilityResults}
                                                    onClose={() => setActiveMenu(null)}
                                                    fileName={blocks.find(b => b.type === 'input')?.config?.fileName}
                                                    isVisible={true}
                                                    projectId={resolvedParams.id}
                                                    initialViewMode={dashboardMode}
                                                    testId={testRunId || ""} 
                                                    projectType={projectType}
                                                />
                                            )}
                                        </div>
                                    );
                            }
                        })()}
                    </div>
                </div>
            </div>
        </DndProvider>
    );
};

export default ProjectPage;