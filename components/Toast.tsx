"use client";
import UIButton from "@/components/commercetools-ui/atoms/button";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

export type ToastTone = "success" | "error" | "info";
export type ShowToast = (message: string, tone?: ToastTone) => void;

type ToastItem = { id: number; message: string; tone: ToastTone };

const TOAST_TIMEOUT = 4500;

/**
 * Default is a no-op so components stay renderable outside the provider
 * (server-rendered tests mount them without app layout).
 */
const ToastContext = createContext<ShowToast>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback<ShowToast>(
    (message, tone = "info") => {
      if (!message) return;
      const id = nextId.current++;
      setToasts((list) => [...list, { id, message, tone }]);
      timers.current.push(setTimeout(() => dismiss(id), TOAST_TIMEOUT));
    },
    [dismiss],
  );

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-stack" role="region" aria-label="Notifications">
        {toasts.map((toast) => (
          <output className={`toast ${toast.tone}`} key={toast.id}>
            <span>{toast.message}</span>
            <UIButton variant="ghost" size="fit"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
              type="button"
            >
              <FontAwesomeIcon aria-hidden="true" icon={faXmark} />
            </UIButton>
          </output>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
