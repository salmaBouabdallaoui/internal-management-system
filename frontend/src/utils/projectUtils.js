import { apiUrl } from '../config/api';

export const PROJECT_API_URL = apiUrl('/api/projects');

export const getProjectDescriptionPreview = (text, limit = 120) => {
  if (!text) {
    return '';
  }

  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
};

export const formatProjectDateTime = (value) => {
  if (!value) {
    return 'Date non definie';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
