// Backend API Configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

export const API_CONFIG = {
  BACKEND_URL,
  AI_SERVICE_URL,
  SOCKET_URL: BACKEND_URL,
};

// Get the actual URLs being used
export const getBackendUrl = () => BACKEND_URL;
export const getSocketUrl = () => API_CONFIG.SOCKET_URL;
export const getAIServiceUrl = () => AI_SERVICE_URL;
