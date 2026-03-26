import { useState } from "react";

export function useToast() {
  const [toast, setToast] = useState(null);
  const showToast    = (message, type = "success") => setToast({ message, type });
  const dismissToast = () => setToast(null);
  return { toast, showToast, dismissToast };
}
