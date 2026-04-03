'use client';

import { useState, useEffect } from 'react';

/**
 * Like useState but persists the value in sessionStorage.
 * Survives page navigation within the same tab session.
 */
export function useDraft(key: string, initial = ''): [string, (v: string) => void] {
  const storageKey = `nodnal-draft-${key}`;

  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return initial;
    return sessionStorage.getItem(storageKey) ?? initial;
  });

  useEffect(() => {
    sessionStorage.setItem(storageKey, value);
  }, [storageKey, value]);

  return [value, setValue];
}
