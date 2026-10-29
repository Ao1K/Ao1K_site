'use client';

import Cookies from 'js-cookie';
import { useCallback, useSyncExternalStore } from 'react';

// Default cube colors matching the original CUBE_COLORS
import {
  DEFAULT_CUBE_COLORS,
  DEFAULT_HINT_FACELETS_ELEVATION,
  DEFAULT_STICKER_SCALE,
  MIN_STICKER_SCALE,
  DEFAULT_CAMERA_FOV,
  MIN_CAMERA_FOV,
  MAX_CAMERA_FOV,
  type CubeColors,
} from '../utils/sharedConstants';

export {
  DEFAULT_CUBE_COLORS,
  DEFAULT_HINT_FACELETS_ELEVATION,
  DEFAULT_STICKER_SCALE,
  MIN_STICKER_SCALE,
  DEFAULT_CAMERA_FOV,
  MIN_CAMERA_FOV,
  MAX_CAMERA_FOV,
};
export type { CubeColors };

export type IconSize = 'small' | 'medium';

export type Handedness = 'left' | 'right';

export const DEFAULT_HANDEDNESS: Handedness = 'right';

export const ALGSET_OPTIONS = {
  CFOP: ['cross', 'f2l', 'oll', 'pll'],
  ZB: ['zbls', 'zbll'],
} as const;

export type AlgsetDict = {
  [K in keyof typeof ALGSET_OPTIONS]: (typeof ALGSET_OPTIONS)[K][number][];
};

export const DEFAULT_ALGSETS: AlgsetDict = {
  CFOP: ['f2l', 'oll', 'pll'],
  ZB: [],
};

export const ICON_SIZE_CONFIG = {
  small:  { lineHeight: 28, iconWidth: 28 },
  medium: { lineHeight: 36, iconWidth: 36 },
} as const;

export interface AppSettings {
  cubeColors: CubeColors;
  showPlayerControls: boolean;
  hintFaceletsElevation: number;
  stickerScale: number;
  cameraFov: number;
  showSplits: boolean;
  algsets: AlgsetDict;
  handedness: Handedness;
  showEOStep: boolean;
}

const SETTINGS_COOKIE_KEY = 'ao1kSettings';
const BROADCAST_CHANNEL_NAME = 'ao1k-settings-sync';

const DEFAULT_SETTINGS: AppSettings = {
  cubeColors: { ...DEFAULT_CUBE_COLORS },
  showPlayerControls: true,
  hintFaceletsElevation: DEFAULT_HINT_FACELETS_ELEVATION,
  stickerScale: DEFAULT_STICKER_SCALE,
  cameraFov: DEFAULT_CAMERA_FOV,
  showSplits: false,
  algsets: DEFAULT_ALGSETS,
  handedness: DEFAULT_HANDEDNESS,
  showEOStep: false,
};

// Read settings from cookie (non-reactive)
export function readSettingsFromCookie(): AppSettings {
  return parseSettings(Cookies.get(SETTINGS_COOKIE_KEY));
}

function parseSettings(cookieValue: string | undefined): AppSettings {
  if (cookieValue) {
    try {
      const parsed = JSON.parse(cookieValue);
      const result = {
        cubeColors: { ...DEFAULT_CUBE_COLORS, ...parsed.cubeColors },
        showPlayerControls: parsed.showPlayerControls ?? true,
        hintFaceletsElevation: typeof parsed.hintFaceletsElevation === 'number' ? parsed.hintFaceletsElevation : DEFAULT_HINT_FACELETS_ELEVATION,
        stickerScale: typeof parsed.stickerScale === 'number'
          ? Math.min(1, Math.max(MIN_STICKER_SCALE, parsed.stickerScale))
          : DEFAULT_STICKER_SCALE,
        cameraFov: typeof parsed.cameraFov === 'number'
          ? Math.min(MAX_CAMERA_FOV, Math.max(MIN_CAMERA_FOV, parsed.cameraFov))
          : DEFAULT_CAMERA_FOV,
        showSplits: parsed.showSplits ?? false,
        algsets: { ...DEFAULT_ALGSETS, ...parsed.algsets },
        handedness: parsed.handedness === 'left' ? 'left' : DEFAULT_HANDEDNESS,
        showEOStep: parsed.showEOStep ?? false,
      };
      return result;
    } catch (e) {
      // Invalid JSON, return defaults
    }
  }
  return DEFAULT_SETTINGS;
}

