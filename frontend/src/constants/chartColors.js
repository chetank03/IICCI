export const COLORS = {
  green:  "#22c55e",
  orange: "#f97316",
  purple: "#a78bfa",
  blue:   "#3b82f6",
};

export const fmtValue = (v) => {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}B`;
  if (v >= 1)    return `$${v.toFixed(0)}M`;
  return `$${(v * 1000).toFixed(0)}K`;
};

export const fmtTooltip = (v) => `$${v.toFixed(2)}M`;
