import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

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

/** Descarga/abre un PDF autenticado en una pestaña nueva */
export async function abrirPdf(url) {
  const res = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  window.open(URL.createObjectURL(blob), '_blank');
}
