import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchCsrfToken } from "../api/auth";
import FirebaseGoogleButton from "../components/auth/FirebaseGoogleButton";
import "./LoginPage.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, loginWithFirebase, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCsrfToken();
  }, []);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFirebaseLogin = async (idToken) => {
    setError("");
    setSubmitting(true);
    try {
      const data = await loginWithFirebase(idToken);
      if (data.authenticated) {
        navigate("/", { replace: true });
      } else {
        setError(data.detail || "Your account is pending admin approval.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>IICCI Trade Analytics</h1>
        <p className="login-subtitle">Sign in to continue</p>

        {error && <div className="login-error">{error}</div>}

        <div className="firebase-auth-section">
          <FirebaseGoogleButton
            label="Continue with Google"
            onSuccess={handleFirebaseLogin}
            onError={setError}
          />
          <p className="firebase-auth-hint">Use your approved Google account to sign in.</p>
        </div>

        <div className="auth-divider"><span>or continue with username</span></div>

        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        <p className="signup-link">
          Need access? <Link to="/signup">Request an account with Google</Link>
        </p>
      </form>
    </div>
  );
}
