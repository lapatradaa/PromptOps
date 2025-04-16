import React from "react";
import { GrFormClose } from "react-icons/gr";
import { MdSwapHoriz } from "react-icons/md";
import { BiChevronLeft } from "react-icons/bi";
import styles from "../Dashboard.module.css";

interface HeaderProps {
    title: string;
    subtitle?: string;
    onClose?: () => void;
    onViewModeToggle?: () => void;
    toggleLabel?: string;
    onBack?: () => void;
    showWarning?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
    title,
    subtitle,
    onClose,
    onViewModeToggle,
    toggleLabel,
    onBack,
    showWarning = false
}) => {
    // Back button version of header (for detail views)
    if (onBack) {
        return (
            <div className={styles.dashboardHeader}>
                <div className={styles.detailHeader}>
                    <button className={styles.backButton} onClick={onBack}>
                        <BiChevronLeft />
                    </button>
                    <h2>{title}</h2>
                </div>
            </div>
        );
    }

    // Standard header with optional toggle
    return (
        <div className={styles.dashboardHeader}>
            <div className={styles.headerContent}>
                <h2>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
                {onViewModeToggle && (
                    <button
                        className={styles.toggleViewButton}
                        onClick={onViewModeToggle}
                        title={toggleLabel}
                    >
                        <MdSwapHoriz /> {toggleLabel}
                    </button>
                )}
            </div>
            {onClose && (
                <button className={styles.closeButton} onClick={onClose}>
                    <GrFormClose />
                </button>
            )}
        </div>
    );
};

export default Header;