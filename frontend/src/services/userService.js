import { api } from './api';

const userService = {
  getAll: async () => {
    const { data } = await api.get('/usuarios');
    return data;
  },

  create: async (usuario) => {
    const { data } = await api.post('/usuarios', usuario);
    return data;
  },

  update: async (id, usuario) => {
    const { data } = await api.put(`/usuarios/${id}`, usuario);
    return data;
  },

  desactivar: async (id) => {
    const { data } = await api.delete(`/usuarios/${id}`);
    return data;
  },
};

export default userService;
