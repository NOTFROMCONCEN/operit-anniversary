// Copyright (c) 2026 奶油话梅糖 <nyanon@vip.qq.com> (MIT)
const BASE_THEME_KEY = "operit-daysmatter-base-theme";
const ACCENT_THEME_KEY = "operit-daysmatter-accent-theme";
const FONT_KEY = "operit-daysmatter-font";
const DENSITY_KEY = "operit-daysmatter-density";
const ANIMATION_KEY = "operit-daysmatter-animation";
const GLASS_KEY = "operit-daysmatter-glass";
const WEEK_START_KEY = "operit-daysmatter-weekstart";
const RADIUS_KEY = "operit-daysmatter-radius";
const COLOR_SCHEME_KEY = "operit-daysmatter-scheme";
const UPCOMING_KEY = "operit-daysmatter-upcoming";

const defaultBase = { h: 217, s: 55, l: 14 };
const defaultAccent = { h: 217, s: 90, l: 60 };

export function applyColorScheme(mode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.colorScheme = mode;
  if (mode === "auto") {
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    document.body.classList.toggle("light-mode", prefersLight);
  } else {
    document.body.classList.toggle("light-mode", mode === "light");
  }
}

export function saveColorScheme(mode) { save(COLOR_SCHEME_KEY, mode); }
export function loadColorScheme() { return load(COLOR_SCHEME_KEY) || "dark"; }

export function applyUpcoming(enabled) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.upcoming = enabled === false ? "hidden" : "visible";
}

export function saveUpcoming(enabled) { save(UPCOMING_KEY, enabled); }
export function loadUpcoming() { const v = load(UPCOMING_KEY); return v === false ? false : true; }

function initAutoColorSchemeListener() {
  if (typeof window === "undefined" || !window.matchMedia) return;
  const mql = window.matchMedia("(prefers-color-scheme: light)");
  const handler = () => {
    const saved = loadColorScheme();
    if (saved === "auto") applyColorScheme("auto");
  };
  if (mql.addEventListener) mql.addEventListener("change", handler);
  else if (mql.addListener) mql.addListener(handler);
}

export function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(color * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function applyBaseTheme(h, s, l) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--base-hue", h);
  root.style.setProperty("--base-sat", s + "%");
  root.style.setProperty("--base-lit", l + "%");
}

export function applyAccentTheme(h, s, l) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--accent-hue", h);
  root.style.setProperty("--accent-sat", s + "%");
  root.style.setProperty("--accent-lit", l + "%");
}

function save(key, value) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) { }
}

function load(key) {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveBaseTheme(h, s, l) {
  save(BASE_THEME_KEY, { h, s, l });
}

export function saveAccentTheme(h, s, l) {
  save(ACCENT_THEME_KEY, { h, s, l });
}

export function loadBaseTheme() {
  return load(BASE_THEME_KEY) || defaultBase;
}

export function loadAccentTheme() {
  return load(ACCENT_THEME_KEY) || defaultAccent;
}

// --- 扩展自定义：字体 ---
export function applyFont(font) {
  if (typeof document === "undefined") return;
  const map = {
    serif: 'ui-serif, "Times New Roman", "Noto Serif SC", "Songti SC", serif',
    sans: 'ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
    mono: 'ui-monospace, "SF Mono", "Cascadia Code", "Fira Code", monospace'
  };
  document.documentElement.style.setProperty("--font-body", map[font] || map.serif);
}

export function saveFont(font) { save(FONT_KEY, font); }
export function loadFont() { return load(FONT_KEY) || "serif"; }

// --- 扩展自定义：布局密度 ---
export function applyDensity(density) {
  if (typeof document === "undefined") return;
  document.body.classList.remove("density-compact", "density-comfortable");
  if (density === "compact") document.body.classList.add("density-compact");
  if (density === "comfortable") document.body.classList.add("density-comfortable");
}

export function saveDensity(density) { save(DENSITY_KEY, density); }
export function loadDensity() { return load(DENSITY_KEY) || "default"; }

// --- 扩展自定义：动画速度 ---
export function applyAnimation(mode) {
  if (typeof document === "undefined") return;
  document.body.classList.remove("anim-none", "anim-fast");
  if (mode === "none") document.body.classList.add("anim-none");
  if (mode === "fast") document.body.classList.add("anim-fast");
}

export function saveAnimation(mode) { save(ANIMATION_KEY, mode); }
export function loadAnimation() { return load(ANIMATION_KEY) || "default"; }

// --- 扩展自定义：玻璃拟态强度 ---
export function applyGlass(strength) {
  if (typeof document === "undefined") return;
  const opacity = strength === "weak" ? 0.45 : strength === "strong" ? 0.88 : 0.72;
  document.documentElement.style.setProperty("--surface-opacity", opacity);
}

export function saveGlass(strength) { save(GLASS_KEY, strength); }
export function loadGlass() { return load(GLASS_KEY) || "default"; }

// --- 扩展自定义：日历首日起始 ---
export function applyWeekStart(start) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.weekStart = start === "monday" ? "monday" : "sunday";
}

