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
  showPlayerControls: boolean;
}

const SETTINGS_COOKIE_KEY = 'ao1kSettings';
const BROADCAST_CHANNEL_NAME = 'ao1k-settings-sync';

// Read settings from cookie (non-reactive)
function readSettingsFromCookie(): AppSettings {
  const cookieValue = Cookies.get(SETTINGS_COOKIE_KEY);
  if (cookieValue) {
    try {
      const parsed = JSON.parse(cookieValue);
      const result = {
        cubeColors: { ...DEFAULT_CUBE_COLORS, ...parsed.cubeColors },
        showPlayerControls: parsed.showPlayerControls ?? true,
      };
      return result;
    } catch (e) {
      // Invalid JSON, return defaults
    }
  }
  return { 
    cubeColors: { ...DEFAULT_CUBE_COLORS },
    showPlayerControls: true,
  };
}

// Synced settings hook - manages cube colors with cross-tab synchronization
export function useSyncedSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => readSettingsFromCookie());

  useEffect(() => {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);

    const syncFromCookie = () => {
      const newSettings = readSettingsFromCookie();
      setSettings(newSettings);
      // Dispatch event for other components in this tab (like TwistyPlayer)
      window.dispatchEvent(new Event('ao1kSettingsChanged'));
    };

    channel.onmessage = (e) => {
      syncFromCookie();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFromCookie();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      channel.close();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const updateSettings = useCallback((next: AppSettings) => {
    Cookies.set(SETTINGS_COOKIE_KEY, JSON.stringify(next), { expires: 365 });
    setSettings(next);

    // Dispatch event for other components in this tab
    window.dispatchEvent(new Event('ao1kSettingsChanged'));

    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.postMessage('updated');
    channel.close();
  }, []);

  return { settings, updateSettings };
}

// Hook specifically for cube colors
export function useCubeColors(): [CubeColors, (colors: Partial<CubeColors>) => void, () => void] {
  const { settings, updateSettings } = useSyncedSettings();

  const setCubeColors = useCallback((colors: Partial<CubeColors>) => {
    updateSettings({
      ...settings,
      cubeColors: { ...settings.cubeColors, ...colors },
    });
  }, [settings, updateSettings]);

  const resetColors = useCallback(() => {
    updateSettings({
      ...settings,
      cubeColors: { ...DEFAULT_CUBE_COLORS },
    });
  }, [settings, updateSettings]);

  return [settings.cubeColors, setCubeColors, resetColors];
}

// Hook for show controls
export function useShowControls(): [boolean, (value: boolean) => void] {
  const { settings, updateSettings } = useSyncedSettings();
  
  const setShowControls = useCallback((value: boolean) => {
    updateSettings({
      ...settings,
      showPlayerControls: value,
    });
  }, [settings, updateSettings]);
  
  return [settings.showPlayerControls, setShowControls] as const;
}

