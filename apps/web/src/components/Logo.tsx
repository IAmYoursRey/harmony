/**
 * Harmony official logo — premium SVG with two variants.
 * Icon-only (circular) for navbar/sidebar/mobile; full (icon + wordmark) for landing/footer.
 */

interface LogoIconProps {
  size?: number;
  className?: string;
}

export function LogoIcon({ size = 40, className = "" }: LogoIconProps) {
  return (
    <img
      src="/logo.png"
      alt="Harmony"
      style={{ width: size, height: size }}
      className={`rounded-[20%] object-cover ${className}`}
      aria-hidden
    />
  );
}

interface LogoProps {
  variant?: "full" | "icon";
  size?: number;
  className?: string;
  textClassName?: string;
  /** Render text in white (for dark backgrounds like footer) */
  light?: boolean;
}

export function Logo({
  variant = "full",
  size = 40,
  className = "",
  textClassName = "",
  light = false,
}: LogoProps) {
  if (variant === "icon") {
    return <LogoIcon size={size} className={className} />;
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoIcon size={size * 1.5} />
    </span>
  );
}
