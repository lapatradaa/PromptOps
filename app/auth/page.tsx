"use client";

import './auth.css';
import SignInSignUp from '../components/SignInSignUp'; 

export default function Auth() {
    return (
        <div className="decoratedBackground">
            <div className="bottomCircle"></div>
            <header>
                <div className='iconContainer'>
                    <img src="/images/promptops_icon.svg" alt="PromptOps Icon"></img>
                    <p>PromptOps</p>
                </div>
            </header>
            <main>
                <SignInSignUp />
            </main>
        </div>
    );
}