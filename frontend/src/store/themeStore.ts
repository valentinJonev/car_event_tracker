import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  initializeTheme: () => void;
}

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'light',

  toggleTheme: () => {
    set((state) => {
      const next: Theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      applyTheme(next);
      return { theme: next };
    });
  },

  initializeTheme: () => {
    const stored = localStorage.getItem('theme') as Theme | null;
    // Default to light if no preference is stored
    const theme: Theme = stored === 'dark' ? 'dark' : 'light';
    applyTheme(theme);
    set({ theme });
  },
}));
