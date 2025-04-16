import React from 'react';

import { TestCaseFormat } from '@/app/types';
import styles from './TestCaseFields.module.css';

import { RiBook2Fill, RiEmotionHappyLine, RiFileTextLine, RiFlag2Fill, RiQuestionAnswerFill } from 'react-icons/ri';
import { HiQuestionMarkCircle } from 'react-icons/hi';

interface TestCaseFieldsProps {
    format?: TestCaseFormat;
}

const TestCaseFields: React.FC<TestCaseFieldsProps> = ({ format }) => {
    switch (format) {
        case 'ICQA Format':
            return (
                <div className={styles.fieldsContainer}>
                    <div className={styles.fieldRow}>
                        <div className={styles.fieldIcon}>
                            <RiFlag2Fill />
                        </div>
                        <div className={styles.fieldBox}>Instruction</div>
                    </div>
                    <div className={styles.fieldRow}>
                        <div className={styles.fieldIcon}>
                            <RiBook2Fill />
                        </div>
                        <div className={styles.fieldBox}>Context</div>
                    </div>
                    <div className={styles.fieldRow}>
                        <div className={styles.fieldIcon}>
                            <HiQuestionMarkCircle />
                        </div>
                        <div className={styles.fieldBox}>Question</div>
                    </div>
                    <div className={styles.fieldRow}>
                        <div className={styles.fieldIcon}>
                            <RiQuestionAnswerFill />
                        </div>
                        <div className={styles.fieldBox}>Answer</div>
                    </div>
                </div>
            );
        case 'Standard':
            return (
                <div className={styles.fieldsContainer}>
                    <div className={styles.fieldRow}>
                        <div className={styles.fieldIcon}>
                            <RiFileTextLine />
                        </div>
                        <div className={styles.fieldBox}>Text</div>
                    </div>
                    <div className={styles.fieldRow}>
                        <div className={styles.fieldIcon}>
                            <RiEmotionHappyLine />
                        </div>
                        <div className={styles.fieldBox}>Sentiment</div>
                    </div>
                </div>
            );
        // case 'Chain-of-Thought':
        //     return (
        //         <div className={styles.fieldsContainer}>
        //             <div className={styles.fieldRow}>
        //                 <div className={styles.fieldIcon}>
        //                     <HiQuestionMarkCircle />
        //                 </div>
        //                 <div className={styles.fieldBox}>Question</div>
        //             </div>
        //             <div className={styles.fieldRow}>
        //                 <div className={styles.fieldIcon}>
        //                     <MdQueue />
        //                 </div>
        //                 <div className={styles.fieldBox}>Elaboration</div>
        //             </div>
        //             <div className={styles.fieldRow}>
        //                 <div className={styles.fieldIcon}>
        //                     <RiQuestionAnswerFill />
        //                 </div>
        //                 <div className={styles.fieldBox}>Answer</div>
        //             </div>
        //         </div>
        //     );
        default:
            return null;
    }
};

export default TestCaseFields;