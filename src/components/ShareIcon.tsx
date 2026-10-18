import shareIcon from "@/assets/share-icon.png";

interface ShareIconProps {
  className?: string;
  style?: React.CSSProperties;
  variant?: "white" | "muted" | "dark";
}

export const ShareIcon = ({ className, style, variant = "white" }: ShareIconProps) => {
  const filterClass =
    variant === "dark"
      ? "[filter:brightness(0)]"
      : variant === "muted"
      ? "[filter:brightness(0)] opacity-40 dark:[filter:brightness(0)_invert(1)] dark:opacity-55"
      : "[filter:brightness(0)_invert(1)]";

  return (
    <img
      src={shareIcon}
      alt=""
      className={`${filterClass} ${className ?? ""}`}
      style={{ objectFit: "contain", ...style }}
    />
  );
};

export default ShareIcon;
