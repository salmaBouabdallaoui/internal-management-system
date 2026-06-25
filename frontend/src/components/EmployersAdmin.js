import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { apiUrl } from '../config/api';
import EventLayout from './EventLayout';
import { useAuth } from '../context/AuthContext';
import './EmployersAdmin.css';

const EMPLOYERS_API_URL = apiUrl('/api/admin/employers');
const DEFAULT_DEPARTMENT = 'Non renseigne';
const CATALOG_API_URL = apiUrl('/api/admin/catalog-options');
const DEFAULT_JOB_TITLES = ['Ingenieur', 'Architecte', 'Administrateur', 'Technicien', 'Chef de division', 'Chef de service', 'Admin RH'];
const DEFAULT_DEPARTMENTS = ['DSIC', 'DBPI', 'DP'];
const GRADE_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8+'];

const buildDepartmentsMap = (employers) => employers.reduce((groups, employer) => {
  const department = employer.department || DEFAULT_DEPARTMENT;
  if (!groups[department]) {
    groups[department] = [];
  }
  groups[department].push(employer);
  return groups;
}, {});

const pluralize = (count, singular, plural) => `${count} ${count > 1 ? plural : singular}`;

const EmployersAdmin = () => {
  const { isAdmin, isDivisionChief, isServiceChief } = useAuth();
  const [employers, setEmployers] = useState([]);
  const [selectedEmployerId, setSelectedEmployerId] = useState(null);
  const [selectedEmployer, setSelectedEmployer] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openDepartments, setOpenDepartments] = useState({});
  const [catalogOptions, setCatalogOptions] = useState({
    departments: DEFAULT_DEPARTMENTS,
    jobTitles: DEFAULT_JOB_TITLES,
  });
  const [catalogForms, setCatalogForms] = useState({
    department: '',
    jobTitle: '',
  });
  const [catalogStatus, setCatalogStatus] = useState('');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isCatalogPopoverOpen, setIsCatalogPopoverOpen] = useState(false);
  const [activeCatalogAction, setActiveCatalogAction] = useState('');
  const departmentInputRef = useRef(null);
  const jobTitleInputRef = useRef(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    username: '',
    jobTitle: DEFAULT_JOB_TITLES[0],
    department: DEFAULT_DEPARTMENTS[0],
    grade: GRADE_OPTIONS[0],
    password: '',
  });
  const canManageEmployees = isAdmin;
  const isDivisionView = !canManageEmployees && (isDivisionChief || isServiceChief);
  const pageSubtitle = canManageEmployees
    ? 'Gerez les comptes employes et suivez leur participation.'
    : (isDivisionView ? 'Consultez les employes de votre division.' : 'Consultez la liste des employes autorises.');

  const loadCatalogOptions = async () => {
    try {
      const response = await axios.get(CATALOG_API_URL);
      const departments = response.data?.departments?.length ? response.data.departments : DEFAULT_DEPARTMENTS;
      const jobTitles = response.data?.jobTitles?.length ? response.data.jobTitles : DEFAULT_JOB_TITLES;
      setCatalogOptions({ departments, jobTitles });
      setCatalogForms((current) => ({
        department: current.department && departments.includes(current.department) ? current.department : '',
        jobTitle: current.jobTitle && jobTitles.includes(current.jobTitle) ? current.jobTitle : '',
      }));
    } catch (error) {
      setCatalogOptions({
        departments: DEFAULT_DEPARTMENTS,
        jobTitles: DEFAULT_JOB_TITLES,
      });
    }
  };

  const loadEmployers = async (preferredEmployerId = null) => {
    try {
      const response = await axios.get(EMPLOYERS_API_URL);
      const items = response.data;
      setEmployers(items);
      setOpenDepartments((current) => {
        const next = { ...current };
        items.forEach((item) => {
          const department = item.department || DEFAULT_DEPARTMENT;
          if (typeof next[department] === 'undefined') {
            next[department] = true;
          }
        });
        return next;
      });
      setErrorMessage('');

      if (items.length === 0) {
        setSelectedEmployerId(null);
        setSelectedEmployer(null);
        return;
      }

      const nextSelectedId = preferredEmployerId && items.some((item) => item.id === preferredEmployerId)
        ? preferredEmployerId
        : (selectedEmployerId && items.some((item) => item.id === selectedEmployerId) ? selectedEmployerId : items[0].id);

      setSelectedEmployerId(nextSelectedId);
    } catch (error) {
      setErrorMessage('Impossible de charger les employes.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmployerDetails = useCallback(async (employerId) => {
    if (!employerId) {
      setSelectedEmployer(null);
      return;
    }

    setIsDetailsLoading(true);
    try {
      const response = await axios.get(`${EMPLOYERS_API_URL}/${employerId}`);
      const employer = response.data;
      setSelectedEmployer(employer);
      setEditForm({
        fullName: employer.fullName || '',
        username: employer.username || '',
        jobTitle: employer.jobTitle && catalogOptions.jobTitles.includes(employer.jobTitle) ? employer.jobTitle : (employer.jobTitle || catalogOptions.jobTitles[0]),
        department: employer.department && catalogOptions.departments.includes(employer.department) ? employer.department : (employer.department || catalogOptions.departments[0]),
        grade: employer.grade && GRADE_OPTIONS.includes(employer.grade) ? employer.grade : GRADE_OPTIONS[0],
        password: '',
      });
      setErrorMessage('');
      setSuccessMessage('');
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(error.response?.data || "Impossible de charger cet employe.");
      setSelectedEmployer(null);
    } finally {
      setIsDetailsLoading(false);
    }
  }, [catalogOptions.departments, catalogOptions.jobTitles]);

  useEffect(() => {
    loadEmployers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadCatalogOptions();
  }, []);

  useEffect(() => {
    loadEmployerDetails(selectedEmployerId);
  }, [selectedEmployerId, loadEmployerDetails]);

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const resetEditForm = () => {
    if (!selectedEmployer) {
      return;
    }

      setEditForm({
        fullName: selectedEmployer.fullName || '',
        username: selectedEmployer.username || '',
        jobTitle: selectedEmployer.jobTitle && catalogOptions.jobTitles.includes(selectedEmployer.jobTitle) ? selectedEmployer.jobTitle : (selectedEmployer.jobTitle || catalogOptions.jobTitles[0]),
        department: selectedEmployer.department && catalogOptions.departments.includes(selectedEmployer.department) ? selectedEmployer.department : (selectedEmployer.department || catalogOptions.departments[0]),
        grade: selectedEmployer.grade && GRADE_OPTIONS.includes(selectedEmployer.grade) ? selectedEmployer.grade : GRADE_OPTIONS[0],
        password: '',
      });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!selectedEmployerId) {
      return;
    }

    setIsSaving(true);
    try {
      await axios.put(`${EMPLOYERS_API_URL}/${selectedEmployerId}`, {
        fullName: editForm.fullName.trim(),
        username: editForm.username.trim(),
        jobTitle: editForm.jobTitle,
        department: editForm.department,
        grade: editForm.grade,
        password: editForm.password,
      });
      setSuccessMessage('Les details de l employe ont ete mis a jour.');
      await loadEmployers(selectedEmployerId);
      await loadEmployerDetails(selectedEmployerId);
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(error.response?.data || "Impossible de modifier cet employe.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCatalogChange = (event) => {
    const { name, value } = event.target;
    setCatalogForms((current) => ({
      ...current,
      [name]: value,
    }));
    setCatalogStatus('');
  };

  const handleAddCatalogOption = async (type) => {
    const value = type === 'department' ? catalogForms.department : catalogForms.jobTitle;
    if (!value.trim()) {
      setCatalogStatus('La valeur est obligatoire.');
      return;
    }

    try {
      await axios.post(
        type === 'department' ? `${CATALOG_API_URL}/departments` : `${CATALOG_API_URL}/job-titles`,
        { value: value.trim() }
      );
      setCatalogStatus(type === 'department' ? 'Departement ajoute.' : 'Role ajoute.');
      setCatalogForms((current) => ({
        ...current,
        [type]: '',
      }));
      await loadCatalogOptions();
      setIsCatalogPopoverOpen(false);
      setActiveCatalogAction('');
      window.setTimeout(() => setCatalogStatus(''), 1800);
    } catch (error) {
      setCatalogStatus(error.response?.data || 'Impossible d ajouter cette valeur.');
      window.setTimeout(() => setCatalogStatus(''), 2500);
    }
  };

  const handleDeleteCatalogOption = async (type, value) => {
    const confirmed = window.confirm(`Supprimer ${value} ?`);
    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(
        type === 'department'
          ? `${CATALOG_API_URL}/departments/${encodeURIComponent(value)}`
          : `${CATALOG_API_URL}/job-titles/${encodeURIComponent(value)}`
      );
      setCatalogStatus(type === 'department' ? 'Departement supprime.' : 'Role supprime.');
      await loadCatalogOptions();
      window.setTimeout(() => setCatalogStatus(''), 1800);
    } catch (error) {
      setCatalogStatus(error.response?.data || 'Impossible de supprimer cette valeur.');
      window.setTimeout(() => setCatalogStatus(''), 2500);
    }
  };

  const openCatalogAction = (type) => {
    const targetInput = type === 'department' ? departmentInputRef.current : jobTitleInputRef.current;
    setIsAddMenuOpen(false);
    setActiveCatalogAction(type);
    setIsCatalogPopoverOpen(true);
    window.setTimeout(() => {
      targetInput?.focus();
    }, 0);
  };

  const closeCatalogPopover = () => {
    setIsCatalogPopoverOpen(false);
    setActiveCatalogAction('');
  };

  const renderExistingCatalogItems = (type, items) => (
    <div className="employers-catalog-existing-column">
      <strong>{type === 'department' ? 'Departements existants' : 'Roles existants'}</strong>
      <div className="employers-catalog-existing-list">
        {items.map((item) => (
          <div className="employers-catalog-existing-item" key={item}>
            <span>{item}</span>
            <button
              className="employers-catalog-delete-button"
              type="button"
              onClick={() => handleDeleteCatalogOption(type, item)}
              aria-label={type === 'department' ? `Supprimer le departement ${item}` : `Supprimer le role ${item}`}
              title={`Supprimer ${item}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!event.target.closest('.employers-add-menu-wrap') && !event.target.closest('.employers-catalog-modal')) {
        setIsAddMenuOpen(false);
        closeCatalogPopover();
      }
    };

    if (isAddMenuOpen || isCatalogPopoverOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isAddMenuOpen, isCatalogPopoverOpen]);

  const handleDelete = async () => {
    if (!selectedEmployerId || !selectedEmployer) {
      return;
    }

    const confirmed = window.confirm(`Supprimer l employe ${selectedEmployer.fullName} ?`);
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await axios.delete(`${EMPLOYERS_API_URL}/${selectedEmployerId}`);
      setSuccessMessage('Employe supprime.');
      setSelectedEmployer(null);
      setSelectedEmployerId(null);
      setIsEditing(false);
      await loadEmployers();
    } catch (error) {
      setErrorMessage(error.response?.data || "Impossible de supprimer cet employe.");
    } finally {
      setIsDeleting(false);
    }
  };

  const departmentsMap = buildDepartmentsMap(employers);
  const departments = Object.entries(departmentsMap).sort(([left], [right]) => left.localeCompare(right));

  return (
    <EventLayout active="employers" shellClassName="events-shell-wide">
      <section className="events-toolbar">
        <div>
          <h1 className="events-page-title">Employes</h1>
          <p className="events-page-subtitle">
            {pageSubtitle}
          </p>
        </div>
        {canManageEmployees ? (
          <div className="employers-add-menu-wrap">
            <button
              className="events-primary-button employers-add-trigger"
              type="button"
              aria-label="Ajouter"
              title="Ajouter"
              aria-haspopup="menu"
              aria-expanded={isAddMenuOpen}
              onClick={() => setIsAddMenuOpen((current) => !current)}
            >
              +
            </button>

            {isAddMenuOpen ? (
              <div className="employers-add-menu" role="menu" aria-label="Actions de creation">
                <Link className="employers-add-menu-item" to="/employers/new" role="menuitem" onClick={() => setIsAddMenuOpen(false)}>
                  Ajouter un employe
                </Link>
                <button className="employers-add-menu-item" type="button" role="menuitem" onClick={() => openCatalogAction('department')}>
                  Ajouter une division
                </button>
                <button className="employers-add-menu-item" type="button" role="menuitem" onClick={() => openCatalogAction('jobTitle')}>
                  Ajouter un role
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {isCatalogPopoverOpen && canManageEmployees ? (
        <div className="employers-catalog-backdrop" role="presentation" onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeCatalogPopover();
          }
        }}>
          <section className="employers-catalog-modal" aria-label="Actions de plateforme">
            <div className="employers-catalog-modal-header">
              <div>
                <h2>{activeCatalogAction === 'department' ? 'Ajouter un departement' : 'Ajouter un role'}</h2>
                <p>{activeCatalogAction === 'department' ? 'Ajoutez un departement puis gerez les departements existants.' : 'Ajoutez un role puis gerez les roles existants.'}</p>
              </div>
              <button className="employers-catalog-close" type="button" onClick={closeCatalogPopover} aria-label="Fermer">
                ×
              </button>
            </div>

            {activeCatalogAction === 'department' ? (
              <div className="event-form-card employers-catalog-form">
                <div className="event-form-grid">
                  <label className="event-form-field event-form-field-full">
                    <span>Nom du departement</span>
                    <input ref={departmentInputRef} name="department" value={catalogForms.department} onChange={handleCatalogChange} placeholder="Nouveau departement" autoFocus />
                  </label>
                </div>
                <div className="event-form-actions">
                  <button className="events-primary-button" type="button" onClick={() => handleAddCatalogOption('department')}>
                    Ajouter
                  </button>
                </div>
              </div>
            ) : null}

            {activeCatalogAction === 'jobTitle' ? (
              <div className="event-form-card employers-catalog-form">
                <div className="event-form-grid">
                  <label className="event-form-field event-form-field-full">
                    <span>Nom du role</span>
                    <input ref={jobTitleInputRef} name="jobTitle" value={catalogForms.jobTitle} onChange={handleCatalogChange} placeholder="Nouveau role" autoFocus />
                  </label>
                </div>
                <div className="event-form-actions">
                  <button className="events-primary-button" type="button" onClick={() => handleAddCatalogOption('jobTitle')}>
                    Ajouter
                  </button>
                </div>
              </div>
            ) : null}

            <div className="employers-catalog-existing">
              {activeCatalogAction === 'department'
                ? renderExistingCatalogItems('department', catalogOptions.departments)
                : renderExistingCatalogItems('jobTitle', catalogOptions.jobTitles)}
            </div>
          </section>
        </div>
      ) : null}

      {catalogStatus ? <p className="events-feedback events-feedback-success">{catalogStatus}</p> : null}

      {errorMessage ? <p className="events-feedback events-feedback-error">{errorMessage}</p> : null}
      {successMessage ? <p className="events-feedback events-feedback-success">{successMessage}</p> : null}

      <section className="events-dashboard-grid employers-admin-grid">
        <article className="events-dashboard-card employers-list-card">
          <div className="events-chart-header">
            <h2>Liste des employes</h2>
            <span>{pluralize(employers.length, 'compte', 'comptes')}</span>
          </div>

          {isLoading ? (
            <p className="events-empty-state">Chargement...</p>
          ) : employers.length > 0 ? (
            <div className="employers-accordion-list">
              {departments.map(([department, departmentEmployers]) => (
                <div className="employers-accordion-group" key={department}>
                  <button
                    className="employers-accordion-trigger"
                    type="button"
                    onClick={() => {
                      setOpenDepartments((current) => ({
                        ...current,
                        [department]: !current[department],
                      }));
                    }}
                  >
                    <span>{department}</span>
                    <span>{openDepartments[department] ? '−' : '+'}</span>
                  </button>

                  {openDepartments[department] ? (
                    <div className="employers-list">
                      {departmentEmployers.map((employer) => (
                        <button
                          key={employer.id}
                          className={`employers-list-item ${selectedEmployerId === employer.id ? 'employers-list-item-active' : ''}`}
                          type="button"
                          onClick={() => {
                            setSelectedEmployerId(employer.id);
                            setErrorMessage('');
                          }}
                        >
                          <span className="employers-list-name">{employer.fullName}</span>
                          <span className="employers-list-meta">{employer.jobTitle || 'Grade non renseigne'}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="events-empty-state">Aucun employe disponible.</p>
          )}
        </article>

        <article className="events-dashboard-card employers-form-card">
          <div className="events-chart-header">
            <h2>Details employe</h2>
            <div className="employers-detail-header-actions">
              {selectedEmployer && canManageEmployees ? (
                <>
                  <button
                    className="events-inline-button events-inline-button-danger"
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Suppression...' : 'Supprimer'}
                  </button>
                  <button
                    className="events-secondary-button"
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      resetEditForm();
                      setSuccessMessage('');
                      setErrorMessage('');
                    }}
                  >
                    Modifier
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {isDetailsLoading ? (
            <p className="events-empty-state">Chargement...</p>
          ) : selectedEmployer ? (
            <form className="event-form-card employers-details-card" onSubmit={handleSave}>
              <div className="employers-details-header">
                <div className="employers-details-head-copy">
                  <h3>{selectedEmployer.fullName}</h3>
                  <p>{selectedEmployer.jobTitle}</p>
                </div>
              </div>

              <div className="event-form-grid employers-edit-grid">
                <label className="event-form-field">
                  <span>Nom complet</span>
                  <input name="fullName" value={editForm.fullName} onChange={handleEditChange} disabled={!isEditing} required />
                </label>

                <label className="event-form-field">
                  <span>Identifiant</span>
                  <input name="username" value={editForm.username} onChange={handleEditChange} disabled={!isEditing} required />
                </label>

                <label className="event-form-field">
                  <span>Grade</span>
                  <select name="jobTitle" value={editForm.jobTitle} onChange={handleEditChange} disabled={!isEditing}>
                    {catalogOptions.jobTitles.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="event-form-field">
                  <span>Departement</span>
                  <select name="department" value={editForm.department} onChange={handleEditChange} disabled={!isEditing}>
                    {catalogOptions.departments.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                {isEditing ? (
                  <label className="event-form-field event-form-field-full">
                    <span>Nouveau mot de passe</span>
                    <input
                      name="password"
                      type="password"
                      value={editForm.password}
                      onChange={handleEditChange}
                      placeholder="Laisser vide pour ne pas modifier"
                    />
                  </label>
                ) : null}
              </div>

              <div className="event-details-grid employers-details-grid">
                <div className="event-details-section">
                  <span className="event-details-meta-label">Conges restants</span>
                  <p>{pluralize(selectedEmployer.remainingLeaveDays, 'jour', 'jours')}</p>
                </div>
              </div>

              <div className="employers-stats">
                <div className="event-details-grid employers-details-grid">
                  <div className="event-details-section">
                    <span className="event-details-meta-label">Projets</span>
                    <p>{selectedEmployer.projectParticipationCount}</p>
                  </div>

                  <div className="event-details-section">
                    <span className="event-details-meta-label">Evenements</span>
                    <p>{selectedEmployer.eventParticipationCount}</p>
                  </div>

                  <div className="event-details-section">
                    <span className="event-details-meta-label">Total</span>
                    <p>{selectedEmployer.totalParticipationCount}</p>
                  </div>
                </div>

                <div className="event-details-section employers-events-section">
                  <span className="event-details-meta-label">Evenements participes</span>
                  {selectedEmployer.events?.length ? (
                    <div className="employers-events-list">
                      {selectedEmployer.events.map((eventItem) => (
                        <div className="employers-events-item" key={eventItem.id}>
                          <span className="employers-events-id">#{eventItem.id}</span>
                          <span>{eventItem.title}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Aucune participation enregistree.</p>
                  )}
                </div>
              </div>

              {isEditing && canManageEmployees ? (
                <div className="event-form-actions employers-form-actions">
                  <span className="employers-password-hint">Laisser le mot de passe vide pour le conserver.</span>
                  <div className="employers-form-buttons">
                    <button
                      className="events-secondary-button"
                      type="button"
                      onClick={() => {
                        resetEditForm();
                        setIsEditing(false);
                        setErrorMessage('');
                      }}
                    >
                      Annuler
                    </button>
                    <button className="events-primary-button" type="submit" disabled={isSaving}>
                      {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              ) : null}
            </form>
          ) : (
            <p className="events-empty-state">Selectionnez un employe pour afficher ses details.</p>
          )}
        </article>
      </section>
    </EventLayout>
  );
};

export default EmployersAdmin;

