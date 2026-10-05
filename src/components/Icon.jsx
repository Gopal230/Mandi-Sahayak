const ICONS = {
  alert: ["M12 9v4m0 4h.01M10.3 3.9 2.5 17.2a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
  building: ["M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01M15 13v.01M15 16v.01M15 19v.01"],
  calendar: ["M8 2v4m8-4v4M3 10h18", "M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z", "M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"],
  check: ["m5 12 4 4L19 6"],
  clock: ["M12 8v4l3 2", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"],
  close: ["m18 6-12 12M6 6l12 12"],
  compass: ["m16.2 7.8-4.2 8.4-4.2-4.2 8.4-4.2Z", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"],
  creditCard: ["M2 7h20v13H2z", "M2 11h20M6 16h3"],
  edit: ["m16 4 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"],
  globe: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M2 12h20", "M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z"],
  grain: ["M12 22V8m0 6c-5 0-8-3-8-8 5 0 8 3 8 8Zm0-3c0-5 3-8 8-8 0 5-3 8-8 8Z", "M8 22h8"],
  grid: ["M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"],
  home: ["m3 10 9-7 9 7v11h-6v-7H9v7H3z"],
  hourglass: ["M5 3h14M5 21h14M7 3v4l5 5-5 5v4m10-18v4l-5 5 5 5v4"],
  inbox: ["M4 4h16l2 11v5H2v-5L4 4Z", "M2 15h6l2 3h4l2-3h6"],
  info: ["M12 11v5m0-9h.01", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"],
  lock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4"],
  phone: ["M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.7L7.1 10a16 16 0 0 0 6 6l1.6-1.9a2 2 0 0 1 1.7-.6l3 .5a2 2 0 0 1 1.6 2Z"],
  pin: ["M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z", "M12 10h.01"],
  pdf: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M8 13h2a1.5 1.5 0 0 1 0 3H8v3", "M14 19v-6h1a3 3 0 0 1 0 6h-1"],
  queue: ["M4 6h16M4 12h16M4 18h16"],
  refresh: ["M20 7v5h-5M4 17v-5h5", "M5.6 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.4-3"],
  search: ["M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z", "m21 21-4.3-4.3"],
  scale: ["m16 3 5 5M2 22l5-5M14 5 4 15m6 2 10-10M5 22h14M12 17v5", "M7 8 4 5m13 3 3-3"],
  store: ["M3 10h18l-2-7H5l-2 7Zm2 0v11h14V10", "M9 21v-6h6v6"],
  ticket: ["M3 7V4h18v3a3 3 0 0 0 0 6v7H3v-7a3 3 0 0 0 0-6Z", "M13 4v2m0 3v2m0 3v2m0 3v1"],
  user: ["M20 21a8 8 0 0 0-16 0", "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"],
  walker: ["M13 5h.01M11 21l2-6-3-3 2-5 4 2 2 4", "m8 21 2-5-3-3 2-4", "M14 7l-2 3"],
};

export default function Icon({ name, className = "h-5 w-5", ...props }) {
  const paths = ICONS[name];

  if (!paths) {
    throw new Error(`Unknown icon: ${name}`);
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      {...props}
    >
      {paths.map((d, index) => (
        <path
          key={index}
          d={d}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
