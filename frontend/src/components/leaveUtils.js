import { apiUrl } from '../config/api';

export const LEAVES_API_URL = apiUrl('/api/conges');

export const statusLabels = {
  PENDING: 'En cours',
  PENDING_HR: 'En attente RH',
  APPROVED: 'Approuvee',
  REFUSED: 'Refusee',
};

export const statusClasses = {
  PENDING: 'leave-status-pending',
  PENDING_HR: 'leave-status-pending',
  APPROVED: 'leave-status-approved',
  REFUSED: 'leave-status-refused',
};

export const leaveTypeLabelsAr = {
  Administratif: 'إجازة إدارية',
  Maladie: 'إجازة مرضية',
  Exceptionnel: 'إجازة استثنائية',
};

export const jobTitleLabelsAr = {
  ingenieur: 'مهندس',
  architecte: 'مهندس معماري',
  administrateur: 'متصرف',
  technicien: 'تقني',
  'chef de division': 'رئيس قسم',
  'chef de service': 'رئيس مصلحة',
  'admin rh': 'مسؤول الموارد البشرية',
};

export const emptyLeaveForm = {
  leaveType: 'Administratif',
  startDate: '',
  endDate: '',
};

export const formatDate = (value) => {
  if (!value) {
    return '--';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateTime = (value) => {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatLeavePeriod = (request) => `${formatDate(request.startDate)} au ${formatDate(request.endDate)}`;

export const pluralize = (count, singular, plural) => `${count} ${count > 1 ? plural : singular}`;

export const formatArabicDate = (value) => {
  if (!value) {
    return '--';
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleDateString('ar-MA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatLeaveTypeArabic = (value) => leaveTypeLabelsAr[value] || value || '--';

export const formatJobTitleArabic = (value) => {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized || normalized === 'non renseigne' || normalized === 'non renseigné') {
    return 'غير محدد';
  }

  return jobTitleLabelsAr[normalized] || value;
};

export const formatArabicWorkDays = (count) => {
  if (!count || count <= 0) {
    return '--';
  }

  return count === 1 ? 'يوم عمل واحد' : `${count} أيام عمل`;
};

export const getEmployeeLeaveValidationLabel = (request) => {
  if (!request) {
    return '--';
  }

  switch (request.status) {
    case 'PENDING':
      return 'En attente de validation';
    case 'PENDING_HR':
      return 'Approuvee par le chef de division';
    case 'APPROVED':
      return 'Approuvee par RH';
    case 'REFUSED':
      return request.reviewerName ? `Refusee par ${request.reviewerName}` : 'Refusee';
    default:
      return statusLabels[request.status] || '--';
  }
};

export const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');
