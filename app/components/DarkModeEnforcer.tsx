'use client';

import { useEffect } from 'react';

export default function DarkModeEnforcer() {
  useEffect(() => {
    // Force dark mode on mount and whenever theme might change
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  return null;
}
