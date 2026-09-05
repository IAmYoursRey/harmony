import { useState, useEffect, type ReactNode } from 'react';
import { ThemeColorContext, presets, type ThemePreset, type ThemeColors } from './coreThemeColor';

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

