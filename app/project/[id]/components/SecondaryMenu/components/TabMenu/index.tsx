import { TabMenuProps } from '../../types';
import styles from './TabMenu.module.css';

const TabMenu = ({ activeTab, onTabClick, tabs }: TabMenuProps) => {
  return (
    <div className={styles.tabContainer}>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabClick(tab.id)}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
};

export default TabMenu;