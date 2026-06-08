import { useEffect, useState } from "react";
import { inventoryService } from "../services/inventoryService.js";

export function useInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inventoryService
      .list()
      .then(setInventory)
      .finally(() => setLoading(false));
  }, []);

  return { inventory, setInventory, loading };
}
