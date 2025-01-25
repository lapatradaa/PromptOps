import Link from 'next/link';
import { FaAngleLeft } from 'react-icons/fa';
import { RiStopCircleFill, RiPlayCircleFill } from "react-icons/ri";
import styles from './Header.module.css';

interface HeaderProps {
    projectName: string;
    blocksCount: number;
    isPlaying: boolean;
    isLoading: boolean;
    error: string | null;
    onPlay: () => void;
    onPause: () => void;
}

const Header = ({
    projectName,
    blocksCount,
    isPlaying,
    isLoading,
    error,
    onPlay,
    onPause
}: HeaderProps) => {
    return (
        <>
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
                    <div className={styles.debugCounter}>
                        Blocks connected: <span>{blocksCount}</span>
                    </div>

                    {error && (
                        <div className={styles.errorContainer}>
                            <span className={styles.errorMessage}>Error: {error}</span>
                        </div>
                    )}

                    <span
                        className={`${styles.pauseButton} ${isPlaying ? styles.active : ''}`}
                        onClick={onPause}
                    >
                        <RiStopCircleFill />
                    </span>

                    <span
                        className={`${styles.playButton} ${isPlaying ? styles.active : ''} ${isLoading ? styles.loading : ''}`}
                        onClick={onPlay}
                    >
                        <RiPlayCircleFill />
                    </span>
                </div>
            </header>
        </>
    );
};

export default Header;