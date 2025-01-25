import { useState, useCallback } from 'react';
import SearchBar from './components/SearchBar';
import TabMenu from './components/TabMenu';
import TestSetup from '@/app/project/[id]/components/TestSetup/TestSetup';
import TestCase from '@/app/project/[id]/components/TestCase/TestCase';
import { Block } from '@/app/types';
import styles from './SecondaryMenu.module.css';

interface SecondaryMenuProps {
    activeTab: string | null;
    blocks: Block[];
    onBlocksUpdate: (blocks: Block[], totalBlocks: number) => void;
    isDraggingBlock: boolean;
    projectType: string;
}

const SecondaryMenu = ({
    activeTab: initialActiveTab,
    blocks,
    onBlocksUpdate,
    isDraggingBlock,
    projectType
}: SecondaryMenuProps) => {
    const [activeTab, setActiveTab] = useState<string | null>(initialActiveTab);
    const [openMenuItem, setOpenMenuItem] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleMenuItemClick = useCallback((item: string) => {
        setOpenMenuItem(openMenuItem === item ? null : item);
    }, [openMenuItem]);

    const handleTabClick = useCallback((tab: string) => {
        setActiveTab(activeTab === tab ? null : tab);
    }, [activeTab]);

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
    }, []);

    return (
        <div className={styles.secondarySidebar}>
            <SearchBar
                value={searchQuery}
                onChange={handleSearch}
            />

            <TabMenu
                activeTab={activeTab}
                onTabClick={handleTabClick}
                tabs={[
                    { id: 'Setup', label: 'Test Setup' },
                    { id: 'Test case', label: 'Prompt Test Case' }
                ]}
            />

            <div className={styles.menuList}>
                {activeTab === 'Setup' ? (
                    <TestSetup
                        openMenuItem={openMenuItem}
                        handleMenuItemClick={handleMenuItemClick}
                        isDraggingBlock={isDraggingBlock}
                        projectType={projectType}
                    />
                ) : activeTab === 'Test case' ? (
                    <TestCase
                        openMenuItem={openMenuItem}
                        handleMenuItemClick={handleMenuItemClick}
                        isDraggingBlock={isDraggingBlock}
                    />
                ) : null}
            </div>
        </div>
    );
};

export default SecondaryMenu;