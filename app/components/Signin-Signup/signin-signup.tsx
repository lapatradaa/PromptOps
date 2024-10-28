import { useState } from "react";
import './signin-signup.css'; // Use a global CSS file for styling

export default function SignInSignUp() {
    const [isSignUp, setIsSignUp] = useState(false);

    const handleToggle = () => setIsSignUp(!isSignUp);

    return (
        <div className="container">
            <div className="switch-container">
                <label className="switch">
                    <input type="checkbox" onChange={handleToggle} checked={isSignUp} />
                    <span className="slider">
                        <span className="sign-in">Sign In</span>
                        <span className="sign-up">Sign Up</span>
                    </span>
                </label>
            </div>

            <div className="form-container">
                {isSignUp ? (
                    <SignUpForm />
                ) : (
                    <SignInForm />
                )}
            </div>
        </div>
    );
}

function SignInForm() {
    return (
        <form>
            <h2>Sign In</h2>
            <p>Username</p>
            <input type="text" required />
            <p>Password</p>
            <input type="password" required />
            <button type="submit">Sign In</button>
        </form>
    );
}

function SignUpForm() {
    return (
        <form>
            <h2>Sign Up</h2>
            <p>Username</p>
            <input type="text" required />
            <p>Password</p>
            <input type="password" required />
            <button type="submit">Sign Up</button>
        </form>
    );
}
