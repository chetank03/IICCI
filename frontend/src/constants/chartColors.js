export const COLORS = {
  green:  "#22c55e",
  orange: "#f97316",
  purple: "#a78bfa",
  blue:   "#3b82f6",
};

const toNumber = (value) => Number(value) || 0;

export const fmtValue = (v) => {
  const value = toNumber(v);
  if (value >= 1000) return `€${(value / 1000).toFixed(1)}B`;
  if (value >= 1)    return `€${value.toFixed(0)}M`;
  return `€${(value * 1000).toFixed(0)}K`;
};

export const fmtTooltip = (v) => `€${toNumber(v).toFixed(2)}M`;

export const fmtTableValue = (v) => `€${toNumber(v).toFixed(2)}M`;
