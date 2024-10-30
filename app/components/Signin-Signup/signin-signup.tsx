import './signin-signup.css';
import { useState } from "react";
import { useNavigate } from 'react-router-dom';

export default function SignInSignUp() {
  const [isSignUp, setIsSignUp] = useState(false);
  const handleToggle = () => setIsSignUp(!isSignUp);
//   const navigate = useNavigate();

//   const handleSignIn = (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault(); // Prevents any default form submission behavior
//     navigate('/projects'); // Navigates to the /projects page
//   };

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

// type SignInFormProps = {
//   onSignIn: (e: React.FormEvent<HTMLFormElement>) => void;
// };

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