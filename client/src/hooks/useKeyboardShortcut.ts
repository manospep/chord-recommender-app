import { useEffect, useRef } from "react";

interface Options {
  meta?: boolean;
  shift?: boolean;
  ignoreInputs?: boolean;
}

export function useKeyboardShortcut(key: string, callback: (e: KeyboardEvent) => void, options: Options = {}) {
  const { meta = false, shift = false, ignoreInputs = true } = options;
  const cbRef = useRef(callback);
  useEffect(() => { cbRef.current = callback; });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (ignoreInputs && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName ?? "")) return;
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
