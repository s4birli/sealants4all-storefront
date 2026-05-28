type StarsProps = { value: number; size?: number };

export function Stars({ value, size = 14 }: StarsProps) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className="stars" aria-label={`${value} stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill =
          i < full
            ? "#FFB800"
            : i === full && half
              ? `url(#half-star-${size})`
              : "#E5E7EB";
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`half-star-${size}`}>
                <stop offset="50%" stopColor="#FFB800" />
                <stop offset="50%" stopColor="#E5E7EB" />
              </linearGradient>
            </defs>
            <path
              fill={fill}
              d="M12 2.5l2.92 6.34 6.95.66-5.24 4.71 1.5 6.79L12 17.77l-6.13 3.23 1.5-6.79L2.13 9.5l6.95-.66L12 2.5z"
            />
          </svg>
        );
      })}
    </span>
  );
}
