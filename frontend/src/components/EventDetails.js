import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import EventLayout from './EventLayout';
import './Events.css';
import personIcon from '../images/person.png';
import { useAuth } from '../context/AuthContext';
import {
  API_URL,
  formatEventDateTime,
  getCurrentUsername,
  getDaysLeftLabel,
  isArchivedEvent,
  parseProgrammeEntries,
  parseStringList,
} from '../utils/eventUtils';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const eventResponse = await axios.get(`${API_URL}/${id}`);
        const loadedEvent = eventResponse.data;
        const archived = isArchivedEvent(loadedEvent?.endDate, loadedEvent?.startDate);

        setEvent(loadedEvent);

        if (archived) {
          const commentsResponse = await axios.get(`${API_URL}/${id}/comments`);
          setComments(commentsResponse.data);
        } else {
          setComments([]);
        }
      } catch (error) {
        setErrorMessage("Impossible de charger l'evenement.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const currentUsername = useMemo(() => getCurrentUsername(), []);
  const participantUsernames = event?.participantUsernames || [];
  const isParticipant = currentUsername ? participantUsernames.includes(currentUsername) : false;
  const participantCount = event?.participantCount || 0;
  const participantLimit = event?.participantLimit || 50;
  const isFull = participantCount >= participantLimit;
  const programmeEntries = parseProgrammeEntries(event?.programme);
  const galleryPhotos = parseStringList(event?.galleryPhotos).filter(Boolean);
  const resourceLinks = parseStringList(event?.resourceLinks).filter(Boolean);
  const isArchived = isArchivedEvent(event?.endDate, event?.startDate);

  const handleDelete = async () => {
    setDeleteSubmitting(true);
    setErrorMessage('');

    try {
      await axios.delete(`${API_URL}/${id}`);
      navigate('/events');
    } catch (error) {
      const message = error.response?.data || "Impossible de supprimer l'evenement.";
      setErrorMessage(typeof message === 'string' ? message : "Impossible de supprimer l'evenement.");
      setDeleteSubmitting(false);
    }
  };

  const handleParticipationToggle = async () => {
    setSubmitting(true);
    setFeedback('');
    setErrorMessage('');

    try {
      const response = isParticipant
        ? await axios.delete(`${API_URL}/${id}/participate`)
        : await axios.post(`${API_URL}/${id}/participate`);
      setEvent(response.data);
      setFeedback(isParticipant ? 'Participation annulee.' : 'Participation enregistree.');
    } catch (error) {
      const message = error.response?.data || 'Impossible de mettre a jour votre participation.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentContent.trim()) {
      return;
    }

    setCommentSubmitting(true);
    setErrorMessage('');

    try {
      const response = await axios.post(`${API_URL}/${id}/comments`, { content: commentContent.trim() });
      setComments((current) => [...current, response.data]);
      setCommentContent('');
    } catch (error) {
      setErrorMessage("Impossible d'ajouter le commentaire.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleCommentDelete = async (commentId) => {
    const confirmed = window.confirm('Supprimer ce commentaire ?');
    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/${id}/comments/${commentId}`);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
    } catch (error) {
      setErrorMessage('Impossible de supprimer le commentaire.');
    }
  };

  if (loading) {
    return (
      <EventLayout active="events">
        <p className="events-feedback">Chargement...</p>
      </EventLayout>
    );
  }

  if (!event) {
    return (
      <EventLayout active="events">
        <p className="events-feedback events-feedback-error">{errorMessage || 'Evenement introuvable.'}</p>
      </EventLayout>
    );
  }

  return (
    <EventLayout active="events" shellClassName="events-shell-wide">
      <article className="event-details-page">
        <Link className="events-back-link" to="/events">Retour aux evenements</Link>

        {event.photoUrl ? (
          <img
            className={`event-details-image ${isArchived ? 'event-details-image-archived' : ''}`}
            src={event.photoUrl}
            alt={event.title}
            loading="lazy"
          />
        ) : null}

        <div className={`event-details-card ${isArchived ? 'event-details-card-archived' : ''}`}>
          <div className="event-details-head">
            <div>
              <p className="event-details-type">{event.type || 'Evenement'}</p>
              <h1>{event.title}</h1>
              <p className="event-details-date">
                {formatEventDateTime(event.startDate)} - {formatEventDateTime(event.endDate)}
              </p>
              {getDaysLeftLabel(event.startDate) ? (
                <p className="event-details-countdown">{getDaysLeftLabel(event.startDate)}</p>
              ) : null}
            </div>

            <div className="event-details-head-side">
              {isAdmin ? (
                <div className="event-admin-actions">
                  {!isArchived ? (
                    <Link className="event-icon-button" to={`/event/${event.id}/edit`} aria-label="Modifier l'evenement" title="Modifier">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25zm14.71-9.04a1.003 1.003 0 0 0 0-1.42l-1.5-1.5a1.003 1.003 0 0 0-1.42 0l-1.17 1.17 2.75 2.75 1.34-1.17z" />
                      </svg>
                    </Link>
                  ) : null}
                  <button
                    className="event-icon-button event-icon-button-danger"
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    aria-label="Supprimer l'evenement"
                    title="Supprimer"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2h4v2H4V6h4l1-2z" />
                    </svg>
                  </button>
                </div>
              ) : null}

              <div className="event-details-capacity">
                {participantCount}/{participantLimit}
                <img className="event-details-capacity-icon" src={personIcon} alt="" />
              </div>
            </div>
          </div>

          <div className="event-details-section">
            <p className="event-details-summary">{event.description}</p>
          </div>

          <div className="event-details-grid">
            <div className="event-details-section">
              <span className="event-details-meta-label">Lieu</span>
              <p>{event.location}</p>
            </div>

            <div className="event-details-section">
              <span className="event-details-meta-label">Organisateur</span>
              <p>{event.organizer || 'Non renseigne'}</p>
            </div>

            <div className="event-details-section">
              <span className="event-details-meta-label">Cree par</span>
              <p>{event.createdByUsername || 'Non renseigne'}</p>
            </div>

            <div className="event-details-section">
              <span className="event-details-meta-label">Programme</span>
              {programmeEntries.some((entry) => entry.time || entry.activity) ? (
                <div className="programme-details-list">
                  {programmeEntries.map((entry, index) => (
                    <div className="programme-details-item" key={`programme-detail-${index}`}>
                      <span className="programme-details-time">{entry.time || '--:--'}</span>
                      <span className="programme-details-activity">{entry.activity || 'Activite non precisee'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Aucun programme specifie.</p>
              )}
            </div>
          </div>

          {isArchived && (galleryPhotos.length > 0 || resourceLinks.length > 0) ? (
            <div className="event-details-section event-archive-section">
              <h2>Archive de l'evenement</h2>
              {galleryPhotos.length > 0 ? (
                <div className="event-archive-gallery">
                  {galleryPhotos.map((photo, index) => (
                    <img key={`archive-photo-${index}`} src={photo} alt={`${event.title} archive ${index + 1}`} loading="lazy" />
                  ))}
                </div>
              ) : null}

              {resourceLinks.length > 0 ? (
                <div className="event-archive-links">
                  {resourceLinks.map((link, index) => (
                    <a key={`archive-link-${index}`} href={link} target="_blank" rel="noreferrer">
                      Ressource {index + 1}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {feedback ? <p className="events-feedback events-feedback-success">{feedback}</p> : null}
          {errorMessage ? <p className="events-feedback events-feedback-error">{errorMessage}</p> : null}

          <div className="event-details-actions">
            {!isArchived ? (
              <button
                className="events-primary-button"
                type="button"
                onClick={handleParticipationToggle}
                disabled={submitting || (!isParticipant && isFull)}
              >
                {submitting
                  ? 'Mise a jour...'
                  : isParticipant
                    ? 'Annuler la participation'
                    : 'Participer'}
              </button>
            ) : null}
            <span className="event-details-capacity-text">
              {participantCount}/{participantLimit} participants
            </span>
          </div>
        </div>

        {isArchived ? (
          <section className="event-comments-card">
            <h2>Commentaires</h2>
            <form className="event-comment-form" onSubmit={handleCommentSubmit}>
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Ajouter un commentaire..."
              />
              <button className="events-primary-button" type="submit" disabled={commentSubmitting}>
                {commentSubmitting ? 'Publication...' : 'Commenter'}
              </button>
            </form>

            <div className="event-comments-list">
              {comments.length > 0 ? comments.map((comment) => (
                <article className="event-comment-item" key={comment.id}>
                  <div className="event-comment-meta">
                    <div className="event-comment-meta-main">
                      <strong>{comment.createdByUsername || 'Utilisateur'}</strong>
                      <span>{formatEventDateTime(comment.createdAt)}</span>
                    </div>
                    {(comment.createdByUsername === currentUsername || isAdmin) ? (
                      <button
                        className="event-comment-delete"
                        type="button"
                        onClick={() => handleCommentDelete(comment.id)}
                      >
                        Supprimer
                      </button>
                    ) : null}
                  </div>
                  <p>{comment.content}</p>
                </article>
              )) : (
                <p className="event-comment-empty">Aucun commentaire pour le moment.</p>
              )}
            </div>
          </section>
        ) : null}
      </article>

      {isDeleteModalOpen ? (
        <div className="events-modal-overlay" role="presentation" onClick={() => !deleteSubmitting && setIsDeleteModalOpen(false)}>
          <div
            className="events-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-event-title"
            onClick={(modalEvent) => modalEvent.stopPropagation()}
          >
            <h2 id="delete-event-title">Supprimer l'evenement ?</h2>
            <p>
              Cette action supprimera definitivement <strong>{event.title}</strong>.
            </p>
            <div className="events-modal-actions">
              <button
                className="events-secondary-button"
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleteSubmitting}
              >
                Annuler
              </button>
              <button
                className="events-inline-button events-inline-button-danger"
                type="button"
                onClick={handleDelete}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </EventLayout>
  );
};

export default EventDetails;
