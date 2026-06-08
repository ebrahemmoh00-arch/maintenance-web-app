import { api } from "./api.js";

export const userService = {
  list: () => api.list("engineers"),
  create: (payload) => api.create("engineers", payload),
  update: (id, payload) => api.update("engineers", id, payload),
  remove: (id) => api.remove("engineers", id)
};
