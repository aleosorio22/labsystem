import axios from 'axios';
import { API_BASE_URL } from '../config/config';

/** Cliente axios compartido por todos los services */
export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

/** Mensaje de error legible para toasts */
export function errorMsg(err) {
  const data = err.response?.data;
  if (data?.details?.length) return data.details.map((d) => d.mensaje).join(', ');
  return data?.error || 'Ocurrió un error inesperado';
}

/** Errores de validación (422) como { campo: mensaje } para pintarlos en el formulario */
export function erroresPorCampo(err) {
  const detalles = err.response?.data?.details;
  if (!detalles?.length) return {};
  return Object.fromEntries(detalles.map((d) => [d.campo, d.mensaje]));
}

/** Descarga/abre un PDF autenticado en una pestaña nueva */
export async function abrirPdf(url) {
  const res = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  window.open(URL.createObjectURL(blob), '_blank');
}
