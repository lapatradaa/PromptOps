"use client";

import './auth.css';
import SignInSignUp from '../components/Signin-Signup/signin-signup';
import { MdCancel } from 'react-icons/md';
import Link from 'next/link';

export default function Auth() {
    return (
        <div className="decoratedBackground">
            <div className="bottomCircle"></div>
            <header>
                <div className='iconContainer'>
                    <img src="/icons/promptops_icon.svg" alt="PromptOps Icon"></img>
                    <p>PromptOps</p>
                </div>
                <Link href='/'><MdCancel /></Link>
            </header>
            <main>
                <SignInSignUp />
            </main>
        </div>
    );
}