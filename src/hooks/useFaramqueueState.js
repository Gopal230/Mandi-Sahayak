import { useEffect, useMemo, useRef, useState } from "react";

const getDateValue = (date = new Date()) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

const createQueueForDate = (date) => [];

const initialStorage = [
  { crop: "Wheat", stock: 1040, capacity: 1500 },
  { crop: "Rice", stock: 820, capacity: 1200 },
  { crop: "Mustard", stock: 640, capacity: 900 },
];

const STORAGE_KEY = "faramqueue.daily.state.v1";

const normalizeFarmerBooking = (booking, fallbackDate) => {
  const normalized = booking && typeof booking === "object" ? booking : {};
  const dateValue = normalized.date ?? fallbackDate ?? getDateValue();
  const generatedId =
    normalized.id ??
    `farmer-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  return {
    ...normalized,
    id: String(generatedId),
    name: normalized.name ?? "Farmer",
    phone: normalized.phone ?? normalized.mobile ?? "",
    slot: normalized.slot ?? "N/A",
    crop: normalized.crop ?? "General",
    quantity: Number(normalized.quantity ?? 0),
    token: normalized.token ?? `FQ-${Date.now().toString().slice(-6)}`,
    status: normalized.status ?? "Queued",
    actualWeight: normalized.actualWeight ?? "",
    paidAmount: normalized.paidAmount ?? "",
    lateMinutes: normalized.lateMinutes ?? "",
    paymentStatus: normalized.paymentStatus ?? "Pending",
    reportSaved: Boolean(normalized.reportSaved),
    date: dateValue,
  };
};

const loadState = () => {
  const today = getDateValue();
  const fallback = {
    selectedDate: today,
    dailyQueueByDate: { [today]: [] },
    storage: initialStorage,
    dateRecords: { [today]: [] },
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);

    return {
      selectedDate: parsed.selectedDate ?? today,
      dailyQueueByDate: parsed.dailyQueueByDate ?? { [today]: [] },
      storage: parsed.storage ?? initialStorage,
      dateRecords: parsed.dateRecords ?? { [today]: [] },
    };
  } catch (error) {
    return fallback;
  }
};

export const useFaramqueueState = () => {
  const persistedState = loadState();
  const alertTimerRef = useRef(null);

  const [selectedDate, setSelectedDate] = useState(persistedState.selectedDate);
  const [dailyQueueByDate, setDailyQueueByDate] = useState(
    persistedState.dailyQueueByDate,
  );
  const [storage, setStorage] = useState(persistedState.storage);
  const [selectedReportFarmerId, setSelectedReportFarmerId] = useState(null);
  const [dateRecords, setDateRecords] = useState(persistedState.dateRecords);
  const [paymentAlert, setPaymentAlert] = useState(null);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        selectedDate,
        dailyQueueByDate,
        storage,
        dateRecords,
      }),
    );
  }, [selectedDate, dailyQueueByDate, storage, dateRecords]);

  const farmers = dailyQueueByDate[selectedDate] ?? [];

  const selectedDateEntries = useMemo(() => {
    const queueEntries = farmers
      .filter(
        (farmer) =>
          farmer.status === "Cleared" ||
          farmer.paymentStatus === "Cleared" ||
          farmer.reportSaved,
      )
      .map((farmer) => ({ ...farmer, date: farmer.date ?? selectedDate }));

    const historicalEntries = (dateRecords[selectedDate] ?? []).map((entry) => ({
      ...entry,
      date: entry.date ?? selectedDate,
    }));

    const mergedEntries = [...historicalEntries, ...queueEntries];
    const byId = {};

    mergedEntries.forEach((entry) => {
      byId[String(entry.id)] = entry;
    });

    return Object.values(byId).sort(
      (a, b) => Number(b.id) - Number(a.id),
    );
  }, [dateRecords, farmers, selectedDate]);

  const queueStats = useMemo(() => {
    const queued = farmers.filter((farmer) => farmer.status !== "Cleared").length;
    const processed = farmers.filter((farmer) => farmer.status === "Cleared").length;

    return [
      {
        label: "Total today",
        value: String(farmers.length),
        tone: "bg-[#f7d9b5]",
      },
      { label: "In queue", value: String(queued), tone: "bg-[#f3e2c3]" },
      { label: "Processed", value: String(processed), tone: "bg-[#e8f0d9]" },
    ];
  }, [farmers]);

  const showPaymentAlert = (message, tone = "warning") => {
    setPaymentAlert({ message, tone });

    if (alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
    }

    alertTimerRef.current = setTimeout(() => {
      setPaymentAlert(null);
    }, 2800);
  };

  const updateFarmer = (id, field, value) => {
    setDailyQueueByDate((prev) => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] ?? []).map((farmer) =>
        farmer.id === id ? { ...farmer, [field]: value } : farmer,
      ),
    }));
  };

  const handleDateChange = (nextDate) => {
    if (!nextDate || nextDate === selectedDate) return;

    setSelectedDate(nextDate);
    setSelectedReportFarmerId(null);

    setDailyQueueByDate((prev) => ({
      ...prev,
      [nextDate]: prev[nextDate] ?? createQueueForDate(nextDate),
    }));
  };

  const handlePaymentStatusChange = (id, nextStatus) => {
    const farmer = farmers.find((entry) => entry.id === id);
    if (!farmer) return;

    const currentStatus = farmer.paymentStatus ?? "Pending";

    if (currentStatus === "Cleared" && nextStatus !== "Cleared") {
      showPaymentAlert(
        "This payment was already cleared and cannot be changed back.",
        "danger",
      );
      return;
    }

    if (nextStatus === "Cleared") {
      showPaymentAlert(
        "Payment marked as cleared. This action is locked in.",
        "success",
      );
    }

    updateFarmer(id, "paymentStatus", nextStatus);
  };

  const saveFarmerReport = (id, report) => {
    const targetFarmer = farmers.find((farmer) => farmer.id === id);
    if (!targetFarmer) return;

    const actualWeight = Number(report.actualWeight || 0);
    const money = Number(report.money || 0);
    const lateMinutes = Number(report.lateMinutes || 0);
    const paymentStatus = report.paymentStatus ?? "Pending";

    const updatedFarmer = {
      ...targetFarmer,
      actualWeight: String(actualWeight),
      paidAmount: String(money),
      lateMinutes: String(lateMinutes),
      paymentStatus,
      status: "Cleared",
      reportSaved: true,
      date: selectedDate,
    };

    setDailyQueueByDate((prev) => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] ?? []).map((farmer) =>
        farmer.id === id ? updatedFarmer : farmer,
      ),
    }));

    setDateRecords((prev) => ({
      ...prev,
      [selectedDate]: [
        ...(prev[selectedDate] ?? []).filter((entry) => entry.id !== id),
        updatedFarmer,
      ],
    }));

    if (paymentStatus === "Cleared") {
      showPaymentAlert(
        "Payment marked cleared for this slot. This action is locked.",
        "success",
      );
    }

    if (actualWeight > 0) {
      setStorage((prevStorage) =>
        prevStorage.map((item) =>
          item.crop === targetFarmer.crop
            ? { ...item, stock: Number(item.stock) + actualWeight }
            : item,
        ),
      );
    }
  };

  const addFarmer = (newFarmer) => {
    const incomingFarmer = normalizeFarmerBooking(
      newFarmer,
      newFarmer?.date ?? selectedDate,
    );
    const targetDate = incomingFarmer.date ?? selectedDate;

    setSelectedDate(targetDate);
    setDailyQueueByDate((prev) => ({
      ...prev,
      [targetDate]: [
        ...(prev[targetDate] ?? []),
        {
          ...incomingFarmer,
          status: incomingFarmer.status ?? "Queued",
          actualWeight: incomingFarmer.actualWeight ?? "",
          paidAmount: incomingFarmer.paidAmount ?? "",
          lateMinutes: incomingFarmer.lateMinutes ?? "",
          paymentStatus: incomingFarmer.paymentStatus ?? "Pending",
          reportSaved: Boolean(incomingFarmer.reportSaved),
          date: targetDate,
        },
      ],
    }));

    return incomingFarmer;
  };

  const clearFarmer = (id) => {
    const targetFarmer = farmers.find((farmer) => farmer.id === id);
    if (!targetFarmer) return null;

    setSelectedReportFarmerId(id);

    setDailyQueueByDate((prev) => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] ?? []).map((farmer) =>
        farmer.id === id
          ? { ...farmer, status: "Cleared", reportSaved: false }
          : farmer,
      ),
    }));

    return targetFarmer;
  };

  const verifyFarmer = (id) => {
    setDailyQueueByDate((prev) => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] ?? []).map((farmer) =>
        farmer.id === id ? { ...farmer, status: "Verified" } : farmer,
      ),
    }));
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleBookingEvent = (event) => {
      const payload = event?.detail ?? null;
      if (!payload) return;
      addFarmer(payload);
    };

    const handleStorageEvent = (event) => {
      if (event.key !== "faramqueue.booking" || !event.newValue) return;

      try {
        const payload = JSON.parse(event.newValue);
        addFarmer(payload);
      } catch (error) {
        return;
      }
    };

    window.addEventListener("faramqueue:book-slot", handleBookingEvent);
    window.addEventListener("storage", handleStorageEvent);
    window.faramqueueBookFarmer = (payload) => addFarmer(payload);

    return () => {
      window.removeEventListener("faramqueue:book-slot", handleBookingEvent);
      window.removeEventListener("storage", handleStorageEvent);
      if (window.faramqueueBookFarmer) {
        delete window.faramqueueBookFarmer;
      }
    };
  }, [selectedDate]);

  const updateActualWeight = (id, weight) => {
    updateFarmer(id, "actualWeight", weight);
  };

  const updateCropStorage = (crop, delta) => {
    setStorage((prev) =>
      prev.map((item) =>
        item.crop === crop
          ? {
              ...item,
              stock: Math.max(0, Number(item.stock) + Number(delta)),
            }
          : item,
      ),
    );
  };

  return {
    selectedDate,
    farmers,
    storage,
    queueStats,
    paymentAlert,
    selectedDateEntries,
    selectedReportFarmerId,
    addFarmer,
    clearFarmer,
    saveFarmerReport,
    handleDateChange,
    handlePaymentStatusChange,
    updateFarmer,
    verifyFarmer,
    updateActualWeight,
    updateCropStorage,
  };
};
