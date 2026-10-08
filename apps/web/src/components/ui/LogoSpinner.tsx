export function LogoSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-14 w-14",
    lg: "h-24 w-24",
  };

  const imgSizes = {
    sm: "h-5 w-5",
    md: "h-9 w-9",
    lg: "h-16 w-16",
  };

  const pixelDimensions = {
    sm: 20,
    md: 36,
    lg: 64,
  };

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 aspect-square ${sizeClasses[size]}`}
      style={{ width: pixelDimensions[size] * 1.5, height: pixelDimensions[size] * 1.5 }}
    >
      <div className="absolute inset-0 rounded-full border-4 border-brand-100 border-t-brand-600 dark:border-brand-500/20 dark:border-t-brand-500 animate-spin" />

      <img
        src="/logo.png"
        alt="Harmony"
        width={pixelDimensions[size]}
        height={pixelDimensions[size]}
        loading="eager"
        decoding="async"
        {...{ fetchpriority: "high" }}
        className={`${imgSizes[size]} rounded-full object-cover shadow-sm shrink-0 aspect-square`}
      />
    </div>
  );
}
