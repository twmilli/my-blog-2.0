// Minimal theme store: toggles the `data-theme` attribute on <html>
// and persists the preference. All token values live in global.css so
// they're available even before hydration.
const defaultTheme = { name: "light" };

let _themeStore = defaultTheme;
let subscribers = new Set();
const broadcast = () => subscribers.forEach((cb) => cb(_themeStore));

const applyToDocument = () => {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", _themeStore.name);
};

const saveToStorage = () => {
  if (typeof document === "undefined") return;
  localStorage.setItem("tay_themeStore", JSON.stringify(_themeStore));
};

export const themeStore = {
  subscribe(cb) {
    if (subscribers.size < 1 && typeof document !== "undefined") {
      const temp = localStorage.getItem("tay_themeStore");
      _themeStore = temp ? JSON.parse(temp) : defaultTheme;
    }
    cb(_themeStore);
    subscribers.add(cb);
    return () => void subscribers.delete(cb);
  },
  set(newVal) {
    _themeStore = newVal;
    applyToDocument();
    broadcast();
    saveToStorage();
  },
  update(updateFn) {
    _themeStore = updateFn(_themeStore);
    applyToDocument();
    broadcast();
    saveToStorage();
  },
};
