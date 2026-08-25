import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemePreset = 'blue' | 'ocean' | 'forest' | 'emerald' | 'sakura' | 'cosmic' | 'ruby' | 'amber' | 'lavender' | 'monochrome';

export interface ThemeColors {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export const presets: Record<ThemePreset, ThemeColors> = {
  blue: {
    50: '214 100% 97%',
    100: '214 100% 91%',
    200: '213 97% 81%',
    300: '212 96% 69%',
    400: '211 94% 53%',
    500: '217 91% 60%',
    600: '221 83% 53%',
    700: '224 76% 48%',
    800: '226 71% 40%',
    900: '226 65% 33%',
    950: '226 56% 21%',
  },
  ocean: {
    50: '190 90% 96%',
    100: '190 90% 90%',
    200: '190 90% 80%',
    300: '190 90% 70%',
    400: '190 90% 50%',
    500: '190 90% 40%',
    600: '190 90% 35%',
    700: '190 90% 30%',
    800: '190 90% 25%',
    900: '190 90% 20%',
    950: '190 90% 15%',
  },
  forest: {
    50: '142 76% 97%',
    100: '142 76% 90%',
    200: '142 76% 80%',
    300: '142 76% 70%',
    400: '142 76% 50%',
    500: '142 71% 45%',
    600: '142 71% 35%',
    700: '142 71% 30%',
    800: '142 71% 25%',
    900: '142 71% 20%',
    950: '142 71% 10%',
  },
  emerald: {
    50: '160 84% 97%',
    100: '160 84% 90%',
    200: '160 84% 80%',
    300: '160 84% 65%',
    400: '160 84% 50%',
    500: '160 84% 39%',
    600: '160 84% 33%',
    700: '160 84% 28%',
    800: '160 84% 22%',
    900: '160 84% 18%',
    950: '160 84% 12%',
  },
  sakura: {
    50: '330 100% 97%',
    100: '330 100% 93%',
    200: '330 100% 86%',
    300: '330 100% 75%',
    400: '330 100% 64%',
    500: '330 87% 53%',
    600: '330 77% 45%',
    700: '330 74% 37%',
    800: '330 70% 30%',
    900: '330 64% 25%',
    950: '330 69% 15%',
  },
  cosmic: {
    50: '290 100% 97%',
    100: '290 100% 93%',
    200: '290 100% 86%',
    300: '290 100% 76%',
    400: '290 100% 64%',
    500: '290 87% 53%',
    600: '290 77% 45%',
    700: '290 74% 37%',
    800: '290 70% 30%',
    900: '290 64% 25%',
    950: '290 69% 15%',
  },
  ruby: {
    50: '350 100% 97%',
    100: '350 100% 93%',
    200: '350 100% 86%',
    300: '350 100% 76%',
    400: '350 100% 64%',
    500: '350 87% 53%',
    600: '350 77% 45%',
    700: '350 74% 37%',
    800: '350 70% 30%',
    900: '350 64% 25%',
    950: '350 69% 15%',
  },
  amber: {
    50: '35 100% 97%',
    100: '35 100% 90%',
    200: '35 100% 80%',
    300: '35 100% 70%',
    400: '35 100% 60%',
    500: '35 100% 50%',
    600: '35 90% 45%',
    700: '35 90% 35%',
    800: '35 90% 25%',
    900: '35 90% 20%',
    950: '35 90% 10%',
  },
  lavender: {
    50: '260 100% 97%',
    100: '260 100% 93%',
    200: '260 100% 86%',
    300: '260 100% 76%',
    400: '260 100% 64%',
    500: '260 87% 53%',
    600: '260 77% 45%',
    700: '260 74% 37%',
    800: '260 70% 30%',
    900: '260 64% 25%',
    950: '260 69% 15%',
  },
  monochrome: {
    50: '0 0% 97%',
    100: '0 0% 90%',
    200: '0 0% 80%',
    300: '0 0% 70%',
    400: '0 0% 50%',
    500: '0 0% 40%',
    600: '0 0% 30%',
    700: '0 0% 20%',
    800: '0 0% 15%',
    900: '0 0% 10%',
    950: '0 0% 5%',
  }
};

interface ThemeColorContextValue {
  preset: ThemePreset;
  setPreset: (preset: ThemePreset) => void;
  isCustom: boolean;
  customColors: ThemeColors | null;
  setCustomColors: (colors: ThemeColors) => void;
}

const ThemeColorContext = createContext<ThemeColorContextValue | null>(null);

function applyColorsToCSS(colors: ThemeColors, preset: ThemePreset | 'custom') {
  const root = document.documentElement;
  
  // Remove any existing theme classes
  const classes = root.className.split(' ');
  const newClasses = classes.filter(c => !c.startsWith('theme-'));
  
  // Add the new theme class if not custom
  if (preset !== 'blue' && preset !== 'custom') {
    newClasses.push(`theme-${preset}`);
  }
  
  root.className = newClasses.join(' ').trim();
  
  // If custom, we must inject inline CSS variables because there is no pre-built class
  if (preset === 'custom') {
    Object.entries(colors).forEach(([shade, hsl]) => {
      root.style.setProperty(`--brand-${shade}`, hsl);
    });
  } else {
    // Clean up inline custom variables if we switch back to a preset
    Object.keys(colors).forEach(shade => {
      root.style.removeProperty(`--brand-${shade}`);
    });
  }
}

export function ThemeColorProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<ThemePreset>('blue');
  const [isCustom, setIsCustom] = useState(false);
  const [customColors, setCustomColorsState] = useState<ThemeColors | null>(null);

  useEffect(() => {
    // Load from local storage
    const savedPreset = window.localStorage.getItem('theme-preset') as ThemePreset | null;
    const savedCustom = window.localStorage.getItem('theme-custom');
    
    if (savedCustom) {
      setIsCustom(true);
      const parsed = JSON.parse(savedCustom);
      setCustomColorsState(parsed);
      applyColorsToCSS(parsed, 'custom');
    } else if (savedPreset && presets[savedPreset]) {
      setPresetState(savedPreset);
      applyColorsToCSS(presets[savedPreset], savedPreset);
    }
  }, []);

  const setPreset = (newPreset: ThemePreset) => {
    setPresetState(newPreset);
    setIsCustom(false);
    setCustomColorsState(null);
    window.localStorage.setItem('theme-preset', newPreset);
    window.localStorage.removeItem('theme-custom');
    applyColorsToCSS(presets[newPreset], newPreset);
  };

  const setCustomColors = (colors: ThemeColors) => {
    setIsCustom(true);
    setCustomColorsState(colors);
    window.localStorage.setItem('theme-custom', JSON.stringify(colors));
    window.localStorage.removeItem('theme-preset');
    applyColorsToCSS(colors, 'custom');
  };

  return (
    <ThemeColorContext.Provider value={{ preset, setPreset, isCustom, customColors, setCustomColors }}>
      {children}
    </ThemeColorContext.Provider>
  );
}

export function useThemeColor() {
  const ctx = useContext(ThemeColorContext);
  if (!ctx) throw new Error('useThemeColor must be used within ThemeColorProvider');
  return ctx;
}
