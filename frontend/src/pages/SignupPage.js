import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchCsrfToken, requestOtp, verifyOtp, signupUser } from "../api/auth";
import "./LoginPage.css";

export default function SignupPage() {
  const [step, setStep]           = useState(1); // 1=email, 2=otp, 3=details, 4=done
  const [email, setEmail]         = useState("");
  const [otp, setOtp]             = useState("");
  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchCsrfToken(); }, []);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await requestOtp(email);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await verifyOtp(email, otp);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signupUser(username, password);
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 4) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>IICCI Trade Analytics</h1>
          <div className="login-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h2>Request Submitted</h2>
            <p>Your account is pending admin approval. You'll receive an email once approved.</p>
          </div>
          <Link to="/login" className="signup-link" style={{ textAlign: "center", display: "block", marginTop: "1rem" }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={step === 1 ? handleRequestOtp : step === 2 ? handleVerifyOtp : handleSignup}>
        <h1>IICCI Trade Analytics</h1>
        <p className="login-subtitle">
          {step === 1 && "Create an account — Step 1 of 3: Verify your email"}
          {step === 2 && "Create an account — Step 2 of 3: Enter OTP"}
          {step === 3 && "Create an account — Step 3 of 3: Choose credentials"}
        </p>

        {error && <div className="login-error">{error}</div>}

        {step === 1 && (
          <>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "0 0 1rem" }}>
              A 6-digit code was sent to <strong>{email}</strong>
            </p>
            <label htmlFor="otp">Verification code</label>
            <input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
              maxLength={6}
              required
            />
            <button type="button" className="signup-link" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              onClick={() => { setStep(1); setOtp(""); setError(""); }}>
              ← Change email
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
            <label htmlFor="password">Password <span style={{ color: "#94a3b8", fontWeight: 400 }}>(min 8 characters)</span></label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? "Please wait..." : step === 1 ? "Send Verification Code" : step === 2 ? "Verify Code" : "Create Account"}
        </button>

        <p className="signup-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
