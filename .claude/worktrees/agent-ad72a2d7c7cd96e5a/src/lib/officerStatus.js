/**
 * The officer screens' internal status is the literal English word the
 * prototype was built against ("Cleared", "Weighing", ...), used throughout
 * as a comparison value — `farmer.status !== "Cleared"`, tab filters, and so
 * on. Renaming that internal token to something locale-neutral would touch
 * every comparison site across the module for no behavioural gain, so it
 * stays exactly as-is. This maps that token to display text only, for the
 * handful of places it's actually shown to the officer.
 */
const KEY_BY_STATUS = {
  Queued: "officerStatusQueued",
  Arrived: "arrived",
  Weighing: "officerStatusWeighing",
  "Quality check": "officerStatusQualityCheck",
  Recorded: "officerStatusRecorded",
  "Awaiting payment": "awaitingPayment",
  Cleared: "cleared",
  Processing: "officerStatusProcessing",
  Pending: "pending",
};

export function translateOfficerStatus(t, status) {
  const key = KEY_BY_STATUS[status];
  return key ? t(key) : status;
}

export default translateOfficerStatus;
