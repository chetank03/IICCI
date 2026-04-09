import { useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { Icons } from "../../constants/dashboardIcons";
import { COLORS, fmtValue, fmtTooltip } from "../../constants/chartColors";
import {
  COUNTRY_FILTER_VALUES,
  ITALY_TO_INDIA_LABEL,
  INDIA_TO_ITALY_LABEL,
} from "../../constants/tradeFlows";

function ChartSkeleton({ tall = false }) {
  return (
    <div className={`chart-skeleton${tall ? " chart-skeleton--tall" : ""}`}>
      <div className="skeleton skeleton--chart-head" />
      <div className="skeleton skeleton--chart-body" />
    </div>
  );
}

export default function ChartsSection({ yearwise, sectorWise, topProducts, loading, country }) {
  const showItalyToIndia = country !== COUNTRY_FILTER_VALUES.italyImportsFromIndia;
  const showIndiaToItaly = country !== COUNTRY_FILTER_VALUES.indiaImportsFromItaly;
  const trendKey = country === COUNTRY_FILTER_VALUES.italyImportsFromIndia ? "india_to_italy" : "italy_to_india";
  const trendName = country === COUNTRY_FILTER_VALUES.italyImportsFromIndia ? INDIA_TO_ITALY_LABEL : ITALY_TO_INDIA_LABEL;
  const trendColor = country === COUNTRY_FILTER_VALUES.italyImportsFromIndia ? COLORS.orange : COLORS.blue;

  const renderProductTick = useCallback(({ x, y, payload }) => {
    const product = topProducts.find((p) => p.hs4 === payload.value);
    const raw = (product?.description || "").trim();
    const desc = raw.replace(new RegExp(`^${payload.value}\\s*-?\\s*`, "i"), "").trim();
    const truncated = desc.length > 22 ? desc.slice(0, 20) + "…" : desc;
    return (
      <g transform={`translate(${x},${y})`}>
        <rect x={-236} y={-9} width={46} height={18} rx={3} fill="#dbeafe" />
        <text x={-213} y={4} textAnchor="middle" fill="#1d4ed8" fontSize={9} fontWeight="bold" fontFamily="monospace">
          {payload.value}
        </text>
        <text x={-183} y={4} textAnchor="start" fill="#475569" fontSize={9.5}>
          {truncated}
        </text>
      </g>
    );
  }, [topProducts]);

  return (
    <div id="charts" className="charts-section">
      {/* Year-wise bar chart */}
      <div className="chart-card full">
        <div className="chart-header">
          <div className="chart-icon blue">{Icons.barChart}</div>
          <div>
            <h2>Year-wise Trade Volume Comparison</h2>
            <p className="chart-subtitle">Bilateral trade flows between Italy and India</p>
          </div>
        </div>
        {loading ? (
          <ChartSkeleton tall />
        ) : yearwise.length === 0 ? (
          <div className="chart-empty">No data available for the selected filters</div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={yearwise} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtValue} axisLine={false} tickLine={false} />
              <Tooltip formatter={fmtTooltip} />
              <Legend />
              {showItalyToIndia && (
                <Bar dataKey="italy_to_india" name={ITALY_TO_INDIA_LABEL} fill={COLORS.green} radius={[4, 4, 0, 0]} />
              )}
              {showIndiaToItaly && (
                <Bar dataKey="india_to_italy" name={INDIA_TO_ITALY_LABEL} fill={COLORS.orange} radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="charts-grid">
        {/* Trade trend area chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-icon blue">{Icons.lineChart}</div>
            <div>
              <h2>Trade Trend</h2>
              <p className="chart-subtitle">Total trade value progression over time</p>
            </div>
          </div>
          {loading ? (
            <ChartSkeleton />
          ) : yearwise.length === 0 ? (
            <div className="chart-empty">No data available for the selected filters</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={yearwise}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtValue} axisLine={false} tickLine={false} />
                <Tooltip formatter={fmtTooltip} />
                <Area
                  type="monotone"
                  dataKey={trendKey}
                  name={trendName}
                  stroke={trendColor}
                  fill={trendColor}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top 10 products */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-icon purple">{Icons.activity}</div>
            <div>
              <h2>Top 10 Product Categories (HS4)</h2>
              <p className="chart-subtitle">By trade value — Italy ↔ India</p>
            </div>
          </div>
          {loading ? (
            <ChartSkeleton tall />
          ) : topProducts.length === 0 ? (
            <div className="chart-empty">No data available for the selected filters</div>
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtValue} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="hs4"
                  width={240}
                  tick={renderProductTick}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  allowEscapeViewBox={{ x: false, y: false }}
                  wrapperStyle={{ maxWidth: 220 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const hs4  = payload[0]?.payload?.hs4;
                    const desc = payload[0]?.payload?.description || "";
                    return (
                      <div className="custom-tooltip">
                        <p className="ct-code">{hs4}</p>
                        <p className="ct-desc">{desc}</p>
                        <div className="ct-divider" />
                        {payload.map((entry) => (
                          <p key={entry.name} className="ct-row" style={{ color: entry.color }}>
                            <span>{entry.name}</span>
                            <span>{fmtTooltip(entry.value)}</span>
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                {showItalyToIndia && (
                  <Bar dataKey="italy_to_india" name={ITALY_TO_INDIA_LABEL} fill={COLORS.green} radius={[0, 3, 3, 0]} barSize={10} />
                )}
                {showIndiaToItaly && (
                  <Bar dataKey="india_to_italy" name={INDIA_TO_ITALY_LABEL} fill={COLORS.orange} radius={[0, 3, 3, 0]} barSize={10} />
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Sector breakdown */}
      <div className="chart-card full">
        <div className="chart-header">
          <div className="chart-icon green">{Icons.barChart}</div>
          <div>
            <h2>Trade by Sector</h2>
            <p className="chart-subtitle">Sector-wise breakdown of bilateral trade</p>
          </div>
        </div>
        {loading ? (
          <ChartSkeleton tall />
        ) : sectorWise.length === 0 ? (
          <div className="chart-empty">No data available for the selected filters</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(300, sectorWise.length * 45)}>
            <BarChart data={sectorWise} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtValue} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="sector"
                width={220}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip formatter={fmtTooltip} />
              <Legend />
              {showItalyToIndia && (
                <Bar dataKey="italy_to_india" name={ITALY_TO_INDIA_LABEL} fill={COLORS.green} radius={[0, 4, 4, 0]} />
              )}
              {showIndiaToItaly && (
                <Bar dataKey="india_to_italy" name={INDIA_TO_ITALY_LABEL} fill={COLORS.orange} radius={[0, 4, 4, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
