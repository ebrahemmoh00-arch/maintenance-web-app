import { useEffect, useState } from "react";
import { assetService } from "../services/assetService.js";

export function useAssets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assetService
      .list()
      .then(setAssets)
      .finally(() => setLoading(false));
  }, []);

  return { assets, setAssets, loading };
}
