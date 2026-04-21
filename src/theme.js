// Minimal theme store: toggles the `data-theme` attribute on <html>
// and persists the preference. All token values live in global.css so
// they're available even before hydration.
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

const saveToStorage = () => {
  if (typeof document === "undefined") return;

  try {
    localStorage.setItem("tay_themeStore", JSON.stringify(_themeStore));
  } catch (e) {
    // Ignore storage failures; the in-memory theme still works.
  }
};

const commitTheme = (nextTheme) => {
  _themeStore = normalizeThemeState(nextTheme);
  applyToDocument();
  broadcast();
  saveToStorage();
};

const loadFromStorage = () => {
  if (typeof document === "undefined") return;

  try {
    const temp = localStorage.getItem("tay_themeStore");
    _themeStore = temp ? normalizeThemeState(JSON.parse(temp)) : defaultTheme;
  } catch (e) {
    _themeStore = defaultTheme;
  }
};

export const themeStore = {
  subscribe(cb) {
    if (subscribers.size < 1 && typeof document !== "undefined") {
      loadFromStorage();
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
