import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../config/api';
import EventLayout from './EventLayout';
import './Team.css';

const TEAM_API_URL = apiUrl('/api/division/employees');

const Team = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadTeam = async () => {
      try {
        const response = await axios.get(TEAM_API_URL);
        setEmployees(response.data || []);
        setErrorMessage('');
      } catch (error) {
        setEmployees([]);
        setErrorMessage(error.response?.data || 'Impossible de charger la liste de votre division.');
      } finally {
        setLoading(false);
      }
    };

    loadTeam();
  }, []);

  return (
    <EventLayout active="home">
      <section className="team-page">
        <div className="events-toolbar">
          <div>
            <h1 className="events-page-title">Mon equipe</h1>
            <p className="events-page-subtitle">Liste des employes de votre division.</p>
          </div>
        </div>

        {errorMessage ? <p className="events-feedback events-feedback-error">{errorMessage}</p> : null}

        <div className="events-dashboard-card team-card">
          {loading ? (
            <p className="events-empty-state">Chargement...</p>
          ) : employees.length ? (
            <div className="team-list">
              {employees.map((employee) => (
                <div className="team-item" key={employee.id}>
                  <div className="team-item-main">
                    <strong>{employee.fullName}</strong>
                    <span>{employee.username}</span>
                  </div>
                  <div className="team-item-meta">
                    <span>{employee.jobTitle}</span>
                    <span>{employee.grade}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="events-empty-state">Aucun employe dans votre division.</p>
          )}
        </div>
      </section>
    </EventLayout>
  );
};

export default Team;
