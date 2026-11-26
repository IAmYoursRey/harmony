import { useState, useEffect, type ReactNode } from "react";
import {
  ThemeColorContext,
  presets,
  type ThemePreset,
  type ThemeColors,
} from "./coreThemeColor";

function applyColorsToCSS(colors: ThemeColors, preset: ThemePreset | "custom") {
  const root = document.documentElement;

  const classes = root.className.split(" ");
  const newClasses = classes.filter((c) => !c.startsWith("theme-"));

  if (preset !== "blue" && preset !== "custom") {
    newClasses.push(`theme-${preset}`);
  }

  root.className = newClasses.join(" ").trim();

  if (preset === "custom") {
    Object.entries(colors).forEach(([shade, hsl]) => {
      root.style.setProperty(`--brand-${shade}`, hsl);
    });
  } else {
    Object.keys(colors).forEach((shade) => {
      root.style.removeProperty(`--brand-${shade}`);
    });
  }
}

function readInitialThemeColor(): {
  preset: ThemePreset;
  isCustom: boolean;
  customColors: ThemeColors | null;
} {
  if (typeof window === "undefined") {
    return { preset: "blue", isCustom: false, customColors: null };
  }
  try {
    const savedCustom = window.localStorage.getItem("theme-custom");
    if (savedCustom) {
      const parsed = JSON.parse(savedCustom) as ThemeColors;
      return { preset: "blue", isCustom: true, customColors: parsed };
    }
    const savedPreset = window.localStorage.getItem("theme-preset") as ThemePreset | null;
    if (savedPreset && presets[savedPreset]) {
      return { preset: savedPreset, isCustom: false, customColors: null };
    }
  } catch {
    // Ignore storage/parse errors
  }
  return { preset: "blue", isCustom: false, customColors: null };
}

export function ThemeColorProvider({ children }: { children: ReactNode }) {
  const initial = readInitialThemeColor();
  const [preset, setPresetState] = useState<ThemePreset>(initial.preset);
  const [isCustom, setIsCustom] = useState(initial.isCustom);
  const [customColors, setCustomColorsState] = useState<ThemeColors | null>(
    initial.customColors,
  );

  useEffect(() => {
    if (isCustom && customColors) {
      applyColorsToCSS(customColors, "custom");
    } else {
      applyColorsToCSS(presets[preset], preset);
    }
  }, [isCustom, customColors, preset]);

  const setPreset = (newPreset: ThemePreset) => {
    setPresetState(newPreset);
    setIsCustom(false);
    setCustomColorsState(null);
    window.localStorage.setItem("theme-preset", newPreset);
    window.localStorage.removeItem("theme-custom");
    applyColorsToCSS(presets[newPreset], newPreset);
  };

  const setCustomColors = (colors: ThemeColors) => {
    setIsCustom(true);
    setCustomColorsState(colors);
    window.localStorage.setItem("theme-custom", JSON.stringify(colors));
    window.localStorage.removeItem("theme-preset");
    applyColorsToCSS(colors, "custom");
  };

  return (
    <ThemeColorContext.Provider
      value={{ preset, setPreset, isCustom, customColors, setCustomColors }}
    >
      {children}
    </ThemeColorContext.Provider>
  );
}
