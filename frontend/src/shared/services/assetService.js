import { api } from "./api.js";

export const assetService = {
  list: () => api.list("equipment"),
  create: (payload) => api.create("equipment", payload),
  update: (id, payload) => api.update("equipment", id, payload),
  remove: (id) => api.remove("equipment", id)
};
