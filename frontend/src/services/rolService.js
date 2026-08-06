import { api } from './api';

const rolService = {
  getAll: async () => {
    const { data } = await api.get('/roles');
    return data;
  },

  /** Catálogo completo de permisos, para armar el formulario de roles */
  getPermisos: async () => {
    const { data } = await api.get('/roles/permisos');
    return data;
  },

  create: async (rol) => {
    const { data } = await api.post('/roles', rol);
    return data;
  },

  update: async (id, rol) => {
    const { data } = await api.put(`/roles/${id}`, rol);
    return data;
  },

  eliminar: async (id) => {
    const { data } = await api.delete(`/roles/${id}`);
    return data;
  },
};

export default rolService;
