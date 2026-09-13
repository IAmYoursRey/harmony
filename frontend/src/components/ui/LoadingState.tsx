import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  className?: string;
  fullPage?: boolean;
}

export function LoadingState({
  message = "Memuat data...",
  className = "",
  fullPage = false,
}: LoadingStateProps) {
  const containerClass = fullPage
    ? "flex flex-col items-center justify-center min-h-[50vh] w-full"
    : `flex flex-col items-center justify-center p-8 w-full ${className}`;

  return (
    <div className={containerClass}>
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
      <p className="text-slate-500 text-sm animate-pulse">{message}</p>
    </div>
  );
}

export function SkeletonLoader({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded-md ${className}`}></div>
  );
}
