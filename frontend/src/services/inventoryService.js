import { api } from "./api.js";

export const inventoryService = {
  list: () => api.list("inventory"),
  create: (payload) => api.create("inventory", payload),
  update: (id, payload) => api.update("inventory", id, payload),
  remove: (id) => api.remove("inventory", id)
};
