import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Icon from "./Icon";
import LanguageToggle from "./LanguageToggle";

const NAV_ITEMS = [
  { path: "/dashboard", icon: "home", key: "home" },
  { path: "/book-slot", icon: "calendar", key: "book" },
  { path: "/queue", icon: "clock", key: "queueStatus" },
  { path: "/profile", icon: "user", key: "profile" },
];

/**
 * The shell every authenticated screen shares: one header, one bottom nav.
 *
 * Previously each of the twelve screens carried its own copy of both, which is
 * why the language toggle and navigation drifted between them.
 */
export function FarmerLayout({
  title,
  subtitle,
  onBack,
  children,
  headerExtra,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-green-700 text-white">
        <div className="mx-auto w-full max-w-lg px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label={t("back")}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl transition hover:bg-white/25"
                >
                  ←
                </button>
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon name="grain" className="h-6 w-6" />
                </div>
              )}

              <div className="min-w-0">
                <p className="text-lg font-black text-white">{t("appName")}</p>
                <h1 className="truncate text-lg font-extrabold text-white">{title}</h1>
              </div>
            </div>

            <LanguageToggle />
          </div>

          {subtitle && (
            <p className="mt-3 text-sm text-white">{subtitle}</p>
          )}

          {headerExtra}
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-5">{children}</main>

      <nav className="fixed bottom-3 left-3 right-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center px-4 py-1 text-xs transition ${
                  active ? "font-semibold text-black" : "text-black"
                }`}
              >
                <Icon name={item.icon} className="h-5 w-5" />
                <span className="mt-1">{t(item.key)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default FarmerLayout;
