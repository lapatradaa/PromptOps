// components/SignInSignUp.tsx
'use client';

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';

import styles from './SignInSignUp.module.css';

export default function SignInSignUp() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = () => {
    setIsSignUp(!isSignUp);
    setError('');
  };

  const handleSignIn = async (formData: { username: string; password: string }) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }

      // After successful signin, verify the token
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        credentials: 'include'
      });

      if (!verifyResponse.ok) {
        throw new Error('Token verification failed');
      }

      // Get callback URL from query parameters
      const searchParams = new URLSearchParams(window.location.search);
      const callbackUrl = searchParams.get('callbackUrl');

      // Navigate to the appropriate page
      if (callbackUrl) {
        router.replace(callbackUrl);
      } else {
        router.replace('/overview');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (formData: { email: string; username: string; password: string }) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }

      // Automatically sign in after successful signup
      await handleSignIn({
        username: formData.username,
        password: formData.password,
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.switchContainer}>
        <label className={styles.switch}>
          <input type="checkbox" onChange={handleToggle} checked={isSignUp} disabled={loading} />
          <span className={styles.slider}>
            <span className={styles.signIn}>Sign In</span>
            <span className={styles.signUp}>Sign Up</span>
          </span>
        </label>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.formContainer}>
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
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2>Sign In</h2>
      <div style={{ width: '100%', height: '100%', marginBottom: '40px', border: '1px #9F9DB0 solid' }}></div>
      <p>Username</p>
      <input
        type="text"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    await onSubmit({
      email: formData.email,
      username: formData.username,
      password: formData.password,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2>Sign Up</h2>
      <div style={{ width: '100%', height: '100%', marginBottom: '40px', border: '1px #9F9DB0 solid' }}></div>
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