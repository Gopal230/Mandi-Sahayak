import { NavLink } from "react-router-dom";

export const Navbar = () => {
  const navItems = [
    { label: "Queue", to: "/queue" },
    { label: "Storage", to: "/storage" },
    { label: "Payments", to: "/payments" },
    { label: "Reports", to: "/reports" },
  ];

  const getNavClass = ({ isActive }) =>
    [
      "flex shrink-0 items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold transition sm:px-4",
      isActive
        ? "border-[#9e5e36] bg-[#9e5e36] text-white shadow-lg shadow-[#9e5e36]/25"
        : "border-[#d7b17a] bg-[#f5d7a8] text-[#4a2f22] hover:bg-[#f0c98d]",
    ].join(" ");

  return (
    <header className="rounded-[28px] border border-[#d7b17a] bg-[#f7e5c3]/90 p-3 shadow-[0_18px_40px_rgba(121,79,45,0.12)] backdrop-blur-sm sm:p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5640]">
            Procurement dashboard
          </p>
          <h1 className="text-xl font-black leading-tight text-[#3d281b] sm:text-2xl">
            Roorkee Procurement Center
          </h1>
          <p className="text-sm font-medium text-[#6d4d38]">
            Officer Name • 31 Aug 2026 • Kharif Season
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="rounded-xl border-2 border-[#d9b37c] bg-[#f3d5ae] px-2 py-2 text-xs font-semibold text-[#5f3f2d] sm:px-3 sm:text-sm">
            Center ID: RKE-01
          </span>
          <button className="rounded-full border border-[#b67549] bg-[#9e5e36] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8c502a]">
            Open
          </button>
        </div>
      </div>

      <nav className="mt-5 flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:gap-3 sm:overflow-visible sm:pb-0">
        {navItems.map(({ label, to }) => (
          <NavLink key={label} to={to} className={getNavClass}>
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
};
