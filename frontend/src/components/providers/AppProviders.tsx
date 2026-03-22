"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  toggleTheme: () => void;
};

type Toast = {
  id: number;
  message: string;
};

type ToastContextValue = {
  showToast: (message: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const ToastContext = createContext<ToastContextValue | null>(null);

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
}

export function AppProviders({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("nodeaway-theme") as ThemeMode | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = storedTheme || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem("nodeaway-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  function showToast(message: string) {
    const id = Date.now();
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2000);
  }

  const themeValue = useMemo(() => ({ theme, toggleTheme }), [theme]);
  const toastValue = useMemo(() => ({ showToast }), []);

  return (
    <ThemeContext.Provider value={themeValue}>
      <ToastContext.Provider value={toastValue}>
        {children}
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex w-full max-w-sm flex-col gap-3">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className="rounded-full border border-black/10 bg-white/92 px-4 py-3 text-center text-sm font-medium text-black shadow-panel backdrop-blur dark:border-white/10 dark:bg-night/92 dark:text-white"
              >
                {toast.message}
              </div>
            ))}
          </div>
        </div>
      </ToastContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within AppProviders");
  }
  return context;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within AppProviders");
  }
  return context;
}
