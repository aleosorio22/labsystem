import { api } from './api';

const examenService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/examenes', { params });
    return data;
  },

  /** Exámenes que se pueden vender (excluye los internos de combos) */
  getVendibles: async () => {
    const { data } = await api.get('/examenes/vendibles');
    return data;
  },

  getById: async (id) => {
    const { data } = await api.get(`/examenes/${id}`);
    return data;
  },

  create: async (examen) => {
    const { data } = await api.post('/examenes', examen);
    return data;
  },

  update: async (id, examen) => {
    const { data } = await api.put(`/examenes/${id}`, examen);
    return data;
  },

  eliminar: async (id) => {
    const { data } = await api.delete(`/examenes/${id}`);
    return data;
  },

  // --- Combos ---
  getCombos: async () => {
    const { data } = await api.get('/examenes/combos');
    return data;
  },

  guardarCombo: async (idPrincipal, internos) => {
    const { data } = await api.put('/examenes/combos', {
      id_examen_principal: idPrincipal,
      internos,
    });
    return data;
  },

  eliminarCombo: async (idPrincipal) => {
    const { data } = await api.delete(`/examenes/combos/${idPrincipal}`);
    return data;
  },
};

export default examenService;
