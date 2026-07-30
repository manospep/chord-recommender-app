import { useEffect, useRef } from "react";

export function useKeyboardShortcut(key, callback, {
  meta = false,
  shift = false,
  ignoreInputs = true,
} = {}) {
  const cbRef = useRef(callback);
  useEffect(() => { cbRef.current = callback; });

  useEffect(() => {
    const handler = (e) => {
      if (ignoreInputs && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
      if (meta && !e.metaKey && !e.ctrlKey) return;
      if (shift && !e.shiftKey) return;
      if (e.key === key) {
        e.preventDefault();
        cbRef.current(e);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, meta, shift, ignoreInputs]);
}
