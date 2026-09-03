// frontend/src/config.ts

const rawBackendUrl =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  'https://outbox-lab-assignment.onrender.com';

const cleanUrl = rawBackendUrl.replace(/\/+$/, '').replace(/\/api$/, '');

export const BACKEND_URL = cleanUrl;
export const API_BASE = `${cleanUrl}/api`;

