import { AlertTriangle, X } from "lucide-react";
import { DisasterType } from "./types";

interface DisasterAlertProps {
  type: DisasterType;
  onDismiss?: () => void;
}

export function DisasterAlert({ type, onDismiss }: DisasterAlertProps) {
  let title = "EMERGENCY ALERT";
  let message = "Follow the evacuation arrow.";
  let severity = "high";

  if (type === "earthquake") {
    title = "EARTHQUAKE DETECTED";
    message =
      "Moderate magnitude. Drop, Cover, and Hold On, then follow evacuation routes.";
  } else if (type === "fire") {
    title = "FIRE ALARM ACTIVATED";
    message =
      "Fire detected in the sector. Evacuate immediately via the highlighted route. Do not use elevators.";
  } else if (type === "flood") {
    title = "FLOOD WARNING";
    message =
      "Water levels rising rapidly. Move to higher ground or nearest safe zone.";
    severity = "medium";
  }

  return (
    <div
      className={`fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 rounded-xl p-4 shadow-2xl flex gap-4 animate-in fade-in slide-in-from-top-10 ${
        severity === "high"
          ? "bg-red-600 text-white"
          : "bg-amber-500 text-white"
      }`}
    >
      <div className="shrink-0 animate-pulse">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <div className="flex-1">
        <h4 className="font-black text-lg tracking-wide uppercase">{title}</h4>
        <p className="text-sm opacity-90 mt-1">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 opacity-80 hover:opacity-100"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
