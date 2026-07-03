import { useMemo } from "react";

export function useReports(source = []) {
  return useMemo(() => ({ rows: source, total: source.length }), [source]);
}
