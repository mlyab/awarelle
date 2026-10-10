import { useState } from "react";
import Phone, { Tab } from "./components/Phone";
import Console from "./components/Console";
import Today from "./screens/Today";
import Scan from "./screens/Scan";
import CheckIn from "./screens/CheckIn";
import Pattern from "./screens/Pattern";
import Settings from "./screens/Settings";
import Clinician from "./pages/Clinician";
import Employer from "./pages/Employer";
import { APP_NAME } from "./constants";

function Demo() {
  const [tab, setTab] = useState<Tab>("Today");
  const screen =
    tab === "Today" ? <Today /> :
    tab === "Scan" ? <Scan /> :
    tab === "Check-in" ? <CheckIn /> :
    tab === "Pattern" ? <Pattern /> :
    <Settings />;

  return (
    <div className="min-h-screen flex flex-col items-center py-8">
      <div className="w-full max-w-[860px] mb-4 px-2">
        <h1 className="text-3xl">{APP_NAME}</h1>
        <p className="text-muted text-sm">
          Hormone-first, sovereign-by-design. Computed on the phone. The cloud sees noise and ciphertext.
        </p>
      </div>
      <div className="flex gap-8 items-start">
        <Phone tab={tab} onTab={setTab}>{screen}</Phone>
        <Console />
      </div>
    </div>
  );
}

export default function App() {
  const path = window.location.pathname;
  if (path.startsWith("/clinician")) return <Clinician />;
  if (path.startsWith("/employer")) return <Employer />;
  return <Demo />;
}
