import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { crops, centreCropIds } from "../../data/crops";

function BookSlot() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [centre, setCentre] = useState("");
  const [cropId, setCropId] = useState("");
  const [cropSearch, setCropSearch] = useState("");
  const [showCropList, setShowCropList] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [voiceSuggestion, setVoiceSuggestion] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [quantityError, setQuantityError] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const centres = [
    "Procurement Centre 1",
    "Procurement Centre 2",
    "Procurement Centre 3",
  ];

  const slots = [
    {
      time: "09:00 AM - 10:00 AM",
      available: 6,
    },
    {
      time: "10:00 AM - 11:00 AM",
      available: 0,
    },
    {
      time: "11:00 AM - 12:00 PM",
      available: 3,
    },
    {
      time: "02:00 PM - 03:00 PM",
      available: 8,
    },
  ];

  const availableCrops = useMemo(() => {
    const ids = centreCropIds[centre] || [];

    return ids
      .map((id) => crops.find((item) => item.id === id))
      .filter(Boolean);
  }, [centre]);

  const selectedCrop = availableCrops.find(
    (item) => item.id === cropId
  );

  const normalizeText = (value) => {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const filteredCrops = useMemo(() => {
    const query = normalizeText(cropSearch);

    if (!query) {
      return availableCrops;
    }

    return availableCrops.filter((item) => {
      const values = [
        item.en,
        item.hi,
        ...item.aliases,
      ].map(normalizeText);

      return values.some((value) => value.includes(query));
    });
  }, [availableCrops, cropSearch]);

  const levenshteinDistance = (a, b) => {
    const matrix = Array.from(
      { length: b.length + 1 },
      () => Array(a.length + 1).fill(0)
    );

    for (let i = 0; i <= b.length; i += 1) {
      matrix[i][0] = i;
    }

    for (let j = 0; j <= a.length; j += 1) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i += 1) {
      for (let j = 1; j <= a.length; j += 1) {
        if (b[i - 1] === a[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  };

  const findCropFromSpeech = (spokenText) => {
    const normalizedSpeech = normalizeText(spokenText);

    if (!normalizedSpeech) {
      return null;
    }

    const exactMatch = availableCrops.find((item) => {
      const values = [
        item.en,
        item.hi,
        ...item.aliases,
      ].map(normalizeText);

      return values.includes(normalizedSpeech);
    });

    if (exactMatch) {
      return {
        crop: exactMatch,
        confidence: "exact",
      };
    }

    const containsMatches = availableCrops.filter((item) => {
      const values = [
        item.en,
        item.hi,
        ...item.aliases,
      ].map(normalizeText);

      return values.some(
        (value) =>
          value.length >= 3 &&
          (normalizedSpeech.includes(value) ||
            value.includes(normalizedSpeech))
      );
    });

    if (containsMatches.length > 0) {
      const bestContainsMatch = containsMatches.sort((a, b) => {
        const aLength = Math.max(
          a.en.length,
          a.hi.length,
          ...a.aliases.map((alias) => alias.length)
        );

        const bLength = Math.max(
          b.en.length,
          b.hi.length,
          ...b.aliases.map((alias) => alias.length)
        );

        return bLength - aLength;
      })[0];

      return {
        crop: bestContainsMatch,
        confidence: "suggestion",
      };
    }

    let bestCrop = null;
    let bestDistance = Infinity;

    availableCrops.forEach((item) => {
      const values = [
        item.en,
        item.hi,
        ...item.aliases,
      ].map(normalizeText);

      values.forEach((value) => {
        if (value.length < 3) {
          return;
        }

        const distance = levenshteinDistance(
          normalizedSpeech,
          value
        );

        if (distance < bestDistance) {
          bestDistance = distance;
          bestCrop = item;
        }
      });
    });

    const threshold =
      normalizedSpeech.length <= 5
        ? 2
        : Math.min(4, Math.floor(normalizedSpeech.length / 3));

    if (bestCrop && bestDistance <= threshold) {
      return {
        crop: bestCrop,
        confidence: "suggestion",
      };
    }

    return null;
  };

  const startVoiceSearch = () => {
    setVoiceMessage("");
    setVoiceSuggestion(null);

    if (!centre) {
      setVoiceMessage(t("selectCentreFirst"));
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceMessage(t("voiceNotSupported"));
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang =
      i18n.language === "hi" ? "hi-IN" : "en-IN";

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    setVoiceListening(true);

    recognition.onresult = (event) => {
      const results = Array.from(event.results || []);

      const transcripts = results.flatMap((result) =>
        Array.from(result || []).map(
          (alternative) => alternative.transcript
        )
      );

      let match = null;

      for (const transcript of transcripts) {
        match = findCropFromSpeech(transcript);

        if (match) {
          break;
        }
      }

      if (!match) {
        setVoiceMessage(t("voiceInvalid"));
        return;
      }

      const cropItem = match.crop;

      if (match.confidence === "exact") {
        setCropId(cropItem.id);
        setCropSearch("");
        setShowCropList(false);
        setVoiceSuggestion(null);
        setVoiceMessage(
          `${t("voiceSelected")}: ${
            i18n.language === "hi"
              ? cropItem.hi
              : cropItem.en
          }`
        );
        return;
      }

      setVoiceSuggestion(cropItem);
      setVoiceMessage(
        `${t("voiceSuggestion")}: ${
          i18n.language === "hi"
            ? cropItem.hi
            : cropItem.en
        }`
      );
    };

    recognition.onerror = () => {
      setVoiceMessage(t("voiceInvalid"));
      setVoiceListening(false);
    };

    recognition.onend = () => {
      setVoiceListening(false);
    };

    recognition.start();
  };

  const selectSuggestedCrop = () => {
    if (!voiceSuggestion) {
      return;
    }

    setCropId(voiceSuggestion.id);
    setCropSearch("");
    setShowCropList(false);
    setVoiceMessage(
      `${t("voiceSelected")}: ${
        i18n.language === "hi"
          ? voiceSuggestion.hi
          : voiceSuggestion.en
      }`
    );
    setVoiceSuggestion(null);
  };

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
  };

  const handleCentreChange = (value) => {
    setCentre(value);
    setCropId("");
    setCropSearch("");
    setShowCropList(false);
    setVoiceMessage("");
    setVoiceSuggestion(null);
    setTimeSlot("");
  };

  const handleQuantityChange = (value) => {
    setQuantity(value);

    if (value === "") {
      setQuantityError("");
      return;
    }

    const number = Number(value);

    if (
      !Number.isInteger(number) ||
      number < 1 ||
      number > 50
    ) {
      setQuantityError(
        t("maxQuantity") ||
          "Enter a quantity between 1 and 50 quintals."
      );
    } else {
      setQuantityError("");
    }
  };

  const handleReview = (e) => {
    e.preventDefault();

    const quantityNumber = Number(quantity);

    if (
      !centre ||
      !cropId ||
      !quantity ||
      !date ||
      !timeSlot
    ) {
      return;
    }

    if (
      !Number.isInteger(quantityNumber) ||
      quantityNumber < 1 ||
      quantityNumber > 50
    ) {
      setQuantityError(
        t("maxQuantity") ||
          "Enter a quantity between 1 and 50 quintals."
      );
      return;
    }

    setShowReview(true);
  };

  const handleConfirm = () => {
    const farmerData = JSON.parse(
      localStorage.getItem("farmerData") || "null"
    );

    const quantityNumber = Number(quantity);

    const newBooking = {
      bookingId: `FQ-${Math.floor(1000 + Math.random() * 9000)}`,
      centre,
      crop: selectedCrop?.en || "",
      cropHindi: selectedCrop?.hi || "",
      cropId: selectedCrop?.id || "",
      quantity: quantityNumber,
      quantityQuintal: quantityNumber,
      quantityUnit: "quintal",
      date,
      timeSlot,
      status: "Confirmed",
      createdAt: new Date().toISOString(),
      farmerPhone: farmerData?.phone || "",
    };

    const existingBookings = JSON.parse(
      localStorage.getItem("bookings") || "[]"
    );

    const migratedBookings =
      existingBookings.length > 0
        ? existingBookings
        : (() => {
            const oldBooking = JSON.parse(
              localStorage.getItem("bookingData") || "null"
            );

            return oldBooking ? [oldBooking] : [];
          })();

    const updatedBookings = [
      ...migratedBookings,
      newBooking,
    ];

    localStorage.setItem(
      "bookings",
      JSON.stringify(updatedBookings)
    );

    localStorage.setItem(
      "bookingData",
      JSON.stringify(newBooking)
    );

    window.dispatchEvent(new Event("bookingUpdated"));

    setShowSuccess(true);

    setTimeout(() => {
      navigate("/dashboard");
    }, 1800);
  };

  useEffect(() => {
    const closeDropdown = (event) => {
      if (!event.target.closest("[data-crop-picker]")) {
        setShowCropList(false);
      }
    };

    document.addEventListener("click", closeDropdown);

    return () => {
      document.removeEventListener("click", closeDropdown);
    };
  }, []);

  if (showSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-green-700 px-6">
        <div className="w-full max-w-sm text-center text-white">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white">
            <div className="text-6xl font-bold text-green-700">
              ✓
            </div>
          </div>

          <h1 className="mt-6 text-2xl font-bold">
            {t("bookingConfirmedTitle")}
          </h1>

          <p className="mt-2 text-sm leading-6 text-green-100">
            {t("bookingConfirmedMessage")}
          </p>

          <p className="mt-6 text-sm text-green-100">
            {t("redirectingToDashboard")}
          </p>
        </div>
      </div>
    );
  }

  if (showReview) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-green-700 text-white">
          <div className="mx-auto w-full max-w-lg px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowReview(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-2xl hover:bg-white/10"
              >
                ←
              </button>

              <div className="flex items-center rounded-full bg-white/15 p-1">
                <button
                  type="button"
                  onClick={() => changeLanguage("en")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    i18n.language === "en"
                      ? "bg-white text-green-700"
                      : "text-white"
                  }`}
                >
                  {t("english")}
                </button>

                <button
                  type="button"
                  onClick={() => changeLanguage("hi")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    i18n.language === "hi"
                      ? "bg-white text-green-700"
                      : "text-white"
                  }`}
                >
                  {t("hindi")}
                </button>
              </div>
            </div>

            <div className="pb-2 pt-5">
              <h1 className="text-2xl font-bold">
                {t("reviewBooking")}
              </h1>

              <p className="mt-1 text-sm text-green-100">
                {t("reviewBookingDescription")}
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-lg px-4 py-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-5 rounded-xl bg-green-50 p-4">
              <p className="text-xs font-medium text-green-700">
                {t("booking")}
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {date}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {timeSlot}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <span className="text-sm text-slate-500">
                  {t("procurementCentre")}
                </span>

                <span className="text-right text-sm font-semibold text-slate-900">
                  {centre}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <span className="text-sm text-slate-500">
                  {t("crop")}
                </span>

                <span className="text-right text-sm font-semibold text-slate-900">
                  {selectedCrop
                    ? i18n.language === "hi"
                      ? selectedCrop.hi
                      : selectedCrop.en
                    : ""}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <span className="text-sm text-slate-500">
                  {t("quantity")}
                </span>

                <span className="text-right text-sm font-semibold text-slate-900">
                  {quantity} {t("quintal") || "Quintal"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-slate-500">
                  {t("timeSlot")}
                </span>

                <span className="text-right text-sm font-semibold text-slate-900">
                  {timeSlot}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <div className="flex gap-3">
              <span className="text-xl">ℹ️</span>

              <p className="text-sm leading-5 text-amber-800">
                Please check your booking details carefully before confirming.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="mt-5 min-h-12 w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800"
          >
            {t("confirmBooking")} ✓
          </button>

          <button
            type="button"
            onClick={() => setShowReview(false)}
            className="mt-3 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
          >
            {t("back")}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50">
      <header className="bg-green-700 text-white">
        <div className="mx-auto w-full max-w-lg px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl hover:bg-white/10"
            >
              ←
            </button>

            <div className="flex shrink-0 items-center rounded-full bg-white/15 p-1">
              <button
                type="button"
                onClick={() => changeLanguage("en")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  i18n.language === "en"
                    ? "bg-white text-green-700"
                    : "text-white"
                }`}
              >
                {t("english")}
              </button>

              <button
                type="button"
                onClick={() => changeLanguage("hi")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  i18n.language === "hi"
                    ? "bg-white text-green-700"
                    : "text-white"
                }`}
              >
                {t("hindi")}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pb-2 pt-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl">
              📅
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                {t("bookSlot")}
              </h1>

              <p className="mt-1 text-sm text-green-100">
                {t("chooseCentreCropTime")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-5">
        <form onSubmit={handleReview} className="space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg">
                📍
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  {t("procurementCentre")}
                </h2>

                <p className="text-xs text-slate-500">
                  {t("selectCentreDescription")}
                </p>
              </div>
            </div>

            <select
              value={centre}
              onChange={(e) => handleCentreChange(e.target.value)}
              required
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            >
              <option value="">
                {t("selectProcurementCentre")}
              </option>

              {centres.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg">
                🌾
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  {t("crop")}
                </h2>

                <p className="text-xs text-slate-500">
                  {t("selectCropDescription")}
                </p>
              </div>
            </div>

            <div
              className="relative"
              data-crop-picker
            >
              <button
                type="button"
                onClick={() => {
                  if (centre) {
                    setShowCropList((value) => !value);
                  } else {
                    setVoiceMessage(t("selectCentreFirst"));
                  }
                }}
                className={`flex min-h-12 w-full items-center justify-between rounded-xl border px-3 text-left text-sm ${
                  centre
                    ? "border-slate-200 bg-slate-50"
                    : "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400"
                }`}
              >
                <span>
                  {selectedCrop
                    ? i18n.language === "hi"
                      ? selectedCrop.hi
                      : selectedCrop.en
                    : t("selectCrop")}
                </span>

                <span>⌄</span>
              </button>

              {showCropList && centre && (
                <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="flex items-center gap-2 border-b border-slate-100 p-2">
                    <input
                      type="text"
                      value={cropSearch}
                      onChange={(e) =>
                        setCropSearch(e.target.value)
                      }
                      autoFocus
                      placeholder={t("cropSearchPlaceholder")}
                      className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    />

                    <button
                      type="button"
                      onClick={startVoiceSearch}
                      disabled={voiceListening}
                      title={t("voiceInput")}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${
                        voiceListening
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {voiceListening ? "●" : "🎤"}
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    {filteredCrops.length > 0 ? (
                      filteredCrops.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setCropId(item.id);
                            setCropSearch("");
                            setShowCropList(false);
                            setVoiceMessage("");
                            setVoiceSuggestion(null);
                          }}
                          className="flex w-full items-center justify-between border-b border-slate-50 px-4 py-3 text-left hover:bg-green-50"
                        >
                          <span className="text-sm font-medium text-slate-800">
                            {i18n.language === "hi"
                              ? item.hi
                              : item.en}
                          </span>

                          <span className="text-xs text-slate-400">
                            {i18n.language === "hi"
                              ? item.en
                              : item.hi}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-4 py-4 text-center text-sm text-slate-500">
                        {t("searchNoCrop")}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {voiceListening && (
              <div className="mt-3 rounded-xl bg-green-50 px-3 py-3 text-sm text-green-700">
                <div className="flex items-center gap-2">
                  <span className="animate-pulse">🎤</span>
                  <span>{t("voiceListening")}</span>
                </div>
              </div>
            )}

            {voiceMessage && !voiceListening && (
              <div
                className={`mt-3 rounded-xl px-3 py-3 text-sm ${
                  voiceSuggestion
                    ? "bg-amber-50 text-amber-800"
                    : cropId
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                <p>{voiceMessage}</p>

                {voiceSuggestion && (
                  <button
                    type="button"
                    onClick={selectSuggestedCrop}
                    className="mt-2 rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white"
                  >
                    {i18n.language === "hi"
                      ? voiceSuggestion.hi
                      : voiceSuggestion.en}
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg">
                ⚖️
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  {t("quantity")}
                </h2>

                <p className="text-xs text-slate-500">
                  {t("quantityDescription")}
                </p>
              </div>
            </div>

            <div className="flex">
              <input
                type="number"
                min="1"
                max="50"
                step="1"
                value={quantity}
                onChange={(e) =>
                  handleQuantityChange(e.target.value)
                }
                placeholder={t("enterQuantity")}
                required
                className="min-w-0 flex-1 rounded-l-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />

              <span className="flex items-center rounded-r-xl border border-l-0 border-slate-200 bg-slate-100 px-3 text-sm text-slate-500">
                {t("quintal") || "Quintal"}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              {t("maxQuantity") ||
                "Maximum 50 quintals per booking."}
            </p>

            {quantityError && (
              <p className="mt-2 text-xs font-medium text-red-600">
                {quantityError}
              </p>
            )}
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg">
                📅
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  {t("date")}
                </h2>

                <p className="text-xs text-slate-500">
                  {t("selectDateDescription")}
                </p>
              </div>
            </div>

            <input
              type="date"
              min={today}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setTimeSlot("");
              }}
              required
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </section>

          {date && (
            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg">
                  🕐
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    {t("timeSlot")}
                  </h2>

                  <p className="text-xs text-slate-500">
                    {t("chooseTimeDescription")}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {slots.map((slot) => {
                  const isAvailable = slot.available > 0;
                  const isSelected = timeSlot === slot.time;

                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        if (isAvailable) {
                          setTimeSlot(slot.time);
                        }
                      }}
                      className={`flex min-h-14 w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? "border-green-600 bg-green-50"
                          : isAvailable
                          ? "border-slate-200 bg-slate-50 hover:border-green-400"
                          : "cursor-not-allowed border-slate-100 bg-slate-100 opacity-60"
                      }`}
                    >
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            isSelected
                              ? "text-green-700"
                              : "text-slate-700"
                          }`}
                        >
                          {slot.time}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {isAvailable
                            ? `${slot.available} ${t(
                                "slotsAvailable"
                              )}`
                            : t("slotFull")}
                        </p>
                      </div>

                      {isSelected && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-700 text-sm text-white">
                          ✓
                        </span>
                      )}

                      {!isAvailable && (
                        <span className="text-xs font-semibold text-slate-400">
                          {t("full")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <button
            type="submit"
            disabled={
              !centre ||
              !cropId ||
              !quantity ||
              !date ||
              !timeSlot ||
              !!quantityError
            }
            className={`min-h-12 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${
              centre &&
              cropId &&
              quantity &&
              date &&
              timeSlot &&
              !quantityError
                ? "bg-green-700 hover:bg-green-800"
                : "cursor-not-allowed bg-slate-300"
            }`}
          >
            {t("reviewBooking")} →
          </button>
        </form>
      </main>
    </div>
  );
}

export default BookSlot;