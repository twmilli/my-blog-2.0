// Minimal theme store: toggles the `data-theme` attribute on <html>.
// Token values live in global.css.
const defaultTheme = { name: "light" };

const normalizeThemeState = (theme = defaultTheme) => ({
  name: theme && theme.name === "dark" ? "dark" : "light",
});

let _themeStore = defaultTheme;
let subscribers = new Set();

const broadcast = () => subscribers.forEach((cb) => cb(_themeStore));

const applyToDocument = () => {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", _themeStore.name);
};

const commitTheme = (nextTheme) => {
  _themeStore = normalizeThemeState(nextTheme);
  applyToDocument();
  broadcast();
};

export const themeStore = {
  subscribe(cb) {
    if (subscribers.size < 1 && typeof document !== "undefined") {
      applyToDocument();
    }

    cb(_themeStore);
    subscribers.add(cb);
    return () => void subscribers.delete(cb);
  },
  set(newVal) {
    commitTheme(newVal);
  },
  update(updateFn) {
    commitTheme(updateFn(_themeStore));
  },
  toggleMode() {
    commitTheme({ name: _themeStore.name === "dark" ? "light" : "dark" });
  },
};
