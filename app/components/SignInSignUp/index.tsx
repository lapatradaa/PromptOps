'use client';

import { useState } from "react";
import { useRouter } from 'next/navigation';
import { signIn, getSession } from "next-auth/react";
import styles from './SignInSignUp.module.css';
import { FiEye, FiEyeOff, FiLoader } from "react-icons/fi";
import { toast } from "react-hot-toast"; // Import toast from react-hot-toast

export default function SignInSignUp() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const toggleSignUp = () => {
    setIsSignUp(!isSignUp);
    setError('');
  };

  const handleSignIn = async (formData: { email: string; password: string }) => {
    try {
      setError('');

      // Show loading toast
      const loadingToast = toast.loading('Signing in...');

      // Get the callbackUrl from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const callbackUrl = urlParams.get('callbackUrl') || '/overview';

      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (result?.error) {
        console.error("Sign-in error:", result.error);

        // More detailed error messages for users
        let errorMessage = result.error;
        if (result.error === "CredentialsSignin") {
          errorMessage = "Invalid email or password. Please check your credentials and try again.";
        } else if (result.error.includes("credentials")) {
          errorMessage = "Invalid email or password. Please check your credentials and try again.";
        } else if (result.error.includes("server")) {
          errorMessage = "Server error. Please try again later or contact support if the issue persists.";
        }

        toast.error(errorMessage);
        throw new Error(errorMessage);
      } else {
        toast.success('Successfully signed in!');

        // Use router.replace instead of router.push to avoid back button issues
        router.replace(callbackUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Sign-in failed.');
    }
  };

  const handleSignUp = async (formData: { email: string; username: string; password: string; confirmPassword: string }) => {
    try {
      setError('');

      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match.');
        throw new Error('Passwords do not match.');
      }

      // Show loading toast
      const loadingToast = toast.loading('Creating your account...');

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
        }),
      });

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      const data = await response.json();

      if (!response.ok) {
        console.error("Sign-up error:", data.error || response.statusText);

        // Enhanced error messages for signup failures
        let errorMessage = data.error || 'Sign-up failed.';

        if (errorMessage.includes("email") && errorMessage.includes("exists")) {
          errorMessage = "This email is already registered. Please use a different email or try to sign in.";
        } else if (errorMessage.includes("username") && errorMessage.includes("exists")) {
          errorMessage = "This username is already taken. Please choose a different username.";
        } else if (errorMessage.includes("password") && errorMessage.includes("requirements")) {
          errorMessage = "Password does not meet requirements. Please use at least 8 characters with numbers and letters.";
        } else if (errorMessage.includes("server")) {
          errorMessage = "Server error during sign-up. Please try again later.";
        }

        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Show success toast
      toast.success('Account created successfully!');

      // Auto-login after successful signup
      await handleSignIn({
        email: formData.email,
        password: formData.password,
      });
    } catch (err: any) {
      setError(err.message || 'Sign-up failed.');
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
          <SignUpForm onSubmit={handleSignUp} />
        ) : (
          <SignInForm onSubmit={handleSignIn} />
        )}
      </div>
    </div>
  );
}

interface FormProps {
  onSubmit: (data: any) => Promise<void>;
}

function SignInForm({ onSubmit }: FormProps) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(formData);
    setIsSubmitting(false);
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
        disabled={isSubmitting}
      />
      <p>Password</p>
      <div className={styles.passwordContainer}>
        <input
          type={showPassword ? "text" : "password"}
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          disabled={isSubmitting}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className={styles.eyeIcon}
        >
          {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
        </button>
      </div>
      <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
        {isSubmitting ? (
          <>
            <FiLoader className={styles.spinner} size={18} />
            <span>Signing In...</span>
          </>
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  );
}

function SignUpForm({ onSubmit }: FormProps) {
  const [formData, setFormData] = useState({ email: '', username: '', password: '', confirmPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(formData);
    setIsSubmitting(false);
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
        disabled={isSubmitting}
      />
      <p>Username</p>
      <input
        type="text"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        required
        disabled={isSubmitting}
      />
      <div className={styles.passwordRow}>
        <div className={styles.passwordField}>
          <p>Password</p>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            disabled={isSubmitting}
          />
        </div>
        <div className={styles.passwordField}>
          <p>Confirm Password</p>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
            disabled={isSubmitting}
          />
        </div>
      </div>
      <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
        {isSubmitting ? (
          <>
            <FiLoader className={styles.spinner} size={18} />
            <span>Signing Up...</span>
          </>
        ) : (
          'Sign Up'
        )}
      </button>
    </form>
  );
}
