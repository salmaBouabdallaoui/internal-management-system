import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import EventLayout from './EventLayout';
import './Events.css';
import {
  API_URL,
  isArchivedEvent,
  parseProgrammeEntries,
  parseStringList,
  serializeProgrammeEntries,
  serializeStringList,
} from '../utils/eventUtils';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const EVENT_TYPES = ['Formation', 'Conference', 'Seminaire'];

const resizeImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const maxWidth = 1200;
      const scale = Math.min(1, maxWidth / image.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);

      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Could not process image'));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => reject(new Error('Could not read image'));
    image.src = reader.result;
  };
  reader.onerror = () => reject(new Error('Could not read file'));
  reader.readAsDataURL(file);
});

const EventAdd = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [programmeEntries, setProgrammeEntries] = useState([{ time: '', activity: '' }]);
  const [galleryPhotos, setGalleryPhotos] = useState(['']);
  const [resourceLinks, setResourceLinks] = useState(['']);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: EVENT_TYPES[0],
    startDate: '',
    endDate: '',
    location: '',
    organizer: '',
    programme: '',
    galleryPhotos: '',
    resourceLinks: '',
    photoUrl: '',
    participantLimit: 50,
  });

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    const fetchEvent = async () => {
      try {
        const response = await axios.get(`${API_URL}/${id}`);
        const event = response.data;
        setFormData({
          title: event.title || '',
          description: event.description || '',
          type: event.type || EVENT_TYPES[0],
          startDate: event.startDate ? event.startDate.slice(0, 16) : '',
          endDate: event.endDate ? event.endDate.slice(0, 16) : '',
          location: event.location || '',
          organizer: event.organizer || '',
          programme: event.programme || '',
          galleryPhotos: event.galleryPhotos || '',
          resourceLinks: event.resourceLinks || '',
          photoUrl: event.photoUrl || '',
          participantLimit: event.participantLimit || 50,
        });
        setProgrammeEntries(parseProgrammeEntries(event.programme));
        setGalleryPhotos(parseStringList(event.galleryPhotos));
        setResourceLinks(parseStringList(event.resourceLinks));
      } catch (error) {
        setErrorMessage("Impossible de charger l'evenement.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFeedback('');
    setErrorMessage('');
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleProgrammeChange = (index, field, value) => {
    setProgrammeEntries((current) => current.map((entry, entryIndex) => (
      entryIndex === index ? { ...entry, [field]: value } : entry
    )));
  };

  const handleAddProgrammeEntry = () => {
    setProgrammeEntries((current) => [...current, { time: '', activity: '' }]);
  };

  const handleRemoveProgrammeEntry = (index) => {
    setProgrammeEntries((current) => (
      current.length === 1
        ? [{ time: '', activity: '' }]
        : current.filter((_, entryIndex) => entryIndex !== index)
    ));
  };

  const handleStringListChange = (setter, index, value) => {
    setter((current) => current.map((entry, entryIndex) => (
      entryIndex === index ? value : entry
    )));
  };

  const handleAddStringListEntry = (setter) => {
    setter((current) => [...current, '']);
  };

  const handleRemoveStringListEntry = (setter, index) => {
    setter((current) => (
      current.length === 1 ? [''] : current.filter((_, entryIndex) => entryIndex !== index)
    ));
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('Image trop grande. Choisissez un fichier de moins de 2 Mo.');
      return;
    }

    try {
      const photoUrl = await resizeImage(file);
      setFormData((current) => ({
        ...current,
        photoUrl,
      }));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage("Impossible de charger l'image selectionnee.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback('');
    setErrorMessage('');

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setErrorMessage('La date de fin doit etre apres la date de debut.');
      setSubmitting(false);
      return;
    }

    const payload = {
      ...formData,
      programme: serializeProgrammeEntries(programmeEntries),
      galleryPhotos: serializeStringList(galleryPhotos),
      resourceLinks: serializeStringList(resourceLinks),
      targetAudience: '',
    };

    try {
      const response = isEditMode
        ? await axios.put(`${API_URL}/${id}`, payload)
        : await axios.post(API_URL, payload);
      setFeedback(isEditMode ? 'Evenement modifie avec succes.' : 'Evenement cree avec succes.');
      navigate(`/event/${response.data.id}`);
    } catch (error) {
      const message = error.response?.data || `Impossible de ${isEditMode ? 'modifier' : 'creer'} l'evenement.`;
      setErrorMessage(message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <EventLayout active="events">
        <p className="events-feedback">Chargement...</p>
      </EventLayout>
    );
  }

  const showArchiveExtras = isArchivedEvent(formData.endDate, formData.startDate);

  return (
    <EventLayout active="events">
      <section className="event-form-page">
        <div className="event-form-header">
          <div>
            <h1 className="events-page-title">{isEditMode ? "Modifier l'evenement" : 'Nouvel evenement'}</h1>
            <p className="events-page-subtitle">
              {isEditMode
                ? "Mettez a jour les informations de l'evenement."
                : 'Creez une fiche evenement claire, structuree et prete a publier.'}
            </p>
          </div>
        </div>

        {feedback ? <p className="events-feedback events-feedback-success">{feedback}</p> : null}
        {errorMessage ? <p className="events-feedback events-feedback-error">{errorMessage}</p> : null}

        <form className="event-form-card event-form-card-refined" onSubmit={handleSubmit}>
          <div className="event-form-section">
            <div className="event-form-section-head">
              <h2 className="event-form-section-title">Informations principales</h2>
              <p className="event-form-section-copy">Nom, type, description, lieu et organisateur de l'evenement.</p>
            </div>

            <div className="event-form-grid">
              <label className="event-form-field">
                <span>Titre</span>
                <input name="title" value={formData.title} onChange={handleChange} required />
              </label>

              <label className="event-form-field">
                <span>Type</span>
                <select name="type" value={formData.type} onChange={handleChange} required>
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="event-form-field event-form-field-full">
                <span>Description</span>
                <textarea name="description" value={formData.description} onChange={handleChange} required />
              </label>

              <label className="event-form-field">
                <span>Lieu</span>
                <input name="location" value={formData.location} onChange={handleChange} required />
              </label>

              <label className="event-form-field">
                <span>Organisateur</span>
                <input name="organizer" value={formData.organizer} onChange={handleChange} required />
              </label>
            </div>
          </div>

          <div className="event-form-section">
            <div className="event-form-section-head">
              <h2 className="event-form-section-title">Planification</h2>
              <p className="event-form-section-copy">Date de debut, date de fin et nombre maximum de participants.</p>
            </div>

            <div className="event-form-grid event-form-grid-compact">
              <label className="event-form-field">
                <span>Date de debut</span>
                <input name="startDate" type="datetime-local" value={formData.startDate} onChange={handleChange} required />
              </label>

              <label className="event-form-field">
                <span>Date de fin</span>
                <input name="endDate" type="datetime-local" value={formData.endDate} onChange={handleChange} required />
              </label>

              <label className="event-form-field">
                <span>Limite de participants</span>
                <input
                  name="participantLimit"
                  type="number"
                  min="1"
                  value={formData.participantLimit}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>
          </div>

          <div className="event-form-section">
            <div className="event-form-section-head">
              <h2 className="event-form-section-title">Contenu complementaire</h2>
              <p className="event-form-section-copy">Programme detaille et visuel principal.</p>
            </div>

            <div className="event-form-grid">
              <div className="event-form-field event-form-field-full">
                <span>Programme (optionnel)</span>
                <div className="programme-builder">
                  {programmeEntries.map((entry, index) => (
                    <div className="programme-row" key={`programme-${index}`}>
                      <input
                        type="time"
                        value={entry.time}
                        onChange={(e) => handleProgrammeChange(index, 'time', e.target.value)}
                      />
                      <input
                        type="text"
                        value={entry.activity}
                        onChange={(e) => handleProgrammeChange(index, 'activity', e.target.value)}
                        placeholder="Activite"
                      />
                      <button
                        className="events-inline-button events-inline-button-danger"
                        type="button"
                        onClick={() => handleRemoveProgrammeEntry(index)}
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}
                  <button className="events-inline-button" type="button" onClick={handleAddProgrammeEntry}>
                    Ajouter une ligne
                  </button>
                </div>
              </div>

              <div className="event-form-field event-form-field-full">
                <span>Photo (optionnel)</span>
                <div className="event-form-upload">
                  <input className="event-form-file" type="file" accept="image/*" onChange={handlePhotoChange} />
                  <p className="event-form-helper">Image recommandee : format paysage, moins de 2 Mo.</p>
                  {formData.photoUrl ? (
                    <img className="event-form-preview" src={formData.photoUrl} alt="Preview evenement" loading="lazy" />
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {showArchiveExtras ? (
            <div className="event-form-section">
              <div className="event-form-section-head">
                <h2 className="event-form-section-title">Archives</h2>
                <p className="event-form-section-copy">Photos et liens publies apres la fin de l'evenement.</p>
              </div>

              <div className="event-form-grid">
                <div className="event-form-field event-form-field-full">
                  <span>Photos supplementaires</span>
                  <div className="programme-builder">
                    {galleryPhotos.map((photo, index) => (
                      <div className="programme-row programme-row-simple" key={`gallery-${index}`}>
                        <input
                          type="url"
                          value={photo}
                          onChange={(e) => handleStringListChange(setGalleryPhotos, index, e.target.value)}
                          placeholder="https://..."
                        />
                        <button
                          className="events-inline-button events-inline-button-danger"
                          type="button"
                          onClick={() => handleRemoveStringListEntry(setGalleryPhotos, index)}
                        >
                          Supprimer
                        </button>
                      </div>
                    ))}
                    <button className="events-inline-button" type="button" onClick={() => handleAddStringListEntry(setGalleryPhotos)}>
                      Ajouter une photo
                    </button>
                  </div>
                </div>

                <div className="event-form-field event-form-field-full">
                  <span>Liens utiles</span>
                  <div className="programme-builder">
                    {resourceLinks.map((link, index) => (
                      <div className="programme-row programme-row-simple" key={`resource-${index}`}>
                        <input
                          type="url"
                          value={link}
                          onChange={(e) => handleStringListChange(setResourceLinks, index, e.target.value)}
                          placeholder="https://..."
                        />
                        <button
                          className="events-inline-button events-inline-button-danger"
                          type="button"
                          onClick={() => handleRemoveStringListEntry(setResourceLinks, index)}
                        >
                          Supprimer
                        </button>
                      </div>
                    ))}
                    <button className="events-inline-button" type="button" onClick={() => handleAddStringListEntry(setResourceLinks)}>
                      Ajouter un lien
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="event-form-actions">
            <button className="events-secondary-button" type="button" onClick={() => navigate('/events')}>
              Annuler
            </button>
            <button className="events-primary-button" type="submit" disabled={submitting}>
              {submitting ? (isEditMode ? 'Modification...' : 'Creation...') : (isEditMode ? 'Enregistrer' : 'Creer')}
            </button>
          </div>
        </form>
      </section>
    </EventLayout>
  );
};

export default EventAdd;
