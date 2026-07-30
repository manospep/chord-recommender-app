import { useState, useCallback } from "react";

export function useLocalStorage(key, initialValue) {
  const [stored, setStored] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const v = typeof value === "function" ? value(stored) : value;
      setStored(v);
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  }, [key, stored]);

  return [stored, setValue];
}
