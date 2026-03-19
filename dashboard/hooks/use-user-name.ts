"use client";

import { useState, useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "fr-user-name";

function getSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function useUserName(): [string | null, (name: string) => void] {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [name, setNameState] = useState<string | null>(stored);

  const setName = useCallback((newName: string) => {
    localStorage.setItem(STORAGE_KEY, newName);
    setNameState(newName);
  }, []);

  return [name ?? stored, setName];
}
