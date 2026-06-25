import React, { useEffect, useState } from 'react';
import EventLayout from './EventLayout';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    phoneNumber: '',
    email: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData({
      phoneNumber: user?.phoneNumber || '',
      email: user?.email || '',
    });
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const result = await updateProfile({
        phoneNumber: formData.phoneNumber,
        email: formData.email,
      });

      if (!result.ok) {
        setErrorMessage(result.error || 'Impossible de mettre a jour le profil.');
        return;
      }

      setSuccessMessage('Profil mis a jour.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <EventLayout active="profile">
      <section className="events-toolbar">
        <div className="events-toolbar-copy">
          <h1 className="events-page-title">Profil</h1>
          <p className="events-page-subtitle">Informations personnelles et contact.</p>
        </div>
      </section>

      {errorMessage ? <p className="events-feedback events-feedback-error">{errorMessage}</p> : null}
      {successMessage ? <p className="events-feedback events-feedback-success">{successMessage}</p> : null}

      <section className="profile-page-grid">
        <article className="events-dashboard-card profile-card">
          <div className="events-chart-header">
            <h2>Informations du compte</h2>
          </div>

          <form className="profile-form" onSubmit={handleSubmit}>
            <label className="event-form-field">
              <span>Nom complet</span>
              <input value={user?.fullName || user?.username || ''} readOnly />
            </label>

            <label className="event-form-field">
              <span>Role</span>
              <input value={user?.jobTitle || user?.role || ''} readOnly />
            </label>

            <label className="event-form-field">
              <span>Departement</span>
              <input value={user?.department || '--'} readOnly />
            </label>

            <label className="event-form-field">
              <span>Numero de telephone</span>
              <input
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="Ex: 06 12 34 56 78"
              />
            </label>

            <label className="event-form-field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="exemple@domain.com"
              />
            </label>

            <div className="events-modal-actions profile-form-actions">
              <button className="events-primary-button" type="submit" disabled={isSaving}>
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </article>
      </section>
    </EventLayout>
  );
};

export default Profile;
