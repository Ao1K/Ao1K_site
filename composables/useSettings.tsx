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
  eo: '#FF00FF',     // magenta
};

export type CubeColors = typeof DEFAULT_CUBE_COLORS;

export type IconSize = 'small' | 'medium';

export const ICON_SIZE_CONFIG = {
  small:  { lineHeight: 28, iconWidth: 28 },
  medium: { lineHeight: 36, iconWidth: 36 },
} as const;

export interface AppSettings {
  cubeColors: CubeColors;
  showPlayerControls: boolean;
  iconSize: IconSize;
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
        iconSize: (parsed.iconSize === 'small' ? 'small' : 'medium') as IconSize,
      };
      return result;
    } catch (e) {
      // Invalid JSON, return defaults
    }
  }
  return {
    cubeColors: { ...DEFAULT_CUBE_COLORS },
    showPlayerControls: true,
    iconSize: 'medium' as IconSize,
  };
}

// Synced settings hook - manages cube colors with cross-tab synchronization
export function useSyncedSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    cubeColors: { ...DEFAULT_CUBE_COLORS },
    showPlayerControls: true,
    iconSize: 'medium' as IconSize,
  });

  useEffect(() => {
    // hydrate from cookie on mount
    setSettings(readSettingsFromCookie());

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

// Hook for icon size
export function useIconSize(): [IconSize, (value: IconSize) => void] {
  const { settings, updateSettings } = useSyncedSettings();

  const setIconSize = useCallback((value: IconSize) => {
    updateSettings({
      ...settings,
      iconSize: value,
    });
  }, [settings, updateSettings]);

  return [settings.iconSize, setIconSize] as const;
}

