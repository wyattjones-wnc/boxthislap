import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

export const SoccerBallIcon = forwardRef<SVGSVGElement, LucideProps>(
  function SoccerBallIcon(
    {
      absoluteStrokeWidth = false,
      className = "",
      color = "currentColor",
      size = 24,
      strokeWidth = 2,
      ...props
    },
    ref,
  ) {
    const resolvedStrokeWidth =
      absoluteStrokeWidth && typeof size === "number"
        ? (Number(strokeWidth) * 24) / size
        : strokeWidth;

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={resolvedStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`lucide lucide-soccer-ball ${className}`.trim()}
        {...props}
      >
        <circle cx="12" cy="12" r="9" />
        <path d="m12 7.3 3.7 2.7-1.4 4.4H9.7L8.3 10 12 7.3Z" />
        <path d="M12 7.3V3" />
        <path d="m15.7 10 4.1-1.3" />
        <path d="m14.3 14.4 2.5 3.7" />
        <path d="m9.7 14.4-2.5 3.7" />
        <path d="M8.3 10 4.2 8.7" />
        <path d="M12 3 8.4 4.1 4.2 8.7 3.5 12.8 7.2 18.1 12 21" />
        <path d="m12 3 3.6 1.1 4.2 4.6.7 4.1-3.7 5.3L12 21" />
      </svg>
    );
  },
);
