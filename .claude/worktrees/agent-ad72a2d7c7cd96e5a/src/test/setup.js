import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import en from "../../public/locales/en/translation.json";
import hi from "../../public/locales/hi/translation.json";

const catalogs = { en, hi };

// Production loads translations over HTTP (i18next-http-backend) so a copy
// edit needs no rebuild. Tests have no server and no real fetch, so this
// swaps the backend for one that serves the same on-disk JSON synchronously
// — same translations, no network.
vi.mock("i18next-http-backend", () => ({
  default: class FakeTranslationBackend {
    // i18next reads `.type` off the class itself (it instantiates the
    // backend lazily), not off an instance — an instance field here would
    // leave it undefined when i18next inspects the class, which it rejects
    // with "You are passing a wrong module!".
    static type = "backend";
    init() {}
    read(language, _namespace, callback) {
      callback(null, catalogs[language] ?? catalogs.en);
    }
  },
}));

import i18n, { ready as i18nReady } from "../i18n";

// Components render synchronously in tests — nothing here wraps them in
// <Suspense> the way main.jsx does — so the active language must already be
// loaded before the first test runs, not merely requested.
await i18nReady;

// The app only loads the active language on demand; some tests (codes.test.js)
// compare "en" and "hi" output side by side via getFixedT, so both need to be
// in the cache up front.
await i18n.loadLanguages(Object.keys(catalogs));

// jsdom has no fetch worth using here. Every test installs its own handler
// through src/test/server.js; this guarantees an unstubbed test fails loudly
// instead of hitting the network.
beforeEach(() => {
  globalThis.fetch = vi.fn(() => {
    throw new Error("fetch called with no mock installed — use mockApi() from test/server.js");
  });

  // The CSRF cookie the client echoes on writes.
  document.cookie = "fq_csrf=test-csrf-token";
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
