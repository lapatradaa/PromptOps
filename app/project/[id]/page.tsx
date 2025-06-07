// app/project/[id]/page.tsx
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
import { IoMdHelpCircle } from 'react-icons/io';

// Components
import Header from './components/Header';
import ProjectBoard from './components/ProjectBoard';
import SecondaryMenu from './components/SecondaryMenu';
import LLMSetting from './components/LLMSetting';
import ScoreComparison from './components/ScoreComparison';
import Tutorial from './components/Tutorial';
import DashboardHandler from './components/Dashboard/DashboardHandler';
import TestStatus from './components/TestStatus';

// Hooks
import { useBlockUpdates } from './hooks/useBlockUpdates';
import { useTestLLM } from './hooks/useTestLLM';
import { useProject } from './hooks/useProject';

// Utils
import { getMissingBlocksMessage, validateBlocks } from './components/ProjectBoard/utils/blockValidation';

// Types
import { MenuType, BlockRequirement } from '@/app/types';
import { getInitialRequirements } from '@/app/types/blockRequirements';

// Styles
import styles from './project.module.css';

// Menu Options Configuration
const MENU_OPTIONS = [
  { id: 'options' as MenuType, icon: <RiOrganizationChart />, className: styles.optionsMenu },
  { id: 'llm' as MenuType, icon: <FaBrain />, className: styles.llmMenu },
  { id: 'chart' as MenuType, icon: <MdStackedBarChart />, className: styles.chartMenu },
  { id: 'tutorial' as MenuType, icon: <IoMdHelpCircle />, className: styles.tutorialMenu }
];

// Drag Layer Monitor Component
type DragLayerMonitorProps = { onDragChange: (isDragging: boolean) => void };
const DragLayerMonitor: React.FC<DragLayerMonitorProps> = ({ onDragChange }) => {
  const isDragging = useDragLayer(monitor =>
    monitor.isDragging() && monitor.getItemType() === 'PLACED_BLOCK'
  );
  useEffect(() => {
    onDragChange(isDragging);
  }, [isDragging, onDragChange]);
  return null;
};

const ProjectPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id: projectId } = use(params);
  const searchParams = useSearchParams();

  // UI state
  const [activeMenu, setActiveMenu] = useState<MenuType>(null);
  const [isDraggingBlock, setIsDraggingBlock] = useState(false);
  const [applicabilityResults, setApplicabilityResults] = useState<any>(null);
  const [dashboardMode, setDashboardMode] = useState<'applicability' | 'results'>('results');
  const [projectType, setProjectType] = useState<string>('qa');
  const [buttonPulsing, setButtonPulsing] = useState(false);
  const [showTestStatus, setShowTestStatus] = useState(false);
  const [testAttemptedWithMissingBlocks, setTestAttemptedWithMissingBlocks] = useState(false);

  const boardContainerRef = useRef<HTMLDivElement>(null);

  // Load project & blocks
  const { project } = useProject(projectId);
  const { blocks, handleBlocksUpdate } = useBlockUpdates([]);

  // Sync project type
  useEffect(() => {
    if (project?.type) setProjectType(project.type);
  }, [project]);

  const handleProjectTypeChange = useCallback((newType: string) => {
    setProjectType(newType);
    handleBlocksUpdate([], 0);
  }, [handleBlocksUpdate]);

  // Validate blocks
  const [blockValidationResult, setBlockValidationResult] = useState({ isComplete: false, missingBlocks: [] as BlockRequirement[] });
  useEffect(() => {
    if (blocks.length) {
      setBlockValidationResult(validateBlocks(blocks, projectType));
    } else {
      setBlockValidationResult({ isComplete: false, missingBlocks: getInitialRequirements(projectType) });
    }
  }, [blocks, projectType]);

  // Test logic
  const {
    isPlaying,
    error,
    testResults,
    testRunId,
    handleTest,
    clearResults,
    // resetStates,
    clearTestRunId
  } = useTestLLM({ blocks, projectId, project });

  // Show/hide TestStatus component
  useEffect(() => {
    if (testRunId) setShowTestStatus(true);
  }, [testRunId]);

  // Clean up on test end
  useEffect(() => {
    if (!isPlaying) {
      setButtonPulsing(false);
      clearTestRunId();
    }
  }, [isPlaying, clearTestRunId]);

  // Menu & drag handlers
  const handleMenuClick = useCallback((menuId: MenuType) => {
    setActiveMenu(prev => {
      const next = prev === menuId ? null : menuId;
      setTimeout(() => boardContainerRef.current?.dispatchEvent(new Event('resize')), 50);
      return next;
    });
  }, []);

  const handleDragChange = useCallback(setIsDraggingBlock, []);

  // Play button handler
  const handlePlayClick = useCallback(async () => {
    if (!blockValidationResult.isComplete) {
      toast.error(getMissingBlocksMessage(blockValidationResult), { duration: 4000 });
      if (blocks.length) {
        setTestAttemptedWithMissingBlocks(true);
        setTimeout(() => setTestAttemptedWithMissingBlocks(false), 5000);
      }
      return;
    }

    setButtonPulsing(true);
    clearResults();
    const started = await handleTest();
    if (!started) {
      setButtonPulsing(false);
    }
  }, [blockValidationResult, blocks, handleTest, clearResults]);

  // Dashboard toggle
  const handleShowDashboard = useCallback((mode: 'applicability' | 'results') => {
    if (activeMenu === 'dashboard') {
      setDashboardMode(mode);
    } else {
      setDashboardMode(mode);
      setTimeout(() => setActiveMenu('dashboard'), 0);
    }
  }, [activeMenu]);

  const projectName = project?.name || decodeURIComponent(searchParams.get('name') || 'Untitled Project');

  return (
    <DndProvider backend={HTML5Backend}>
      <Toaster position="bottom-right" />
      <DragLayerMonitor onDragChange={handleDragChange} />

      <div className={`${styles.variables} ${styles.pageContainer}`}>
        <Header
          projectName={projectName}
          blocksCount={blocks.length}
          isPlaying={isPlaying}
          isLoading={buttonPulsing}
          error={error}
          validationResult={blockValidationResult}
          onPlay={handlePlayClick}
        />

        {showTestStatus && testRunId && (
          <TestStatus projectId={projectId} testId={testRunId} />
        )}

        <div className={styles.mainGrid}>
          <div className={styles.leftSidebar}>
            {MENU_OPTIONS.map(opt => (
              <span
                key={opt.id}
                className={`${opt.className} ${activeMenu === opt.id ? styles.active : ''}`}
                onClick={() => handleMenuClick(opt.id)}
              >
                {opt.icon}
              </span>
            ))}
          </div>

          <div className={styles.mainContent}>
            {activeMenu === 'llm' && <LLMSetting onProjectTypeChange={handleProjectTypeChange} />}
            {activeMenu === 'chart' && <ScoreComparison projectId={projectId} />}
            {activeMenu === 'tutorial' && <Tutorial />}
            {(activeMenu === null || activeMenu === 'dashboard' || activeMenu === 'options') && (
              <div className={styles.contentWrapper}>
                {activeMenu === null && (
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
                    onApplicabilityResults={res => { setApplicabilityResults(res); handleShowDashboard('applicability'); }}
                    showDashboardResults={handleShowDashboard}
                    testResults={testResults}
                    testRunId={testRunId}
                    clearResults={clearResults}
                    projectId={projectId}
                  />
                </div>
                {activeMenu === 'dashboard' && (
                  <DashboardHandler
                    testResults={testResults}
                    applicabilityResults={applicabilityResults}
                    onClose={() => setActiveMenu(null)}
                    fileName={blocks.find(b => b.type === 'input')?.config?.fileName}
                    isVisible={true}
                    projectId={projectId}
                    initialViewMode={dashboardMode}
                    testId={testRunId!}
                    projectType={projectType}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default ProjectPage;