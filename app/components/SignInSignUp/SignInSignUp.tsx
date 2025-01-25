'use client';

import { useState } from "react";
import { useRouter } from 'next/navigation';
import { signIn } from "next-auth/react";
import styles from './SignInSignUp.module.css';

export default function SignInSignUp() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggleSignUp = () => {
    setIsSignUp(!isSignUp);
    setError('');
  };

  const handleSignIn = async (formData: { email: string; password: string }) => {
    try {
      setLoading(true);
      setError('');

      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        console.error("Sign-in error:", result.error);
        throw new Error(result.error);
      }

      // Navigate to overview page after successful sign-in
      router.replace('/overview');
    } catch (err: any) {
      setError(err.message || 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (formData: { email: string; username: string; password: string; confirmPassword: string }) => {
    try {
      setLoading(true);
      setError('');

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Sign-up error:", data.error || response.statusText);
        throw new Error(data.error || 'Sign-up failed.');
      }

      // Auto-login after successful signup
      await handleSignIn({
        email: formData.email,
        password: formData.password,
      });
    } catch (err: any) {
      setError(err.message || 'Sign-up failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.switchContainer}>
        <label className={styles.switch}>
          <input
            type="checkbox"
            onChange={toggleSignUp}
            checked={isSignUp}
            disabled={loading}
          />
          <span className={styles.slider}>
            <span className={styles.signIn}>Sign In</span>
            <span className={styles.signUp}>Sign Up</span>
          </span>
        </label>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <div className={`${styles.formContainer} ${isSignUp ? styles.expanded : ''}`}>
        {isSignUp ? (
          <SignUpForm onSubmit={handleSignUp} loading={loading} />
        ) : (
          <SignInForm onSubmit={handleSignIn} loading={loading} />
        )}
      </div>
      {loading && <div className={styles.loading}>Loading...</div>}
    </div>
  );
}

interface FormProps {
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}

function SignInForm({ onSubmit, loading }: FormProps) {
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2>Sign In</h2>
      <p>Email</p>
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
        disabled={loading}
      />
      <p>Password</p>
      <input
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
        disabled={loading}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Signing In...' : 'Sign In'}
      </button>
    </form>
  );
}

function SignUpForm({ onSubmit, loading }: FormProps) {
  const [formData, setFormData] = useState({ email: '', username: '', password: '', confirmPassword: '' });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2>Sign Up</h2>
      <p>Email</p>
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
        disabled={loading}
      />
      <p>Username</p>
      <input
        type="text"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        required
        disabled={loading}
      />
      <div className={styles.passwordRow}>
        <div className={styles.passwordField}>
          <p>Password</p>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            disabled={loading}
          />
        </div>
        <div className={styles.passwordField}>
          <p>Confirm Password</p>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
            disabled={loading}
          />
        </div>
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Signing Up...' : 'Sign Up'}
      </button>
    </form>
  );
}
