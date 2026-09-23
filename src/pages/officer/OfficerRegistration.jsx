import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import api from "../../lib/api";
import { translateError, translateFieldErrors } from "../../lib/codes";
import useApiResource from "../../hooks/useApiResource";
import LanguageToggle from "../../components/LanguageToggle";
import { ErrorState } from "../../components/StateViews";
import MultiSelect from "../../components/MultiSelect";
import DistrictSearchInput from "../../components/DistrictSearchInput";

const CONSENT_POLICY_VERSION = "v1";

/**
 * Officer account registration.
 *
 * Laid out like the farmer registration it sits beside, with the fields an
 * officer application needs: identity, district, procurement centre, and crop.
 *
 * Registration creates NO account. It submits a review request
 * (`officer_registration_requests`); an administrator with `officer.create`
 * approves or rejects it. There is no OTP step here — nothing exists yet to
 * verify a phone number against — so a successful submit shows a plain
 * confirmation instead of handing off to the OTP screen.
 */
function OfficerRegistration() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [centreId, setCentreId] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [cropIds, setCropIds] = useState([]);
  // Storage capacity in quintals, keyed by crop id. One entry per selected
  // crop; entries for a crop that gets deselected are dropped along with it.
  const [cropStorage, setCropStorage] = useState({});
  const [consent, setConsent] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // Set once the application is accepted for review. There is no account and
  // no OTP step to send the applicant to — an administrator decides next.
  const [submitted, setSubmitted] = useState(false);

  const districts = useApiResource((signal) => api.districts(signal), []);

  // Centres are fetched per district: the server rejects a centre that is not
  // in the district named, so offering the full list would only invite that
  // error.
  const centres = useApiResource(
    (signal) => api.registrationCentres(districtId, signal),
    [districtId],
    { enabled: Boolean(districtId) },
  );

  const centreOptions = centres.data ?? [];

  // The public, minimal crop list: this form runs before login, so it can't
  // call the session-gated /reference/crops. Not narrowed to one centre's
  // configured list, so an officer can register for every crop they handle.
  const crops = useApiResource((signal) => api.registrationCrops(signal), []);
  const cropOptions = crops.data ?? [];

  function clearFieldError(field) {
    setFieldErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  /** Saves a round trip only. The server re-applies every one of these. */
  function validate() {
    const errors = {};

    if (fullName.trim().length < 2) {
      errors.fullName = t("codes.fieldErrors.NAME_TOO_SHORT");
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      errors.phone = t("codes.fieldErrors.PHONE_INVALID_INDIAN_MOBILE");
    }

    if (!districtId) {
      errors.districtId = t("codes.fieldErrors.DISTRICT_ID_INVALID");
    }

    if (!centreId) {
      errors.centreId = t("codes.fieldErrors.CENTRE_ID_INVALID");
    }

    if (cropIds.length === 0) {
      errors.cropIds = t("codes.fieldErrors.CROP_ID_INVALID");
    } else if (
      cropIds.some((id) => !(Number(cropStorage[id]) > 0))
    ) {
      errors.cropStorage = t("codes.fieldErrors.CROP_STORAGE_REQUIRED");
    }

    if (!consent) {
      errors.consent = t("codes.fieldErrors.CONSENT_REQUIRED");
    }

    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const errors = validate();

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});

    try {
      const cropStorageQuintals = Object.fromEntries(
        cropIds.map((id) => [id, Number(cropStorage[id])]),
      );

      await api.staffRegister({
        fullName: fullName.trim(),
        phone: `+91${phone}`,
        districtId,
        centreId,
        employeeCode: employeeCode.trim() || undefined,
        cropIds,
        cropStorageQuintals,
        consent: { policyVersion: CONSENT_POLICY_VERSION, accepted: true },
      });

      // This creates a review request, not an account: there is no session
      // and nothing to verify by OTP yet, so there is nowhere to navigate to.
      // An administrator approves or rejects it; the applicant is told to
      // check back / sign in once that happens.
      setSubmitted(true);
    } catch (error) {
      const fields = translateFieldErrors(t, error);

      if (Object.keys(fields).length > 0) {
        setFieldErrors(fields);
      } else {
        setSubmitError(error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputClasses = (hasError) =>
    `min-h-13 w-full rounded-xl border bg-white px-4 text-sm text-black outline-none transition placeholder:text-black focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 ${
      hasError ? "border-red-400" : "border-slate-200"
    }`;

  const header = (
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
            onClick={() => navigate("/staff-login")}
            className="rounded-full border border-white/30 bg-white px-4 py-2 text-sm font-bold text-[#126d34] transition hover:bg-white/90"
          >
            {t("login")}
          </button>
        </div>
      </div>
    </header>
  );

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f3f5f3] text-black">
        {header}

        <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-[1000px] items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <section className="w-full max-w-[560px] rounded-[24px] border border-slate-200 bg-white p-7 text-center shadow-[0_8px_30px_rgba(16,64,42,0.06)] sm:p-9">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
              ✅
            </div>

            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-black">
              {t("applicationSubmitted") || "Application submitted"}
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-black">
              {t("applicationSubmittedDescription") ||
                "Your officer account application has been sent for review. There is no account yet — an administrator must approve it before you can sign in with this mobile number."}
            </p>

            <button
              type="button"
              onClick={() => navigate("/staff-login")}
              className="mt-6 min-h-13 w-full rounded-xl bg-[#0e8a48] text-sm font-bold text-white transition hover:bg-[#0c763e]"
            >
              {t("backToStaffLogin") || "Back to staff login"}
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f5f3] text-black">
      {header}

      <main className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <section className="mx-auto w-full max-w-[720px]">
          <div className="mb-7 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
              🏛️
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-black">
              {t("officer")}
            </p>

            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-black sm:text-3xl">
              {t("officerRegistration")}
            </h1>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-black">
              {t("officerRegistrationDescription")}
            </p>
          </div>

          {submitError && (
            <ErrorState
              error={submitError}
              className="mb-5"
              onRetry={() => setSubmitError(null)}
            />
          )}

          <div className="rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(16,64,42,0.06)]">
            <form
              onSubmit={handleSubmit}
              className="p-5 sm:p-7 lg:p-8"
              noValidate
            >
              {/* ---- identity ---------------------------------------------- */}
              <div className="border-b border-slate-100 pb-6">
                <h2 className="text-base font-extrabold text-black">
                  {t("personalDetails")}
                </h2>

                <p className="mt-1 text-xs leading-5 text-black">
                  {t("officerPersonalDetailsDescription")}
                </p>

                <div className="mt-5 space-y-5">
                  <div>
                    <label
                      htmlFor="fullName"
                      className="mb-2 block text-sm font-bold text-black"
                    >
                      {t("fullName")}
                    </label>

                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      autoComplete="name"
                      placeholder={t("fullNamePlaceholder")}
                      onChange={(event) => {
                        setFullName(event.target.value);
                        clearFieldError("fullName");
                      }}
                      className={inputClasses(fieldErrors.fullName)}
                    />

                    {fieldErrors.fullName && (
                      <p className="mt-2 text-xs font-semibold text-red-700">
                        {fieldErrors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-2 block text-sm font-bold text-black"
                    >
                      {t("mobileNumber")}
                    </label>

                    <div
                      className={`flex overflow-hidden rounded-xl border bg-white transition focus-within:ring-4 focus-within:ring-emerald-50 ${
                        fieldErrors.phone
                          ? "border-red-400 focus-within:border-red-500"
                          : "border-slate-200 focus-within:border-emerald-500"
                      }`}
                    >
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
                          clearFieldError("phone");
                        }}
                        className="min-h-13 min-w-0 flex-1 bg-white px-4 text-sm text-black outline-none placeholder:text-black"
                      />
                    </div>

                    {fieldErrors.phone && (
                      <p className="mt-2 text-xs font-semibold text-red-700">
                        {fieldErrors.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ---- assignment -------------------------------------------- */}
              <div className="border-b border-slate-100 py-6">
                <h2 className="text-base font-extrabold text-black">
                  {t("postingDetails")}
                </h2>

                <p className="mt-1 text-xs leading-5 text-black">
                  Select your district, procurement centre, and the crops you
                  handle.
                </p>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="districtId"
                      className="mb-2 block text-sm font-bold text-black"
                    >
                      {t("district")}
                    </label>

                    <DistrictSearchInput
                      districts={districts.data ?? []}
                      selectedDistrictId={districtId}
                      onSelectDistrict={(id) => {
                        setDistrictId(id);
                        /*
                         * The centre belongs to one district, so the previous
                         * choice cannot survive a change of district. The
                         * state still holds the previous id and would be
                         * submitted, which the server correctly rejects with
                         * CENTRE_NOT_IN_DISTRICT. Crop choices are independent
                         * of centre, so they are left as they are.
                         */
                        setCentreId("");
                        clearFieldError("districtId");
                        clearFieldError("centreId");
                      }}
                      disabled={districts.loading}
                      error={fieldErrors.districtId}
                    />

                    {districts.error && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-xs font-semibold text-black">
                          {t("districtsUnavailable")}{" "}
                          {translateError(t, districts.error)}
                        </p>

                        <button
                          type="button"
                          onClick={districts.reload}
                          className="text-xs font-bold text-black hover:underline"
                        >
                          {t("tryAgain")}
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="centreId"
                      className="mb-2 block text-sm font-bold text-black"
                    >
                      {t("procurementCentre")}
                    </label>

                    <select
                      id="centreId"
                      value={centreId}
                      disabled={!districtId || centres.loading}
                      onChange={(event) => {
                        setCentreId(event.target.value);
                        clearFieldError("centreId");
                      }}
                      className={inputClasses(
                        fieldErrors.centreId || centres.error,
                      )}
                    >
                      <option value="">
                        {!districtId
                          ? t("selectDistrictFirst")
                          : centres.loading
                            ? t("loading")
                            : t("selectProcurementCentre")}
                      </option>

                      {centreOptions.map((centre) => (
                        <option key={centre.id} value={centre.id}>
                          {centre.name}
                        </option>
                      ))}
                    </select>

                    {districtId &&
                      !centres.loading &&
                      !centres.error &&
                      centreOptions.length === 0 && (
                        <p className="mt-2 text-xs text-black">
                          {t("noCentresInDistrict")}
                        </p>
                      )}

                    {centres.error && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-xs font-semibold text-black">
                          {translateError(t, centres.error)}
                        </p>

                        <button
                          type="button"
                          onClick={centres.reload}
                          className="text-xs font-bold text-black hover:underline"
                        >
                          {t("tryAgain")}
                        </button>
                      </div>
                    )}

                    {fieldErrors.centreId && (
                      <p className="mt-2 text-xs font-semibold text-red-700">
                        {fieldErrors.centreId}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="employeeCode"
                    className="mb-2 block text-sm font-bold text-black"
                  >
                    {t("officerIdOptional")}
                  </label>

                  <input
                    id="employeeCode"
                    type="text"
                    value={employeeCode}
                    maxLength={64}
                    placeholder={t("officerIdPlaceholder")}
                    onChange={(event) => {
                      setEmployeeCode(event.target.value);
                      clearFieldError("employeeCode");
                    }}
                    className={inputClasses(fieldErrors.employeeCode)}
                  />

                  <p className="mt-1.5 text-xs leading-5 text-black">
                    {t("officerIdDemoNote")}
                  </p>

                  {fieldErrors.employeeCode && (
                    <p className="mt-1.5 text-xs font-semibold text-red-700">
                      {fieldErrors.employeeCode}
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="cropIds"
                    className="mb-2 block text-sm font-bold text-black"
                  >
                    {t("cropsAccepted")}
                  </label>

                  {crops.loading ? (
                    <p className="text-xs text-black">{t("loading")}</p>
                  ) : crops.error ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-xs font-semibold text-black">
                        {translateError(t, crops.error)}
                      </p>

                      <button
                        type="button"
                        onClick={crops.reload}
                        className="text-xs font-bold text-black hover:underline"
                      >
                        {t("tryAgain")}
                      </button>
                    </div>
                  ) : cropOptions.length === 0 ? (
                    <p className="text-xs text-black">
                      {t("noCropsAvailable")}
                    </p>
                  ) : (
                    <MultiSelect
                      id="cropIds"
                      options={cropOptions.map((crop) => ({
                        id: crop.id,
                        label: crop.canonicalName,
                      }))}
                      value={cropIds}
                      onChange={(next) => {
                        setCropIds(next);
                        setCropStorage((previous) =>
                          Object.fromEntries(
                            Object.entries(previous).filter(([id]) =>
                              next.includes(id),
                            ),
                          ),
                        );
                        clearFieldError("cropIds");
                        clearFieldError("cropStorage");
                      }}
                      placeholder={t("selectCrops") || "Select crops"}
                      error={Boolean(fieldErrors.cropIds)}
                      ariaLabel={t("cropsAccepted")}
                    />
                  )}

                  {fieldErrors.cropIds && (
                    <p className="mt-2 text-xs font-semibold text-red-700">
                      {fieldErrors.cropIds}
                    </p>
                  )}

                  {cropIds.length > 0 && (
                    <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold text-black">
                        {t("cropStorageCapacityQuintal")}
                      </p>
                      <p className="text-xs leading-5 text-black">
                        {t("cropStorageCapacityHint")}
                      </p>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {cropIds.map((id) => {
                          const crop = cropOptions.find(
                            (option) => option.id === id,
                          );

                          return (
                            <div key={id}>
                              <label
                                htmlFor={`crop-storage-${id}`}
                                className="mb-1.5 block text-xs font-semibold text-black"
                              >
                                {t("cropStorageCapacityForCrop", {
                                  crop: crop?.canonicalName ?? id,
                                })}
                              </label>

                              <input
                                id={`crop-storage-${id}`}
                                type="number"
                                min="0"
                                step="any"
                                inputMode="decimal"
                                value={cropStorage[id] ?? ""}
                                onChange={(event) => {
                                  setCropStorage((previous) => ({
                                    ...previous,
                                    [id]: event.target.value,
                                  }));
                                  clearFieldError("cropStorage");
                                }}
                                placeholder={t("quintal")}
                                className={inputClasses(
                                  Boolean(fieldErrors.cropStorage) &&
                                    !(Number(cropStorage[id]) > 0),
                                )}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {fieldErrors.cropStorage && (
                        <p className="text-xs font-semibold text-red-700">
                          {fieldErrors.cropStorage}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-6">
                <input
                  id="consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => {
                    setConsent(event.target.checked);
                    clearFieldError("consent");
                  }}
                  className="mt-0.5 h-4 w-4 accent-[#0e8a48]"
                />

                <label
                  htmlFor="consent"
                  className="text-xs leading-5 text-black"
                >
                  {t("officerConsentText")}
                </label>
              </div>

              {fieldErrors.consent && (
                <p className="mt-2 text-xs font-semibold text-red-700">
                  {fieldErrors.consent}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 min-h-13 w-full rounded-xl bg-[#0e8a48] text-sm font-bold text-white transition hover:bg-[#0c763e] disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {submitting ? t("submitting") : `${t("submitApplication")} →`}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-sm text-black">
            {t("alreadyHaveOfficerAccount")}{" "}
            <button
              type="button"
              onClick={() => navigate("/staff-login")}
              className="font-bold text-black hover:underline"
            >
              {t("staffLogin")}
            </button>
          </p>
        </section>
      </main>
    </div>
  );
}

export default OfficerRegistration;
