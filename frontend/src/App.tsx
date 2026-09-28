import { NavLink, Route, HashRouter, Routes } from "react-router-dom";
import UpcomingMeetings from "./pages/UpcomingMeetings";
import MeetingCapture from "./pages/MeetingCapture";
import RelationshipMemory from "./pages/RelationshipMemory";
import MeetingPreparation from "./pages/MeetingPreparation";

const NAV = [
  { to: "/", label: "Upcoming Meetings" },
  { to: "/capture", label: "Meeting Capture" },
  { to: "/memory", label: "Relationship Memory" },
  { to: "/prepare", label: "Meeting Preparation" },
];

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-fuchsia-50 text-slate-900">
        <header className="sticky top-0 z-10 border-b border-white/60 bg-white/70 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <h1 className="flex items-center gap-2 text-lg font-bold">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-sm text-white shadow-sm shadow-indigo-300">
                M
              </span>
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Meeting Continuity Agent
              </span>
            </h1>
            <nav className="flex gap-1 text-sm">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `rounded-full px-3 py-1.5 font-medium transition-colors ${
                      isActive
                        ? "bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-sm shadow-indigo-300"
                        : "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">
          <Routes>
            <Route path="/" element={<UpcomingMeetings />} />
            <Route path="/capture" element={<MeetingCapture />} />
            <Route path="/memory" element={<RelationshipMemory />} />
            <Route path="/prepare" element={<MeetingPreparation />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
