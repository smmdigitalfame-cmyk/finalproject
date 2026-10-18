interface CommentIconProps {
  className?: string;
  /** "white" = filled white bubble (for over-video).  "muted" = filled muted/grey bubble (for stats panel). */
  variant?: "white" | "muted";
  /** legacy prop kept for compatibility */
  invert?: boolean;
}

/**
 * TikTok-style comment icon: filled speech bubble with 3 dots cut out.
 */
export const CommentIcon = ({ className = "", variant, invert }: CommentIconProps) => {
  const resolved = variant ?? (invert ? "white" : "muted");
  const fill =
    resolved === "white"
      ? "#ffffff"
      : "#a3a3a3";
  const dotColor =
    resolved === "white"
      ? "rgba(0,0,0,0.85)"
      : "hsl(var(--card))";

  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: resolved === "white" ? "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" : undefined }}
    >
      {/* speech bubble */}
      <path
        d="M16 4C8.27 4 2 9.37 2 16c0 3.6 1.86 6.83 4.8 9.02L5.5 29l5.4-2.6c1.6.4 3.3.6 5.1.6 7.73 0 14-5.37 14-12S23.73 4 16 4z"
        fill={fill}
      />
      {/* 3 dots */}
      <circle cx="10.5" cy="15.5" r="1.6" fill={dotColor} />
      <circle cx="16" cy="15.5" r="1.6" fill={dotColor} />
      <circle cx="21.5" cy="15.5" r="1.6" fill={dotColor} />
    </svg>
  );
};

export default CommentIcon;
