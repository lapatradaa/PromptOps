import React from 'react';
import { FaBrain } from 'react-icons/fa';
import styles from '../ProjectBoard.module.css';

interface BoardCoreProps {
    centerX: number;
    centerY: number;
}

const BoardCore: React.FC<BoardCoreProps> = ({ centerX, centerY }) => (
    <div
        className={styles.core}
        style={{ left: centerX, top: centerY }}
    >
        <FaBrain />
    </div>
);

export default BoardCore;