import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EventLayout from './EventLayout';
import {
  LEAVES_API_URL,
  emptyLeaveForm,
  formatLeavePeriod,
  formatDateTime,
  getEmployeeLeaveValidationLabel,
  pluralize,
  statusClasses,
  statusLabels,
} from './leaveUtils';

const Conge = () => {
  const { isAdmin } = useAuth();
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [canReviewHr, setCanReviewHr] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [formData, setFormData] = useState(emptyLeaveForm);

  const loadMySpace = async () => {
    try {
      const response = await axios.get(`${LEAVES_API_URL}/me`);
      setProfile(response.data.profile);
      setRequests(Array.isArray(response.data.requests) ? response.data.requests : []);
      setCanReview(Boolean(response.data.canReview));
      setCanReviewHr(Boolean(response.data.canReviewHr));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.response?.data || 'Impossible de charger la page congés.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMySpace();
  }, []);

  const requestsToDisplay = useMemo(() => (
    [...requests].sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    })
  ), [requests]);

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === 'PENDING' || request.status === 'PENDING_HR').length,
    [requests],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const openCreateModal = () => {
    setEditingRequestId(null);
    setFormData(emptyLeaveForm);
    setIsModalOpen(true);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const openEditModal = (request) => {
    setEditingRequestId(request.id);
    setFormData({
      leaveType: request.leaveType,
      startDate: request.startDate,
      endDate: request.endDate,
    });
    setIsModalOpen(true);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const closeRequestModal = () => {
    setIsModalOpen(false);
    setEditingRequestId(null);
    setFormData(emptyLeaveForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
      };

      if (editingRequestId) {
        await axios.put(`${LEAVES_API_URL}/${editingRequestId}`, payload);
        setSuccessMessage('La demande de congé a été modifiée.');
      } else {
        await axios.post(LEAVES_API_URL, payload);
        setSuccessMessage('La demande de congé a été envoyée.');
      }

      closeRequestModal();
      await loadMySpace();
    } catch (error) {
      setErrorMessage(error.response?.data || "Impossible d'enregistrer cette demande.");
    }
  };

  const handleDelete = async (request) => {
    const confirmed = window.confirm(`Supprimer la demande de congé #${request.id} ?`);
    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(`${LEAVES_API_URL}/${request.id}`);
      setSuccessMessage('La demande de congé a été supprimée.');
      setErrorMessage('');
      if (editingRequestId === request.id) {
        closeRequestModal();
      }
      await loadMySpace();
    } catch (error) {
      setErrorMessage(error.response?.data || 'Impossible de supprimer cette demande.');
    }
  };

  return (
    <EventLayout active="leaves" shellClassName="events-shell-wide">
      <section className="events-toolbar">
        <div className="events-toolbar-copy">
          <h1 className="events-page-title">Congés</h1>
          <p className="events-page-subtitle">Mes demandes de congé et suivi du solde annuel de 40 jours.</p>
        </div>

        {canReview || canReviewHr || isAdmin ? (
          <div className="leave-page-switcher">
            <NavLink
              className={({ isActive }) => `leave-page-switch-link ${isActive ? 'leave-page-switch-link-active' : ''}`}
              to="/conge"
              end
            >
              Mes demandes
            </NavLink>
            <NavLink
              className={({ isActive }) => `leave-page-switch-link ${isActive ? 'leave-page-switch-link-active' : ''}`}
              to="/conge/validations"
            >
              Demandes a valider
            </NavLink>
          </div>
        ) : null}
      </section>

      {errorMessage ? <p className="events-feedback events-feedback-error">{errorMessage}</p> : null}
      {successMessage ? <p className="events-feedback events-feedback-success">{successMessage}</p> : null}

      <section className="leave-page-stack">
        <div className="leave-top-actions">
          <button className="events-primary-button leave-request-button" type="button" onClick={openCreateModal}>
            Demander un congé
          </button>

          <article className="leave-balance-card">
            <div>
              <span className="leave-balance-label">Jours restants à prendre</span>
            </div>
            <div className="leave-balance-value-wrap">
              <strong className="leave-balance-value">{profile ? `${profile.remainingLeaveDays} j` : '--'}</strong>
            </div>
          </article>
        </div>

        <article className="events-dashboard-card leave-requests-card leave-requests-table-card">
          <div className="events-chart-header">
            <h2>Mes demandes</h2>
            <span>{pendingCount} en cours</span>
          </div>

          {isLoading ? (
            <p className="events-empty-state">Chargement...</p>
          ) : requestsToDisplay.length > 0 ? (
            <div className="leave-table-wrap">
              <table className="leave-request-table">
                <thead>
                  <tr>
                    <th>Demande</th>
                    <th>Période</th>
                    <th>Durée</th>
                    <th>Statut</th>
                    <th>Validation</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requestsToDisplay.map((request) => {
                    const canEdit = request.status !== 'APPROVED' && request.status !== 'REFUSED';
                    return (
                      <tr key={request.id}>
                        <td>
                          <div className="leave-table-primary">
                            <strong>{`Congé ${request.leaveType.toLowerCase()}`}</strong>
                            <span>{`#${request.id}`}</span>
                          </div>
                        </td>
                        <td>{formatLeavePeriod(request)}</td>
                        <td>{pluralize(request.durationDays, 'jour ouvrable', 'jours ouvrables')}</td>
                        <td>
                          <span className={`leave-status-badge ${statusClasses[request.status] || ''}`}>
                            {statusLabels[request.status] || request.status}
                          </span>
                        </td>
                        <td>
                          <div className="leave-validation-cell">
                            <strong>{getEmployeeLeaveValidationLabel(request)}</strong>
                            {request.reviewedAt ? <span>{`Le ${formatDateTime(request.reviewedAt)}`}</span> : null}
                            {request.reviewReason ? <small className="leave-review-reason">{`Motif: ${request.reviewReason}`}</small> : null}
                          </div>
                        </td>
                        <td>
                          {canEdit ? (
                            <div className="leave-request-actions leave-request-actions-table">
                              <button className="events-inline-button" type="button" onClick={() => openEditModal(request)}>
                                Modifier
                              </button>
                              <button
                                className="events-inline-button events-inline-button-danger"
                                type="button"
                                onClick={() => handleDelete(request)}
                              >
                                Supprimer
                              </button>
                            </div>
                          ) : (
                            <span className="leave-table-muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="events-empty-state">Aucune demande pour le moment.</p>
          )}
        </article>
      </section>

      {isModalOpen && profile ? (
        <div className="events-modal-overlay" role="presentation">
          <div className="events-modal leave-request-modal">
            <h2>{editingRequestId ? 'Modifier la demande' : 'Nouvelle demande'}</h2>

            <form className="leave-request-form" onSubmit={handleSubmit}>
              <label className="event-form-field">
                <span>Nom complet</span>
                <input value={profile.fullName} readOnly />
              </label>

              <label className="event-form-field">
                <span>Role</span>
                <input value={profile.role} readOnly />
              </label>

              <label className="event-form-field">
                <span>Departement</span>
                <input value={profile.department} readOnly />
              </label>

              <label className="event-form-field">
                <span>Type de congé</span>
                <select name="leaveType" value={formData.leaveType} onChange={handleChange}>
                  <option value="Administratif">Administratif</option>
                  <option value="Maladie">Maladie</option>
                  <option value="Exceptionnel">Exceptionnel</option>
                </select>
              </label>

              <label className="event-form-field">
                <span>Date de début</span>
                <input
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="event-form-field">
                <span>Date de fin</span>
                <input
                  name="endDate"
                  type="date"
                  min={formData.startDate || undefined}
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
              </label>

              <div className="events-modal-actions">
                <button className="events-secondary-button" type="button" onClick={closeRequestModal}>
                  Annuler
                </button>
                <button className="events-primary-button" type="submit">
                  {editingRequestId ? 'Modifier' : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </EventLayout>
  );
};

export default Conge;
