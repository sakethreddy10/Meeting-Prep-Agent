// Shared gradient-theme class fragments, kept in one place so the four pages
// stay visually consistent.

export const card =
  "rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg shadow-indigo-100/50 backdrop-blur-sm";

export const primaryButton =
  "rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-2.5 font-medium text-white " +
  "shadow-md shadow-indigo-300/50 transition-transform hover:scale-[1.02] hover:shadow-lg " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100";

export const secondaryButton =
  "rounded-full border border-indigo-200 bg-white px-5 py-2.5 font-medium text-indigo-700 " +
  "transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50";

export const input =
  "w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 shadow-sm outline-none " +
  "transition-shadow focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200";

export const label = "block text-sm font-medium text-slate-700";

export function badge(variant: "indigo" | "green" | "amber" | "slate" = "indigo") {
  const variants: Record<string, string> = {
    indigo: "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white",
    green: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white",
    amber: "bg-gradient-to-r from-amber-400 to-orange-500 text-white",
    slate: "bg-slate-200 text-slate-700",
  };
  return `rounded-full px-2.5 py-1 text-xs font-semibold ${variants[variant]}`;
}

export const errorBanner =
  "rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-4 text-red-700";

export const sectionHeading = "text-base font-semibold text-slate-800";
