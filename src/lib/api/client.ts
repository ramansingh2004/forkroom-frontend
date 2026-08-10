import axios from 'axios';

const apiBaseUrl =
  process.env.NEXT_PUBLIC_FORKROOM_API_BASE_URL ??
  'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,

  headers: {
    'Content-Type': 'application/json',
  },

  withCredentials: true,

  timeout: 15_000,
});