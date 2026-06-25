import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../config/api';
import EventLayout from './EventLayout';

const EMPLOYERS_API_URL = apiUrl('/api/admin/employers');
const CATALOG_API_URL = apiUrl('/api/admin/catalog-options');
const DEFAULT_ANNUAL_LEAVE_DAYS = 40;
const DEFAULT_JOB_TITLES = ['Ingenieur', 'Architecte', 'Administrateur', 'Technicien', 'Chef de division', 'Chef de service', 'Admin RH'];
const DEFAULT_DEPARTMENTS = ['DSIC', 'DBPI', 'DP'];

const EmployerAdd = () => {
  const navigate = useNavigate();
  const [catalogOptions, setCatalogOptions] = useState({
    departments: DEFAULT_DEPARTMENTS,
    jobTitles: DEFAULT_JOB_TITLES,
  });
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    department: DEFAULT_DEPARTMENTS[0],
    jobTitle: DEFAULT_JOB_TITLES[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadCatalogOptions = async () => {
      try {
        const response = await axios.get(CATALOG_API_URL);
        const departments = response.data?.departments?.length ? response.data.departments : DEFAULT_DEPARTMENTS;
        const jobTitles = response.data?.jobTitles?.length ? response.data.jobTitles : DEFAULT_JOB_TITLES;
        setCatalogOptions({ departments, jobTitles });
        setFormData((current) => ({
          ...current,
          department: departments.includes(current.department) ? current.department : departments[0],
          jobTitle: jobTitles.includes(current.jobTitle) ? current.jobTitle : jobTitles[0],
        }));
      } catch (error) {
        setCatalogOptions({
          departments: DEFAULT_DEPARTMENTS,
          jobTitles: DEFAULT_JOB_TITLES,
        });
      }
    };

    loadCatalogOptions();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setErrorMessage('');
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    try {
      await axios.post(EMPLOYERS_API_URL, {
        fullName: formData.fullName.trim(),
        username: formData.username.trim(),
        password: formData.password,
        department: formData.department.trim(),
        jobTitle: formData.jobTitle.trim(),
        grade: '',
        remainingLeaveDays: DEFAULT_ANNUAL_LEAVE_DAYS,
      });
      navigate('/employers');
    } catch (error) {
      setErrorMessage(error.response?.data || "Impossible d'ajouter cet employe.");
      setSubmitting(false);
    }
  };

  return (
    <EventLayout active="employers">
      <section className="event-form-page">
        <div className="event-form-header">
          <div>
            <h1 className="events-page-title">Ajouter un employe</h1>
            <p className="events-page-subtitle">Renseignez le nom, l'identifiant et le mot de passe.</p>
          </div>
        </div>

        {errorMessage ? <p className="events-feedback events-feedback-error">{errorMessage}</p> : null}

        <form className="event-form-card" onSubmit={handleSubmit}>
          <div className="event-form-grid">
            <label className="event-form-field">
              <span>Nom</span>
              <input
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Nom complet"
                required
              />
            </label>

            <label className="event-form-field">
              <span>Identifiant</span>
              <input
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="emp002"
                required
              />
            </label>

            <label className="event-form-field event-form-field-full">
              <span>Mot de passe</span>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mot de passe"
                required
              />
            </label>

            <label className="event-form-field">
              <span>Departement</span>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
              >
                {catalogOptions.departments.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="event-form-field">
              <span>Role</span>
              <select
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
              >
                {catalogOptions.jobTitles.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="event-form-actions">
            <button className="events-secondary-button" type="button" onClick={() => navigate('/employers')}>
              Annuler
            </button>
            <button className="events-primary-button" type="submit" disabled={submitting}>
              {submitting ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </section>
    </EventLayout>
  );
};

export default EmployerAdd;