export function saveWeekStart(start) { save(WEEK_START_KEY, start); }
export function loadWeekStart() { return load(WEEK_START_KEY) || "sunday"; }

// --- 扩展自定义：圆角大小 ---
export function applyRadius(size) {
  if (typeof document === "undefined") return;
  const map = { small: "18px", default: "34px", large: "48px" };
  document.documentElement.style.setProperty("--radius-xl", map[size] || map.default);
}

export function saveRadius(size) { save(RADIUS_KEY, size); }
export function loadRadius() { return load(RADIUS_KEY) || "default"; }

function bindPresetGroup(containerId, apply, saveFn, customInputId) {
  const container = document.querySelector(containerId);
  if (!container) return null;

  const customInput = document.querySelector(customInputId);

  container.querySelectorAll(".color-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const h = Number(btn.dataset.hue);
      const s = Number(btn.dataset.sat);
      const l = Number(btn.dataset.lit);
      apply(h, s, l);
      saveFn(h, s, l);
      if (customInput) customInput.value = hslToHex(h, s, l);
      container.querySelectorAll(".color-preset").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  if (customInput) {
    function onChange(event) {
      const hex = event.target.value;
      if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
      const { h, s, l } = hexToHsl(hex);
      apply(h, s, l);
      saveFn(h, s, l);
      container.querySelectorAll(".color-preset").forEach((b) => b.classList.remove("active"));
    }
    customInput.addEventListener("input", onChange);
    customInput.addEventListener("change", onChange);
  }

  return { container, customInput };
}

function bindSelectGroup(containerId, apply, saveFn) {
  const container = document.querySelector(containerId);
  if (!container) return null;

  const buttons = container.querySelectorAll("[data-value]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.dataset.value;
      apply(value);
      saveFn(value);
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  return { container, buttons };
}

export function initTheme() {
  // 始终恢复主题（即使页面没有取色器 UI）
  const baseSaved = loadBaseTheme();
  const accentSaved = loadAccentTheme();
  applyBaseTheme(baseSaved.h, baseSaved.s, baseSaved.l);
  applyAccentTheme(accentSaved.h, accentSaved.s, accentSaved.l);

  // 恢复扩展自定义
  applyFont(loadFont());
  applyDensity(loadDensity());
  applyAnimation(loadAnimation());
  applyGlass(loadGlass());
  applyWeekStart(loadWeekStart());
  applyRadius(loadRadius());
  applyColorScheme(loadColorScheme());
  applyUpcoming(loadUpcoming());
  initAutoColorSchemeListener();

  // 尝试绑定取色器 UI，若元素存在则初始化交互
  const base = bindPresetGroup("#baseColorPresets", applyBaseTheme, saveBaseTheme, "#baseCustomColor");
  const accent = bindPresetGroup("#accentColorPresets", applyAccentTheme, saveAccentTheme, "#accentCustomColor");

  if (base) {
    if (base.customInput) base.customInput.value = hslToHex(baseSaved.h, baseSaved.s, baseSaved.l);
    const matched = [...base.container.querySelectorAll(".color-preset")].find((btn) =>
      Number(btn.dataset.hue) === baseSaved.h && Number(btn.dataset.sat) === baseSaved.s && Number(btn.dataset.lit) === baseSaved.l
    );
    if (matched) {
      base.container.querySelectorAll(".color-preset").forEach((b) => b.classList.remove("active"));
      matched.classList.add("active");
    }
  }

  if (accent) {
    if (accent.customInput) accent.customInput.value = hslToHex(accentSaved.h, accentSaved.s, accentSaved.l);
    const matched = [...accent.container.querySelectorAll(".color-preset")].find((btn) =>
      Number(btn.dataset.hue) === accentSaved.h && Number(btn.dataset.sat) === accentSaved.s && Number(btn.dataset.lit) === accentSaved.l
    );
    if (matched) {
      accent.container.querySelectorAll(".color-preset").forEach((b) => b.classList.remove("active"));
      matched.classList.add("active");
    }
  }

  // 绑定扩展自定义 UI
  const fontGroup = bindSelectGroup("#fontPresets", applyFont, saveFont);
  if (fontGroup) {
    const saved = loadFont();
    const matched = [...fontGroup.buttons].find((b) => b.dataset.value === saved);
    if (matched) {
      fontGroup.buttons.forEach((b) => b.classList.remove("active"));
      matched.classList.add("active");
    }
  }

  const densityGroup = bindSelectGroup("#densityPresets", applyDensity, saveDensity);
  if (densityGroup) {
    const saved = loadDensity();
    const matched = [...densityGroup.buttons].find((b) => b.dataset.value === saved);
    if (matched) {
      densityGroup.buttons.forEach((b) => b.classList.remove("active"));
      matched.classList.add("active");
    }
  }

  const animGroup = bindSelectGroup("#animationPresets", applyAnimation, saveAnimation);
  if (animGroup) {
    const saved = loadAnimation();
    const matched = [...animGroup.buttons].find((b) => b.dataset.value === saved);
    if (matched) {
      animGroup.buttons.forEach((b) => b.classList.remove("active"));
      matched.classList.add("active");
    }
  }

  const glassGroup = bindSelectGroup("#glassPresets", applyGlass, saveGlass);
  if (glassGroup) {
    const saved = loadGlass();
    const matched = [...glassGroup.buttons].find((b) => b.dataset.value === saved);
    if (matched) {
      glassGroup.buttons.forEach((b) => b.classList.remove("active"));
      matched.classList.add("active");
    }
  }

  const weekGroup = bindSelectGroup("#weekStartPresets", applyWeekStart, saveWeekStart);
  if (weekGroup) {
    const saved = loadWeekStart();
    const matched = [...weekGroup.buttons].find((b) => b.dataset.value === saved);
    if (matched) {
      weekGroup.buttons.forEach((b) => b.classList.remove("active"));
      matched.classList.add("active");
    }
  }

  const radiusGroup = bindSelectGroup("#radiusPresets", applyRadius, saveRadius);
  if (radiusGroup) {
    const saved = loadRadius();
    const matched = [...radiusGroup.buttons].find((b) => b.dataset.value === saved);
    if (matched) {
      radiusGroup.buttons.forEach((b) => b.classList.remove("active"));
      matched.classList.add("active");
    }
  }

  const schemeGroup = bindSelectGroup("#colorSchemePresets", applyColorScheme, saveColorScheme);
  if (schemeGroup) {
    const saved = loadColorScheme();
    const matched = [...schemeGroup.buttons].find((b) => b.dataset.value === saved);
    if (matched) {
      schemeGroup.buttons.forEach((b) => b.classList.remove("active"));
      matched.classList.add("active");
    }
  }

  const upcomingGroup = bindSelectGroup("#upcomingPresets", applyUpcoming, saveUpcoming);
  if (upcomingGroup) {
    const saved = loadUpcoming();
    const value = saved === false ? "hidden" : "visible";
    const matched = [...upcomingGroup.buttons].find((b) => b.dataset.value === value);
    if (matched) {
      upcomingGroup.buttons.forEach((b) => b.classList.remove("active"));
      matched.classList.add("active");
    }
  }
}
