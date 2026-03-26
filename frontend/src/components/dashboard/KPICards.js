import { Icons } from "../../constants/dashboardIcons";
import { fmtValue } from "../../constants/chartColors";

function yoy(current, prev, prevSummary, activeYear) {
  if (!prevSummary || !activeYear || !prev || prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

export default function KPICards({ summary, prevSummary, productCount, activeYear }) {
  if (!summary) return null;

  const cards = [
    {
      label:  "Total Trade Volume",
      value:  summary.bilateral_trade_value,
      prev:   prevSummary?.bilateral_trade_value,
      sub:    "Bilateral trade value",
      icon:   "blue",
      iconEl: Icons.exchange,
    },
    {
      label:  "Imports from Italy",
      value:  summary.india_imports_from_italy,
      prev:   prevSummary?.india_imports_from_italy,
      sub:    "India's imports from Italy",
      icon:   "green",
      iconEl: Icons.trendUp,
    },
    {
      label:  "Imports from India",
      value:  summary.italy_imports_from_india,
      prev:   prevSummary?.italy_imports_from_india,
      sub:    "Italy's imports from India",
      icon:   "orange",
      iconEl: Icons.trendDown,
    },
    {
      label:  "Product Categories",
      value:  productCount,
      prev:   null,
      sub:    "HS4 codes in selection",
      icon:   "purple",
      iconEl: Icons.grid,
      raw:    true,
    },
  ];

  return (
    <div className="kpi-row">
      {cards.map(({ label, value, prev, sub, icon, iconEl, raw }) => {
        const pct = raw ? null : yoy(value, prev, prevSummary, activeYear);
        return (
          <div key={label} className="kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">{label}</span>
              <div className={`kpi-icon ${icon}`}>{iconEl}</div>
            </div>
            <span className="kpi-value">{raw ? value : fmtValue(value)}</span>
            {pct !== null && (
              <span className={`kpi-yoy ${pct >= 0 ? "kpi-yoy--up" : "kpi-yoy--down"}`}>
                {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}% vs {parseInt(activeYear) - 1}
              </span>
            )}
            <span className="kpi-sub">{sub}</span>
          </div>
        );
      })}
    </div>
  );
}
