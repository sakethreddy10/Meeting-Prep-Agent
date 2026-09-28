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
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <h1 className="text-lg font-semibold">Meeting Continuity Agent</h1>
            <nav className="flex gap-4 text-sm">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? "font-semibold text-indigo-600" : "text-slate-600 hover:text-slate-900"
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
