import { apiUrl } from '../config/api';

export const API_URL = apiUrl('/api/events');

export const formatEventDate = (value) => {
  if (!value) {
    return 'Date non definie';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export const formatEventDateTime = (value) => {
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

export const getDescriptionPreview = (text, limit = 120) => {
  if (!text) {
    return '';
  }

  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
};

export const getDaysLeftLabel = (value) => {
  if (!value) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  target.setHours(0, 0, 0, 0);
  const diffInDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays < 0 || diffInDays > 7) {
    return null;
  }

  if (diffInDays === 0) {
    return "Aujourd'hui";
  }

  if (diffInDays === 1) {
    return 'Dans 1 jour';
  }

  return `Dans ${diffInDays} jours`;
};

export const isOngoingEvent = (startDate, endDate = null) => {
  if (!startDate) {
    return false;
  }

  const start = new Date(startDate);
  const end = new Date(endDate || startDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }

  const now = Date.now();
  return start.getTime() <= now && end.getTime() >= now;
};

export const getEventDateBadge = (startDate, endDate = null) => {
  if (isOngoingEvent(startDate, endDate)) {
    return 'En cours';
  }

  return getDaysLeftLabel(startDate) || formatEventDate(startDate);
};

export const getCurrentUsername = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return null;
  }

  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded.sub || null;
  } catch (error) {
    return null;
  }
};

export const parseProgrammeEntries = (programme) => {
  if (!programme) {
    return [{ time: '', activity: '' }];
  }

  try {
    const parsed = JSON.parse(programme);
    if (!Array.isArray(parsed)) {
      return [{ time: '', activity: '' }];
    }

    const normalized = parsed
      .map((entry) => ({
        time: typeof entry?.time === 'string' ? entry.time : '',
        activity: typeof entry?.activity === 'string' ? entry.activity : '',
      }))
      .filter((entry) => entry.time || entry.activity);

    return normalized.length > 0 ? normalized : [{ time: '', activity: '' }];
  } catch (error) {
    return [{ time: '', activity: programme }];
  }
};

export const serializeProgrammeEntries = (entries) => {
  const normalized = entries
    .map((entry) => ({
      time: entry.time?.trim() || '',
      activity: entry.activity?.trim() || '',
    }))
    .filter((entry) => entry.time || entry.activity);

  return normalized.length > 0 ? JSON.stringify(normalized) : '';
};

export const parseStringList = (value) => {
  if (!value) {
    return [''];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [''];
    }

    const normalized = parsed
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);

    return normalized.length > 0 ? normalized : [''];
  } catch (error) {
    return value ? [value] : [''];
  }
};

export const serializeStringList = (entries) => {
  const normalized = entries.map((entry) => entry.trim()).filter(Boolean);
  return normalized.length > 0 ? JSON.stringify(normalized) : '';
};

export const isArchivedEvent = (endDate, startDate = null) => {
  const source = endDate || startDate;
  if (!source) {
    return false;
  }

  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.getTime() < Date.now();
};
