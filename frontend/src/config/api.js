const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL.replace(/\/$/, '');
  }

  const pageHostname = window.location.hostname || 'localhost';
  const hostname = pageHostname === '0.0.0.0' ? 'localhost' : pageHostname;
  return `http://${hostname}:8080`;
};

export const API_BASE_URL = getApiBaseUrl();

export const apiUrl = (path) => `${API_BASE_URL}${path}`;
