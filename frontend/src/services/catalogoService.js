import { api } from './api';

/**
 * Catálogos simples. Todos comparten el mismo CRUD, solo cambia el nombre
 * del catálogo en la URL: /catalogos/{catalogo}
 *
 * Catálogos disponibles: sexos, unidades-medida, categorias-examen,
 * palabras-cualitativo, categorias-heces, parametros-heces,
 * categorias-orina, parametros-orina.
 */
const catalogoService = {
  getAll: async (catalogo, params = {}) => {
    const { data } = await api.get(`/catalogos/${catalogo}`, { params });
    return data;
  },

  getById: async (catalogo, id) => {
    const { data } = await api.get(`/catalogos/${catalogo}/${id}`);
    return data;
  },

  create: async (catalogo, registro) => {
    const { data } = await api.post(`/catalogos/${catalogo}`, registro);
    return data;
  },

  update: async (catalogo, id, registro) => {
    const { data } = await api.put(`/catalogos/${catalogo}/${id}`, registro);
    return data;
  },

  eliminar: async (catalogo, id) => {
    const { data } = await api.delete(`/catalogos/${catalogo}/${id}`);
    return data;
  },

  /** Tipos de examen: solo lectura (su semántica está ligada al código) */
  getTiposExamen: async () => {
    const { data } = await api.get('/catalogos/tipos-examen');
    return data;
  },
};

export default catalogoService;
