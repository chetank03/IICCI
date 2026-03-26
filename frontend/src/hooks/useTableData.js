import { useState, useCallback } from "react";
import { fetchTradeTable } from "../api/stats";

const PAGE_SIZE = 25;

export function useTableData() {
  const [tableRows,    setTableRows]    = useState([]);
  const [tablePage,    setTablePage]    = useState(1);
  const [tableTotal,   setTableTotal]   = useState(0);
  const [tableLoading, setTableLoading] = useState(false);

  const loadTable = useCallback(async (filters, page) => {
    setTableLoading(true);
    try {
      const data = await fetchTradeTable(filters, page, PAGE_SIZE);
      setTableRows(data.items  || []);
      setTableTotal(data.total || 0);
      setTablePage(page);
    } catch (_) {
      /* error already surfaced in stats.js checkOk */
    } finally {
      setTableLoading(false);
    }
  }, []);

  return { tableRows, tablePage, tableTotal, tableLoading, loadTable, PAGE_SIZE };
}
