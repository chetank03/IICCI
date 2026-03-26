import { useEffect } from "react";

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className={`toast toast--${toast.type}`} onClick={onDismiss}>
      {toast.message}
    </div>
  );
}
