'use client';

import Cookies from 'js-cookie';
import { useState, useEffect, useCallback } from 'react';

// Default cube colors matching the original CUBE_COLORS
export const DEFAULT_CUBE_COLORS = {
  up: '#FFFFFF',     // white
  down: '#EEFF00',   // yellow
  front: '#0CEC00',  // green
  back: '#003CFF',   // blue
  right: '#FF0000',  // red
  left: '#FF7F00',   // orange
};

export type CubeColors = typeof DEFAULT_CUBE_COLORS;

export interface AppSettings {
  cubeColors: CubeColors;
}

const SETTINGS_COOKIE_KEY = 'ao1kSettings';
const SETTINGS_CHANGED_EVENT = 'ao1kSettingsChanged';

// Get settings from cookie (non-reactive, for use outside React)
export function getSettings(): AppSettings {
  const cookieValue = Cookies.get(SETTINGS_COOKIE_KEY);
  if (cookieValue) {
    try {
      const parsed = JSON.parse(cookieValue);
      return {
        cubeColors: { ...DEFAULT_CUBE_COLORS, ...parsed.cubeColors },
      };
    } catch {
      // Invalid JSON, return defaults
    }
  }
  return { cubeColors: { ...DEFAULT_CUBE_COLORS } };
}

// Save settings to cookie and dispatch change event
export function saveSettings(settings: AppSettings): void {
  Cookies.set(SETTINGS_COOKIE_KEY, JSON.stringify(settings), { expires: 365 });
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: settings }));
}

// Update a specific setting
export function updateCubeColors(colors: Partial<CubeColors>): void {
  const current = getSettings();
  const newSettings: AppSettings = {
    ...current,
    cubeColors: { ...current.cubeColors, ...colors },
  };
  saveSettings(newSettings);
}

// Reset cube colors to defaults
export function resetCubeColors(): void {
  const current = getSettings();
  const newSettings: AppSettings = {
    ...current,
    cubeColors: { ...DEFAULT_CUBE_COLORS },
  };
  saveSettings(newSettings);
}

// React hook for reactive settings
export function useSettings(): [AppSettings, (settings: AppSettings) => void] {
  const [settings, setSettingsState] = useState<AppSettings>(() => getSettings());

  const updateSettings = useCallback((newSettings: AppSettings) => {
    setSettingsState(newSettings);
    saveSettings(newSettings);
  }, []);

  useEffect(() => {
    // Listen for settings changes from other components
    const handleSettingsChange = (event: CustomEvent<AppSettings>) => {
      setSettingsState(event.detail);
    };

    window.addEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChange as EventListener);
    return () => {
      window.removeEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChange as EventListener);
    };
  }, []);

  return [settings, updateSettings];
}

// Hook specifically for cube colors
export function useCubeColors(): [CubeColors, (colors: Partial<CubeColors>) => void, () => void] {
  const [settings, setSettings] = useSettings();

  const setCubeColors = useCallback((colors: Partial<CubeColors>) => {
    setSettings({
      ...settings,
      cubeColors: { ...settings.cubeColors, ...colors },
    });
  }, [settings, setSettings]);

  const resetColors = useCallback(() => {
    setSettings({
      ...settings,
      cubeColors: { ...DEFAULT_CUBE_COLORS },
    });
  }, [settings, setSettings]);

  return [settings.cubeColors, setCubeColors, resetColors];
}
