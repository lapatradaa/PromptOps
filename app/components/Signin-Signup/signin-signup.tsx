// components/Signin-Signup/signin-signup.tsx
'use client';
import styles from './signin-signup.module.css';
import { useState } from "react";
import { useRouter } from 'next/navigation';

export default function SignInSignUp() {
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  
  const handleToggle = () => setIsSignUp(!isSignUp);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    router.push('/projects');
  };

  return (
    <div className={styles.container}>
      <div className={styles.switchContainer}>
        <label className={styles.switch}>
          <input type="checkbox" onChange={handleToggle} checked={isSignUp} />
          <span className={styles.slider}>
            <span className={styles.signIn}>Sign In</span>
            <span className={styles.signUp}>Sign Up</span>
          </span>
        </label>
      </div>
      <div className={styles.formContainer}>
        {isSignUp ? (
          <SignUpForm onSubmit={handleSubmit} />
        ) : (
          <SignInForm onSubmit={handleSubmit} />
        )}
      </div>
    </div>
  );
}

interface FormProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

function SignInForm({ onSubmit }: FormProps) {
  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <h2>Sign In</h2>
      <p>Username</p>
      <input type="text" required />
      <p>Password</p>
      <input type="password" required />
      <button type="submit">Sign In</button>
    </form>
  );
}

function SignUpForm({ onSubmit }: FormProps) {
  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <h2>Sign Up</h2>
      <p>Username</p>
      <input type="text" required />
      <p>Password</p>
      <input type="password" required />
      <button type="submit">Sign Up</button>
    </form>
  );
}
