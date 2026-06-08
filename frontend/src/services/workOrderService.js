import { api } from "./api.js";

export const workOrderService = {
  list: () => api.list("work-orders"),
  create: (payload) => api.create("work-orders", payload),
  update: (id, payload) => api.update("work-orders", id, payload),
  remove: (id) => api.remove("work-orders", id)
};
