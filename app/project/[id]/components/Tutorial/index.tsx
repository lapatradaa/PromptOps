import React from 'react';
import styles from './Tutorial.module.css';

const Tutorial: React.FC = () => {
    return (
        <div className={styles.container}>
            <div className={styles.videoWrapper}>
                <iframe
                    width="315"
                    height="560"
                    src="https://www.youtube-nocookie.com/embed/M6TbvPIt9kE"
                    title="Tutorial Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                />
            </div>
        </div>
    );
};

export default Tutorial;