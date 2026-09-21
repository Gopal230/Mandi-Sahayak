import i18n from "i18next";
import HttpBackend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

import { isSupportedLanguage } from "./lib/languages";

const getInitialLanguage = () => {
  try {
    const stored = localStorage.getItem("mandiSahayakLanguage");

    if (isSupportedLanguage(stored)) {
      return stored;
    }
  } catch {
    return "en";
  }

  return "en";
};

/**
 * Whether the farmer has ever picked a language.
 *
 * The chooser is shown on first launch only; once a choice exists the app opens
 * straight onto the portal picker instead of asking again every visit.
 */
export function hasStoredLanguage() {
  try {
    return isSupportedLanguage(localStorage.getItem("mandiSahayakLanguage"));
  } catch {
    return false;
  }
}

/**
 * Translations are fetched at runtime, not bundled. A copy edit or a new
 * language only needs a change to `public/locales/<code>/translation.json` —
 * no rebuild, no redeploy of the app bundle.
 *
 * `useSuspense: true` is what makes this safe: components using `t()` suspend
 * until the active language's file has loaded, so nothing renders a flash of
 * translation keys or an empty string while the fetch is in flight. The app
 * root wraps in <Suspense> to catch that (see main.jsx).
 */
/** Resolves once the active language's file has loaded. Tests await this
 * directly instead of relying on <Suspense>, which they don't render. */
export const ready = i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: "/locales/{{lng}}/translation.json",
    },
    lng: getInitialLanguage(),
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
  });

i18n.on("languageChanged", (language) => {
  try {
    localStorage.setItem("mandiSahayakLanguage", language);
  } catch {
    return;
  }
});

export default i18n;
