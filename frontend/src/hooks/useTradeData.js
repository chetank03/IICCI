import { useState, useCallback } from "react";
import { fetchDashboard } from "../api/stats";

export function useTradeData() {
  const [summary,     setSummary]     = useState(null);
  const [prevSummary, setPrevSummary] = useState(null);
  const [yearwise,    setYearwise]    = useState([]);
  const [sectorWise,  setSectorWise]  = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [chartError,  setChartError]  = useState(null);

  const loadData = useCallback(async (filters) => {
    setLoading(true);
    setChartError(null);
    try {
      const data = await fetchDashboard(filters);
      setSummary(data.summary || null);
      setPrevSummary(data.prev_summary || null);
      setYearwise(data.yearwise || []);
      setSectorWise(data.sector_wise || []);
      setTopProducts(data.top_products || []);
    } catch (err) {
      setChartError("Failed to load data. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    summary, prevSummary, yearwise, sectorWise, topProducts,
    loading, chartError, loadData,
  };
}
