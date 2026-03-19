import { HTMLAttributes } from "react";

type BrandMarkProps = HTMLAttributes<HTMLSpanElement> & {
  size?: number;
};

export default function BrandMark({
  size = 28,
  className = "",
  ...props
}: BrandMarkProps) {
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
      {...props}
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#3A3E45"
          fillRule="evenodd"
          d="M10 8H29C43.5 8 54 17.8 54 32C54 46.2 43.5 56 29 56H10V8ZM20 17V47H28C37.3 47 44 40.9 44 32C44 23.1 37.3 17 28 17H20Z"
          clipRule="evenodd"
        />
        <path
          fill="#D7A24B"
          d="M23 14H31V50H23V14ZM31 18H36C42.4 18 46.5 21.9 46.5 27.3C46.5 31 44.6 33.8 41.2 35.1C45.4 36.4 48 39.5 48 44.1C48 50.4 43.2 54 35.8 54H31V46H35.1C38.7 46 40.8 44.4 40.8 41.4C40.8 38.7 38.8 37.1 35.2 37.1H31V29.8H34.6C37.9 29.8 39.8 28.2 39.8 25.7C39.8 23 37.8 21.5 34.6 21.5H31V18Z"
        />
      </svg>
    </span>
  );
}

