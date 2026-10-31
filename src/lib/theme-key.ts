export const THEME_STORAGE_KEY = "fertimata.theme";

export const THEMES = ["light", "dark"] as const;
export type ResolvedTheme = (typeof THEMES)[number];

/** Warna bilah status browser/PWA per tema (= warna latar). */
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#eef5f0",
  dark: "#121212",
};

/** Skrip inline sebelum paint pertama agar tema tidak berkedip (lihat juga lib/theme.tsx). */
export const themeInitScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(${JSON.stringify(THEMES)}.indexOf(t)<0){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.dataset.theme=t}catch(e){d.dataset.theme="light"}})()`;
