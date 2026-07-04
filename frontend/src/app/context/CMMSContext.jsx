import { createContext, useContext } from "react";

export const CMMSContext = createContext(null);

export function useCMMS() {
  const value = useContext(CMMSContext);
  if (!value) {
    throw new Error("useCMMS must be used inside CMMSContext.Provider");
  }
  return value;
}
