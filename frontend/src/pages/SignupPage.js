import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchCsrfToken } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import FirebaseGoogleButton from "../components/auth/FirebaseGoogleButton";
import "./LoginPage.css";

export default function SignupPage() {
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { loginWithFirebase, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchCsrfToken(); }, []);
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleFirebaseSignup = async (idToken) => {
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const data = await loginWithFirebase(idToken);
      if (data.authenticated) {
        navigate("/", { replace: true });
        return;
      }
      setSuccess(data.detail || "Account created. Awaiting admin approval.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>IICCI Trade Analytics</h1>
        <p className="login-subtitle">Request access with Google. Your account must be approved by an admin before you can use the dashboard.</p>

        {error && <div className="login-error">{error}</div>}
        {success && (
          <div className="login-success-card">
            <div className="login-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <h2>Request Submitted</h2>
              <p>{success}</p>
            </div>
          </div>
        )}

        {!success && (
          <div className="firebase-auth-section">
            <FirebaseGoogleButton
              label="Sign up with Google"
              onSuccess={handleFirebaseSignup}
              onError={setError}
            />
            <p className="firebase-auth-hint">
              We will use your verified Google email to create the request and send it to the admin for approval.
            </p>
          </div>
        )}

        {!success && submitting && (
          <button type="button" disabled>
            Please wait...
          </button>
        )}

        <p className="signup-link">
          Already approved? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
