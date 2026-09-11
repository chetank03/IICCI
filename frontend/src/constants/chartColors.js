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

// A null value means the source workbook left the cell blank: no figure was
// reported. That is not the same as a reported zero, so it must not render as
// "€0.00M".
export const NO_DATA = "\u2014";

export const fmtTableValue = (v) =>
  v === null || v === undefined || v === "" ? NO_DATA : `€${toNumber(v).toFixed(2)}M`;
