"use client";
import { MdCancel } from 'react-icons/md';
import Link from 'next/link';
import styles from './auth.module.css';
import SignInSignUp from '../components/Signin-Signup/signin-signup';

export default function Auth() {
    return (
        <div className={styles.decoratedBackground}>
            <div className={styles.bottomCircle}></div>
            <div className={styles.header}>
                <div className={styles.iconContainer}>
                    <img src="/icons/promptops_icon.svg" alt="PromptOps Icon" />
                    <p>PromptOps</p>
                </div>
                <Link href='/' className={styles.cancelLink}>
                    <MdCancel />
                </Link>
            </div>
            <div className={styles.main}>
                <SignInSignUp />
            </div>
        </div>
    );
}