import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import api, { DEMO_OTP_ENABLED } from "../../lib/api";
import { translateFieldErrors } from "../../lib/codes";
import LanguageToggle from "../../components/LanguageToggle";
import { ErrorState } from "../../components/StateViews";

/**
 * The four officer accounts seeded for the SIH demonstration
 * (server/imports/0005_demo_officer_accounts.sql). Shown only when the
 * server is running in demo mode, so this section cannot appear against a
 * production backend that has no such accounts.
 */
const DEMO_OFFICERS = [
  { label: "Aligarh", phone: "9999900001" },
  { label: "Mathura", phone: "9999900002" },
  { label: "Hathras", phone: "9999900003" },
  { label: "Bulandshahr", phone: "9999900004" },
];

/**
 * Staff sign-in.
 *
 * The phone number is the WHOLE credential: there is no password step. The
 * server answers with an OTP challenge, and that OTP goes through the same
 * `/auth/otp/verify` a farmer uses, so this screen hands the challenge to the
 * shared OTP screen rather than duplicating it.
 *
 * `INVALID_CREDENTIALS` is returned for an unknown number, a non-staff account
 * and an inactive one alike. The UI must not try to tell them apart, and does
 * not — distinguishing them would confirm which numbers belong to staff.
 */
function OfficerLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [fieldError, setFieldError] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitLogin(mobileNumber) {
    setSubmitting(true);
    setError(null);
    setFieldError(null);

    try {
      const challenge = await api.staffLogin(mobileNumber);

      navigate("/verify-otp", {
        replace: true,
        state: { challenge, purpose: "staff", phone: mobileNumber },
      });
    } catch (loginError) {
      const fields = translateFieldErrors(t, loginError);

      if (fields.phone) {
        setFieldError(fields.phone);
      } else {
        setError(loginError);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setFieldError(t("codes.fieldErrors.PHONE_INVALID_INDIAN_MOBILE"));
      return;
    }

    await submitLogin(phone);
  }

  /**
   * One tap: fills the seeded demo officer's number and starts the same
   * login call a real officer would make. The account behind it is a real
   * OFFICER row (server/imports/0005_demo_officer_accounts.sql), so this
   * exercises the actual login path, not a shortcut around it — the only
   * thing "demo" about it is that the OTP that follows is fixed rather than
   * random (see the demo code panel on the next screen).
   */
  async function handleDemoLogin(demoPhone) {
    if (submitting) return;
    setPhone(demoPhone);
    await submitLogin(demoPhone);
  }

  return (
    <div className="min-h-screen bg-[#f3f5f3] text-black">
      <header className="bg-[#0e8a48] text-white">
        <div className="mx-auto flex min-h-[72px] w-full max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate("/portal")}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-xl">
              🏛️
            </span>

            <span>
              <span className="block text-lg font-extrabold tracking-tight">
                {t("appName")}
              </span>

              <span className="hidden text-xs font-semibold text-white/80 sm:block">
                {t("staffPortal")}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="rounded-full border border-white/30 bg-white px-4 py-2 text-sm font-bold text-[#126d34] transition hover:bg-white/90"
            >
              {t("farmerLogin")}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-[1280px] items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="w-full max-w-[500px]">
          {DEMO_OTP_ENABLED && (
            <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-black">
                {t("demoAccessBanner") ||
                  "Demo Access — For SIH Prototype Evaluation"}
              </p>
            </div>
          )}

          <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-7 shadow-[0_8px_30px_rgba(16,64,42,0.06)] sm:px-8 sm:py-9 lg:px-10 lg:py-10">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                🏛️
              </div>

              <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-black">
                {t("staffLogin")}
              </p>

              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-black sm:text-3xl">
                {t("welcomeBack")}
              </h1>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-black">
                {t("enterMobileToContinue") ||
                  "Use your registered mobile number to receive an OTP."}
              </p>
            </div>

            {error && (
              <div className="mt-6">
                <ErrorState error={error} onRetry={() => setError(null)} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8" noValidate>
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-bold text-black"
                >
                  {t("mobileNumber")}
                </label>

                <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-50">
                  <span className="flex min-h-13 items-center border-r border-slate-200 bg-slate-50 px-4 text-sm font-bold text-black">
                    +91
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    maxLength={10}
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder={t("mobileNumberPlaceholder")}
                    onChange={(event) => {
                      setPhone(
                        event.target.value.replace(/\D/g, "").slice(0, 10),
                      );
                      setFieldError(null);
                    }}
                    className="min-h-13 min-w-0 flex-1 bg-white px-4 text-sm outline-none"
                  />
                </div>
                {fieldError && (
                  <p className="mt-2 text-xs text-black">{fieldError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="min-h-13 w-full rounded-xl bg-[#0e8a48] text-sm font-bold text-white transition hover:bg-[#0c763e] disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {submitting ? t("verifying") : `${t("continueToOtp")} →`}
              </button>

              <p className="mt-3 text-center text-xs leading-5 text-black">
                {t("otpWillBeSent")}
              </p>
            </form>

            {DEMO_OTP_ENABLED && (
              <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-black">
                  {t("useDemoOfficerAccount") || "Use Demo Officer Account"}
                </p>

                <p className="mt-1 text-xs leading-5 text-black">
                  {t("useDemoOfficerAccountNote") ||
                    "Seeded accounts, one per demonstration centre. The OTP on the next screen is fixed for these."}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {DEMO_OFFICERS.map((officer) => (
                    <button
                      key={officer.phone}
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDemoLogin(officer.phone)}
                      className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-black transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {officer.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-7 border-t border-slate-100 pt-5 text-center">
              <p className="text-sm text-black">
                {t("noOfficerAccount")}{" "}
                <button
                  type="button"
                  onClick={() => navigate("/staff-register")}
                  className="font-bold text-black hover:underline"
                >
                  {t("applyForAccount")}
                </button>
              </p>

              <p className="mt-3 text-sm text-black">
                {t("areYouFarmer")}{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="font-bold text-black hover:underline"
                >
                  {t("farmerLogin")}
                </button>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default OfficerLogin;
