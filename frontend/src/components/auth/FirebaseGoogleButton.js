import { useState } from "react";
import { isFirebaseConfigured, signInWithGooglePopup } from "../../lib/firebaseAuth";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.9-5.5 3.9-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.6l2.7-2.6C16.9 2.9 14.7 2 12 2 6.9 2 2.8 6.3 2.8 11.5S6.9 21 12 21c6.9 0 9.1-4.9 9.1-7.5 0-.5 0-.9-.1-1.3H12Z" />
      <path fill="#34A853" d="M2.8 11.5c0 1.7.6 3.3 1.7 4.6l3-2.3c-.4-.7-.7-1.5-.7-2.3s.2-1.6.7-2.3l-3-2.3c-1.1 1.3-1.7 2.9-1.7 4.6Z" />
      <path fill="#FBBC05" d="M12 21c2.5 0 4.7-.8 6.2-2.3l-3-2.4c-.8.6-1.9 1-3.2 1-2.6 0-4.8-1.8-5.6-4.2l-3.1 2.4C5 18.8 8.2 21 12 21Z" />
      <path fill="#4285F4" d="M18.2 18.7c1.8-1.7 2.9-4.1 2.9-7.2 0-.5 0-.9-.1-1.3H12v3.9h5.5c-.3 1.5-1.1 2.8-2.3 3.7l3 2.4Z" />
    </svg>
  );
}

export default function FirebaseGoogleButton({ label, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!isFirebaseConfigured()) {
      onError?.("Firebase authentication is not configured.");
      return;
    }

    setLoading(true);
    try {
      const idToken = await signInWithGooglePopup();
      await onSuccess(idToken);
    } catch (err) {
      onError?.(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" className="firebase-google-btn" onClick={handleClick} disabled={loading}>
      <span className="firebase-google-btn__icon"><GoogleIcon /></span>
      <span>{loading ? "Please wait..." : label}</span>
    </button>
  );
}
