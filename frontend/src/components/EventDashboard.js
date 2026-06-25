import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import EventLayout from './EventLayout';
import './Events.css';
import { API_URL, isArchivedEvent } from '../utils/eventUtils';

const toTimestamp = (value) => {
  const parsed = new Date(value || 0);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const getUpcomingWindowCount = (events, windowInDays) => {
  const now = Date.now();
  const limit = now + (windowInDays * 24 * 60 * 60 * 1000);

  return events.filter((event) => {
    const eventTime = toTimestamp(event.startDate || event.endDate);
    return eventTime >= now && eventTime <= limit;
  }).length;
};

const EventDashboard = () => {
  const [events, setEvents] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(API_URL);
        setEvents(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        setErrorMessage("Impossible de charger le dashboard des événements.");
      }
    };

    fetchEvents();
  }, []);

  const stats = useMemo(() => {
    const totalEvents = events.length;
    const activeEvents = events.filter((event) => !isArchivedEvent(event.endDate, event.startDate));
    const archivedEvents = totalEvents - activeEvents.length;
    const totalParticipants = events.reduce((sum, event) => sum + (event.participantCount || 0), 0);
    const totalCapacity = events.reduce((sum, event) => sum + (event.participantLimit || 0), 0);
    const fillRate = totalCapacity > 0 ? Math.round((totalParticipants / totalCapacity) * 100) : 0;
    const upcomingThisMonth = getUpcomingWindowCount(activeEvents, 30);
    const typeMap = events.reduce((accumulator, event) => {
      const key = event.type || 'Autre';
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    const typeBreakdown = Object.entries(typeMap)
      .map(([label, count]) => ({
        label,
        count,
        share: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0,
      }))
      .sort((left, right) => right.count - left.count);

    return {
      totalEvents,
      activeEvents: activeEvents.length,
      archivedEvents,
      totalParticipants,
      totalCapacity,
      fillRate,
      upcomingThisMonth,
      typeBreakdown,
    };
  }, [events]);

  const statusSegments = [
    { label: 'Actual events', value: stats.activeEvents, colorClass: 'events-chart-fill-green' },
    { label: 'Archive event', value: stats.archivedEvents, colorClass: 'events-chart-fill-amber' },
  ];

  const maxStatusValue = Math.max(1, ...statusSegments.map((item) => item.value));

  return (
    <EventLayout active="events-dashboard">
      <section className="events-toolbar">
        <div>
          <h1 className="events-page-title">Dashboard événements</h1>
          <p className="events-page-subtitle">Vue rapide des volumes, participations et répartition des événements.</p>
        </div>
      </section>

      {errorMessage ? <p className="events-feedback events-feedback-error">{errorMessage}</p> : null}

      <section className="events-dashboard-grid">
        <article className="events-dashboard-card">
          <span className="events-dashboard-label">Total events</span>
          <strong className="events-dashboard-value">{stats.totalEvents}</strong>
          <p className="events-dashboard-note">{stats.upcomingThisMonth} prévus dans les 30 prochains jours.</p>
        </article>

        <article className="events-dashboard-card">
          <span className="events-dashboard-label">Participants</span>
          <strong className="events-dashboard-value">{stats.totalParticipants}</strong>
          <p className="events-dashboard-note">{stats.totalCapacity || 0} places ouvertes sur l'ensemble des événements.</p>
        </article>

        <article className="events-dashboard-card events-dashboard-card-ring">
          <span className="events-dashboard-label">Taux de remplissage</span>
          <div
            className="events-ring-chart"
            style={{ '--ring-value': `${stats.fillRate}%` }}
            aria-label={`Taux de remplissage ${stats.fillRate}%`}
          >
            <span>{stats.fillRate}%</span>
          </div>
        </article>
      </section>

      <section className="events-dashboard-charts">
        <article className="events-dashboard-card">
          <div className="events-chart-header">
            <h2>Répartition</h2>
            <span>{stats.totalEvents} total</span>
          </div>

          <div className="events-chart-list">
            {statusSegments.map((item) => (
              <div key={item.label} className="events-chart-row">
                <div className="events-chart-row-meta">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
                <div className="events-chart-track">
                  <div
                    className={`events-chart-fill ${item.colorClass}`}
                    style={{ width: `${(item.value / maxStatusValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="events-dashboard-card">
          <div className="events-chart-header">
            <h2>Types d'événements</h2>
            <span>{stats.typeBreakdown.length} catégories</span>
          </div>

          <div className="events-chart-list">
            {stats.typeBreakdown.length > 0 ? stats.typeBreakdown.map((item) => (
              <div key={item.label} className="events-chart-row">
                <div className="events-chart-row-meta">
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
                <div className="events-chart-track">
                  <div className="events-chart-fill events-chart-fill-dark" style={{ width: `${item.share}%` }} />
                </div>
              </div>
            )) : (
              <p className="events-empty-state">Aucune donnée disponible pour le moment.</p>
            )}
          </div>
        </article>
      </section>
    </EventLayout>
  );
};

export default EventDashboard;
