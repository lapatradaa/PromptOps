import { Block } from '@/app/types';

export interface SecondaryMenuProps {
  activeTab: string | null;
  blocks: Block[];
  onBlocksUpdate: (blocks: Block[], totalBlocks: number) => void;
}

export interface Tab {
  id: string;
  label: string;
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export interface TabMenuProps {
  activeTab: string | null;
  onTabClick: (tabId: string) => void;
  tabs: Tab[];
}