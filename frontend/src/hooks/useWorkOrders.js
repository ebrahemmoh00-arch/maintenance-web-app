import { useEffect, useState } from "react";
import { workOrderService } from "../services/workOrderService.js";

export function useWorkOrders() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workOrderService
      .list()
      .then(setWorkOrders)
      .finally(() => setLoading(false));
  }, []);

  return { workOrders, setWorkOrders, loading };
}
