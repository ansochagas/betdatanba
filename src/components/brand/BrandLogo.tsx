import { HTMLAttributes } from "react";
import BrandMark from "@/components/brand/BrandMark";

type BrandLogoProps = HTMLAttributes<HTMLSpanElement> & {
  size?: "sm" | "md" | "lg";
  showMark?: boolean;
  compact?: boolean;
};

const sizeMap = {
  sm: {
    mark: 24,
    wordmark: "text-xl",
    nba: "text-[0.72em] ml-1.5",
    gap: "gap-2.5",
  },
  md: {
    mark: 28,
    wordmark: "text-2xl",
    nba: "text-[0.7em] ml-2",
    gap: "gap-3",
  },
  lg: {
    mark: 34,
    wordmark: "text-3xl",
    nba: "text-[0.68em] ml-2.5",
    gap: "gap-3.5",
  },
} as const;

export default function BrandLogo({
  size = "md",
  showMark = true,
  compact = false,
  className = "",
  ...props
}: BrandLogoProps) {
  const config = sizeMap[size];

  return (
    <span
      className={`inline-flex items-center ${config.gap} whitespace-nowrap ${className}`.trim()}
      aria-label="BETDATA NBA"
      {...props}
    >
      {showMark && <BrandMark size={config.mark} />}
      <span
        className={`inline-flex items-end leading-none ${config.wordmark} font-black tracking-[-0.08em]`}
      >
        <span className="text-zinc-100">BET</span>
        <span className="text-[#D7A24B]">DATA</span>
        {!compact && (
          <span
            className={`${config.nba} font-bold tracking-[-0.06em] text-zinc-300`}
          >
            NBA
          </span>
        )}
      </span>
    </span>
  );
}