const settingsListeners = new Set<() => void>();
let cachedCookieValue: string | undefined;
let cachedSettings: AppSettings | null = null;
let stopWatchingOtherTabs: (() => void) | null = null;

function getSettingsSnapshot(): AppSettings {
  const cookieValue = Cookies.get(SETTINGS_COOKIE_KEY);
  if (cachedSettings === null || cookieValue !== cachedCookieValue) {
    cachedCookieValue = cookieValue;
    cachedSettings = parseSettings(cookieValue);
  }
  return cachedSettings;
}

function getServerSettingsSnapshot(): AppSettings {
  return DEFAULT_SETTINGS;
}

function notifySettingsChanged() {
  settingsListeners.forEach(listener => listener());
  window.dispatchEvent(new Event('ao1kSettingsChanged'));
}

function watchOtherTabs(): () => void {
  const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);

  const syncFromCookie = () => {
    const previous = cachedSettings;
    if (getSettingsSnapshot() !== previous) notifySettingsChanged();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') syncFromCookie();
  };

  channel.onmessage = syncFromCookie;
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    channel.close();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}

function subscribeToSettings(listener: () => void): () => void {
  settingsListeners.add(listener);
  stopWatchingOtherTabs ??= watchOtherTabs();

  return () => {
    settingsListeners.delete(listener);
    if (settingsListeners.size === 0 && stopWatchingOtherTabs) {
      stopWatchingOtherTabs();
      stopWatchingOtherTabs = null;
    }
  };
}

function updateSettings(next: AppSettings) {
  Cookies.set(SETTINGS_COOKIE_KEY, JSON.stringify(next), { expires: 365 });
  notifySettingsChanged();

  const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  channel.postMessage('updated');
  channel.close();
}

// Synced settings hook - manages cube colors with cross-tab synchronization
export function useSyncedSettings() {
  const settings = useSyncExternalStore(subscribeToSettings, getSettingsSnapshot, getServerSettingsSnapshot);
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

export function useStickerScale(): [number, (value: number) => void] {
  const { settings, updateSettings } = useSyncedSettings();

  const setStickerScale = useCallback((value: number) => {
    updateSettings({
      ...settings,
      stickerScale: value,
    });
  }, [settings, updateSettings]);

  return [settings.stickerScale, setStickerScale] as const;
}

export function useCameraFov(): [number, (value: number) => void] {
  const { settings, updateSettings } = useSyncedSettings();

  const setCameraFov = useCallback((value: number) => {
    updateSettings({
      ...settings,
      cameraFov: value,
    });
  }, [settings, updateSettings]);

  return [settings.cameraFov, setCameraFov] as const;
}

export function useHandedness(): [Handedness, (value: Handedness) => void] {
  const { settings, updateSettings } = useSyncedSettings();

  const setHandedness = useCallback((value: Handedness) => {
    updateSettings({
      ...settings,
      handedness: value,
    });
  }, [settings, updateSettings]);

  return [settings.handedness, setHandedness] as const;
}

export function useShowEOStep(): [boolean, (value: boolean) => void] {
  const { settings, updateSettings } = useSyncedSettings();

  const setShowEOStep = useCallback((value: boolean) => {
    updateSettings({
      ...settings,
      showEOStep: value,
    });
  }, [settings, updateSettings]);

  return [settings.showEOStep, setShowEOStep] as const;
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

