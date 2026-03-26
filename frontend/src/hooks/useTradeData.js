import { useState, useCallback } from "react";
import {
  fetchSummary,
  fetchYearwise,
  fetchSectorWise,
  fetchTopProducts,
} from "../api/stats";

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
      const prevYearFilters = filters.year
        ? { ...filters, year: String(parseInt(filters.year) - 1) }
        : null;

      const [sum, yw, sw, tp, prev] = await Promise.all([
        fetchSummary(filters),
        fetchYearwise(filters),
        fetchSectorWise(filters),
        fetchTopProducts(filters),
        prevYearFilters ? fetchSummary(prevYearFilters) : Promise.resolve(null),
      ]);

      setSummary(sum);
      setPrevSummary(prev);
      setYearwise(yw);
      setSectorWise(sw);
      setTopProducts(tp);
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
