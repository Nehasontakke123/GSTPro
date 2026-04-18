import axios from 'axios';

const apiHost = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const apiBaseUrl = apiHost ? `${apiHost}/api` : '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000
});

const getPersistedToken = () => {
  const rawAuthState = localStorage.getItem('gst-auth');

  if (!rawAuthState) {
    return null;
  }

  try {
    const parsedAuthState = JSON.parse(rawAuthState);
    return parsedAuthState?.state?.token || parsedAuthState?.token || null;
  } catch {
    return null;
  }
};

const hasHeader = (headers, name) => {
  if (!headers) {
    return false;
  }

  if (typeof headers.get === 'function') {
    return Boolean(headers.get(name));
  }

  return Object.keys(headers).some((key) => key.toLowerCase() === name.toLowerCase());
};

const setHeader = (headers, name, value) => {
  if (!headers) {
    return;
  }

  if (typeof headers.set === 'function') {
    headers.set(name, value);
    return;
  }

  headers[name] = value;
};

const removeHeader = (headers, name) => {
  if (!headers) {
    return;
  }

  if (typeof headers.delete === 'function') {
    headers.delete(name);
    return;
  }

  const matchingKey = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
  if (matchingKey) {
    delete headers[matchingKey];
  }
};

api.interceptors.request.use((config) => {
  const headers = config.headers || {};
  const token = getPersistedToken();

  if (token && !hasHeader(headers, 'Authorization')) {
    setHeader(headers, 'Authorization', `Bearer ${token}`);
  }

  const isFormDataRequest = typeof FormData !== 'undefined' && config.data instanceof FormData;

  if (isFormDataRequest) {
    // Let the browser add the multipart boundary for file uploads.
    removeHeader(headers, 'Content-Type');
  } else if (!hasHeader(headers, 'Content-Type')) {
    setHeader(headers, 'Content-Type', 'application/json');
  }

  config.headers = headers;
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Clear auth on 401
      localStorage.removeItem('gst-auth');
      delete api.defaults.headers.common['Authorization'];
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
