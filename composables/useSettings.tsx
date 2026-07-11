'use client';

import Cookies from 'js-cookie';
import { useState, useEffect, useCallback } from 'react';

// Default cube colors matching the original CUBE_COLORS
export const DEFAULT_CUBE_COLORS = {
  up: '#FFFFFF',     // white
  down: '#EEFF00',   // yellow
  front: '#3EF600',  // green
  back: '#2870FF',   // blue
  right: '#FF0000',  // red
  left: '#FFA914',   // orange
  eo: '#FF00FF',     // magenta
};

export type CubeColors = typeof DEFAULT_CUBE_COLORS;

export type IconSize = 'small' | 'medium';

export const ALGSET_OPTIONS = {
  CFOP: ['f2l', 'oll', 'pll'],
  ZB: ['zbls', 'zbll'],
  Roux: ['cmll', 'lse'],
} as const;

export type AlgsetDict = {
  [K in keyof typeof ALGSET_OPTIONS]: (typeof ALGSET_OPTIONS)[K][number][];
};

export const DEFAULT_ALGSETS: AlgsetDict = {
  CFOP: ['f2l', 'oll', 'pll'],
  ZB: [],
  Roux: [],
};

export const ICON_SIZE_CONFIG = {
  small:  { lineHeight: 28, iconWidth: 28 },
  medium: { lineHeight: 36, iconWidth: 36 },
} as const;

export const DEFAULT_HINT_FACELETS_ELEVATION = 1.5;

export interface AppSettings {
  cubeColors: CubeColors;
  showPlayerControls: boolean;
  hintFaceletsElevation: number;
  showSplits: boolean;
  algsets: AlgsetDict;
}

const SETTINGS_COOKIE_KEY = 'ao1kSettings';
const BROADCAST_CHANNEL_NAME = 'ao1k-settings-sync';

// Read settings from cookie (non-reactive)
export function readSettingsFromCookie(): AppSettings {
  const cookieValue = Cookies.get(SETTINGS_COOKIE_KEY);
  if (cookieValue) {
    try {
      const parsed = JSON.parse(cookieValue);
      const result = {
        cubeColors: { ...DEFAULT_CUBE_COLORS, ...parsed.cubeColors },
        showPlayerControls: parsed.showPlayerControls ?? true,
        hintFaceletsElevation: typeof parsed.hintFaceletsElevation === 'number' ? parsed.hintFaceletsElevation : DEFAULT_HINT_FACELETS_ELEVATION,
        showSplits: parsed.showSplits ?? false,
        algsets: parsed.algsets ?? DEFAULT_ALGSETS,
      };
      return result;
    } catch (e) {
      // Invalid JSON, return defaults
    }
  }
  return {
    cubeColors: { ...DEFAULT_CUBE_COLORS },
    showPlayerControls: true,
    hintFaceletsElevation: DEFAULT_HINT_FACELETS_ELEVATION,
    showSplits: false,
    algsets: DEFAULT_ALGSETS,
  };
}

// Synced settings hook - manages cube colors with cross-tab synchronization
export function useSyncedSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    cubeColors: { ...DEFAULT_CUBE_COLORS },
    showPlayerControls: true,
    hintFaceletsElevation: DEFAULT_HINT_FACELETS_ELEVATION,
    showSplits: false,
    algsets: DEFAULT_ALGSETS,
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

export function useShowSplits(): [boolean, (value: boolean) => void] {
  const { settings, updateSettings } = useSyncedSettings();

  const setShowSplits = useCallback((value: boolean) => {
    updateSettings({
      ...settings,
      showSplits: value,
    });
  }, [settings, updateSettings]);

  return [settings.showSplits, setShowSplits] as const;
}

export function useHintFaceletsElevation(): [number, (value: number) => void] {
  const { settings, updateSettings } = useSyncedSettings();

  const setElevation = useCallback((value: number) => {
    updateSettings({
      ...settings,
      hintFaceletsElevation: value,
    });
  }, [settings, updateSettings]);

  return [settings.hintFaceletsElevation, setElevation] as const;
}

export function useAlgsets(): [AlgsetDict, (value: AlgsetDict) => void] {
  const { settings, updateSettings } = useSyncedSettings();

  const setAlgsets = useCallback((value: AlgsetDict) => {
    updateSettings({
      ...settings,
      algsets: value,
    });
  }, [settings, updateSettings]);

  return [settings.algsets, setAlgsets] as const;
}

