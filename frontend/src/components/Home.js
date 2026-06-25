import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../config/api';
import { Link } from 'react-router-dom';
import './Home.css';
import PortalHeader from './PortalHeader';
import PortalFooter from './PortalFooter';
import { useAuth } from '../context/AuthContext';

const formatDate = (value) => {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '--' : date.toLocaleDateString('fr-FR');
};

const formatDateTime = (value) => {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '--'
    : date.toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
};

const pluralize = (count, singular, plural) => `${count} ${count > 1 ? plural : singular}`;

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const formatNumber = (value) => new Intl.NumberFormat('fr-FR').format(Number(value || 0));

const formatLeaveStatus = (status) => {
  switch ((status || '').toUpperCase()) {
    case 'PENDING':
      return 'En attente';
    case 'PENDING_HR':
      return 'En attente RH';
    case 'APPROVED':
      return 'Approuvé';
    case 'REFUSED':
      return 'Refusé';
    default:
      return status || '--';
  }
};

const statusTone = (status) => {
  switch ((status || '').toUpperCase()) {
    case 'APPROVED':
      return 'success';
    case 'REFUSED':
      return 'critical';
    case 'PENDING':
    case 'PENDING_HR':
      return 'warning';
    default:
      return 'neutral';
  }
};

const normalizeDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const Home = () => {
  const { user, isAdmin, isSuperAdmin, isDivisionChief, isSessionLoading } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [myLeaveSpace, setMyLeaveSpace] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const dashboardMode = isSuperAdmin ? 'super-admin' : isDivisionChief ? 'division-chief' : isAdmin ? 'admin-hr' : 'employee';

  useEffect(() => {
    if (isSessionLoading) {
      return undefined;
    }

    if (!user) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        if (dashboardMode === 'employee') {
          const leaveResponse = await axios.get(apiUrl('/api/leaves/me'));
          if (!active) {
            return;
          }
          setMyLeaveSpace(leaveResponse.data);
        } else {
          const dashboardResponse = await axios.get(apiUrl('/api/leaves/dashboard'));
          if (!active) {
            return;
          }
          setDashboard(dashboardResponse.data);
        }

        if (dashboardMode !== 'super-admin') {
          try {
            const eventsResponse = await axios.get(apiUrl('/api/events'));
            if (active) {
              setEvents(Array.isArray(eventsResponse.data) ? eventsResponse.data : []);
            }
          } catch (eventsError) {
            if (active) {
              setEvents([]);
            }
          }
        } else if (active) {
          setEvents([]);
        }
      } catch (loadError) {
        if (active) {
          setError('Impossible de charger le tableau de bord.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [dashboardMode, isSessionLoading, user]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events
      .map((event) => ({
        ...event,
        parsedStart: normalizeDate(event.startDate),
        parsedEnd: normalizeDate(event.endDate),
      }))
      .filter((event) => event.parsedStart && event.parsedStart >= today)
      .sort((left, right) => left.parsedStart - right.parsedStart || (left.parsedEnd || left.parsedStart) - (right.parsedEnd || right.parsedStart))
      .slice(0, 3);
  }, [events]);

  const employeeRequests = myLeaveSpace?.requests || [];
  const remainingLeaveDays = myLeaveSpace?.profile?.remainingLeaveDays ?? 0;

  const renderEventList = (items, emptyLabel) => (
    <div className="home-list">
      {items.length ? items.map((event) => {
        const startDate = formatDateTime(event.startDate);
        const endDate = formatDateTime(event.endDate);
        return (
          <article className="home-event-item" key={event.id}>
            {event.photoUrl ? (
              <img className="home-event-thumb" src={event.photoUrl} alt={event.title} />
            ) : (
              <div className="home-event-thumb home-event-thumb-empty" />
            )}
            <div className="home-event-body">
              <strong className="home-item-title">{event.title}</strong>
              <span className="home-item-meta">{event.type || 'Événement'}</span>
              <span className="home-item-meta">{startDate === endDate ? startDate : `${startDate} - ${endDate}`}</span>
            </div>
          </article>
        );
      }) : <p className="home-empty">{emptyLabel}</p>}
    </div>
  );

  const renderRequestList = (items, emptyLabel) => (
    <div className="home-list">
      {items.length ? items.map((request) => {
        const tone = statusTone(request.status);
        return (
          <article className="home-request-item" key={request.id}>
            <div className="home-request-main">
              <strong className="home-item-title">{request.leaveType}</strong>
              <span className="home-item-meta">{`${formatDate(request.startDate)} au ${formatDate(request.endDate)} - ${request.durationDays} j`}</span>
              <span className="home-item-meta">{request.requesterDepartment}</span>
            </div>
            <span className={`home-status-pill home-status-pill--${tone}`}>{formatLeaveStatus(request.status)}</span>
          </article>
        );
      }) : <p className="home-empty">{emptyLabel}</p>}
    </div>
  );

  const renderDivisionChiefDashboard = () => {
    const pendingRequests = (dashboard?.pendingRequests || []).slice(0, 4);
    const todayAbsences = dashboard?.todayAbsences || [];

    return (
      <section className="home-dashboard-grid">
        <article className="home-panel">
          <div className="home-panel-head">
            <div>
              <h2>Congés en attente de ma division</h2>
              <p>{pluralize(dashboard?.pendingApprovalCount || 0, 'demande', 'demandes')} à valider dans votre division.</p>
            </div>
            <Link className="home-panel-link" to="/conge">Ouvrir</Link>
          </div>
          {renderRequestList(pendingRequests, 'Aucune demande en attente.')}
        </article>

        <article className="home-panel">
          <div className="home-panel-head">
            <div>
              <h2>Absents du jour dans ma division</h2>
              <p>{pluralize(todayAbsences.length, 'absence', 'absences')} aujourd&apos;hui.</p>
            </div>
            <Link className="home-panel-link" to="/conge">Voir</Link>
          </div>
          <div className="home-list">
            {todayAbsences.length ? todayAbsences.map((request) => (
              <article className="home-request-item" key={request.id}>
                <div className="home-request-main">
                  <strong className="home-item-title">{request.requesterFullName}</strong>
                  <span className="home-item-meta">{`${request.requesterRole} - ${request.leaveType}`}</span>
                  <span className="home-item-meta">{`${formatDate(request.startDate)} au ${formatDate(request.endDate)}`}</span>
                </div>
                <span className="home-status-pill home-status-pill--warning">{request.durationDays} j</span>
              </article>
            )) : <p className="home-empty">Aucun agent absent aujourd&apos;hui.</p>}
          </div>
        </article>

        <article className="home-panel">
          <div className="home-panel-head">
            <div>
              <h2>Prochains événements</h2>
              <p>{pluralize(upcomingEvents.length, 'événement', 'événements')} à venir.</p>
            </div>
            <Link className="home-panel-link" to="/events">Voir</Link>
          </div>
          {renderEventList(upcomingEvents, 'Aucun événement à venir.')}
        </article>
      </section>
    );
  };

  const renderEmployeeDashboard = () => {
    const requests = employeeRequests.slice(0, 4);

    return (
      <section className="home-dashboard-grid">
        <article className="home-panel">
          <div className="home-panel-head">
            <div>
              <h2>Prochains événements</h2>
              <p>{pluralize(upcomingEvents.length, 'événement', 'événements')} à venir.</p>
            </div>
            <Link className="home-panel-link" to="/events">Voir</Link>
          </div>
          {renderEventList(upcomingEvents, 'Aucun événement à venir.')}
        </article>

        <article className="home-panel">
          <div className="home-panel-head">
            <div>
              <h2>Mes congés en cours / statut</h2>
              <p>Historique de vos demandes et états récents.</p>
            </div>
            <Link className="home-panel-link" to="/conge">Ouvrir</Link>
          </div>
          {renderRequestList(requests, 'Aucune demande de congé.')}
        </article>

        <article className="home-panel home-panel--balance">
          <div className="home-panel-head">
            <div>
              <h2>Solde de congés restants</h2>
              <p>Votre solde disponible pour l&apos;année en cours.</p>
            </div>
          </div>
          <div className="home-balance-value">{formatNumber(remainingLeaveDays)}</div>
          <div className="home-balance-label">jours</div>
        </article>
      </section>
    );
  };

  const renderAdminDashboard = () => {
    const stats = dashboard?.adminHrStats;
    const pendingHrRequests = (dashboard?.pendingHrRequests || []).slice(0, 4);

    return (
      <>
        <section className="home-dashboard-grid">
          <article className="home-panel">
            <div className="home-panel-head">
              <div>
                <h2>Statistiques RH globales</h2>
                <p>Vue d&apos;ensemble des congés et des effectifs.</p>
              </div>
            </div>
            <div className="home-stat-grid">
              <div className="home-stat">
                <span>Employés</span>
                <strong>{stats ? formatNumber(stats.totalEmployees) : '--'}</strong>
              </div>
              <div className="home-stat">
                <span>En congé</span>
                <strong>{stats ? formatNumber(stats.employeesOnLeave) : '--'}</strong>
              </div>
              <div className="home-stat">
                <span>Taux d&apos;absenteisme</span>
                <strong>{stats ? formatPercent(stats.absenteeismRate) : '--'}</strong>
              </div>
              <div className="home-stat">
                <span>Demandes totales</span>
                <strong>{stats ? formatNumber(stats.globalLeaveStats.totalRequests) : '--'}</strong>
              </div>
            </div>
          </article>

          <article className="home-panel">
            <div className="home-panel-head">
              <div>
                <h2>Demandes RH en attente</h2>
                <p>{pluralize(dashboard?.pendingHrApprovalCount || 0, 'demande', 'demandes')} à traiter par RH.</p>
              </div>
              <Link className="home-panel-link" to="/conge">Ouvrir</Link>
            </div>
            {renderRequestList(pendingHrRequests, 'Aucune demande RH en attente.')}
          </article>
        </section>

        {dashboard?.adminHrStats ? (
          <section className="home-dashboard-grid">
            <article className="home-panel">
              <div className="home-panel-head">
                <div>
                  <h2>Stats congés globales</h2>
                  <p>État des demandes de congé.</p>
                </div>
              </div>
              <div className="home-stat-grid">
                <div className="home-stat">
                  <span>En attente</span>
                  <strong>{formatNumber(dashboard.adminHrStats.globalLeaveStats.pendingRequests)}</strong>
                </div>
                <div className="home-stat">
                  <span>En attente RH</span>
                  <strong>{formatNumber(dashboard.adminHrStats.globalLeaveStats.pendingHrRequests)}</strong>
                </div>
                <div className="home-stat">
                  <span>Approuvées</span>
                  <strong>{formatNumber(dashboard.adminHrStats.globalLeaveStats.approvedRequests)}</strong>
                </div>
                <div className="home-stat">
                  <span>Refusées</span>
                  <strong>{formatNumber(dashboard.adminHrStats.globalLeaveStats.refusedRequests)}</strong>
                </div>
              </div>
            </article>
          </section>
        ) : null}
      </>
    );
  };

  const renderSuperAdminDashboard = () => {
    const stats = dashboard?.superAdminStats;
    const systemHealth = stats?.systemHealth;
    const effectif = stats?.globalEffectifStats;
    const adminHrStats = dashboard?.adminHrStats;
    const alerts = stats?.alerts || [];
    const activity = stats?.recentActivity || [];

    const displayEffectif = effectif || (adminHrStats ? {
      totalAccounts: null,
      employees: adminHrStats.totalEmployees,
      admins: null,
      divisionChiefs: null,
      serviceChiefs: null,
      employeesOnLeaveToday: adminHrStats.employeesOnLeave,
      lockedAccounts: null,
    } : null);

    const formatOptionalNumber = (value) => (
      value === null || value === undefined ? '--' : formatNumber(value)
    );

    return (
      <section className="home-dashboard-grid">
        <article className="home-panel">
          <div className="home-panel-head">
            <div>
              <h2>Santé système + uptime</h2>
              <p>État de la plateforme en temps réel.</p>
            </div>
          </div>
          <div className="home-stat-grid">
            <div className="home-stat">
              <span>Application</span>
              <strong>{systemHealth?.applicationStatus || '--'}</strong>
            </div>
            <div className="home-stat">
              <span>Base de données</span>
              <strong>{systemHealth?.databaseStatus || '--'}</strong>
            </div>
            <div className="home-stat">
              <span>Uptime</span>
              <strong>{systemHealth?.uptimeLabel || '--'}</strong>
            </div>
          </div>
        </article>

        <article className="home-panel">
          <div className="home-panel-head">
            <div>
              <h2>Effectif global + stats</h2>
              <p>Lecture rapide des comptes et des positions clés.</p>
            </div>
          </div>
          <div className="home-stat-grid">
            <div className="home-stat">
              <span>Comptes</span>
              <strong>{formatOptionalNumber(displayEffectif?.totalAccounts)}</strong>
            </div>
            <div className="home-stat">
              <span>Employés</span>
              <strong>{formatOptionalNumber(displayEffectif?.employees)}</strong>
            </div>
            <div className="home-stat">
              <span>Admins</span>
              <strong>{formatOptionalNumber(displayEffectif?.admins)}</strong>
            </div>
            <div className="home-stat">
              <span>Chefs de division</span>
              <strong>{formatOptionalNumber(displayEffectif?.divisionChiefs)}</strong>
            </div>
            <div className="home-stat">
              <span>Chefs de service</span>
              <strong>{formatOptionalNumber(displayEffectif?.serviceChiefs)}</strong>
            </div>
            <div className="home-stat">
              <span>En congé</span>
              <strong>{formatOptionalNumber(displayEffectif?.employeesOnLeaveToday)}</strong>
            </div>
          </div>
        </article>

        <article className="home-panel">
          <div className="home-panel-head">
            <div>
              <h2>Alertes système</h2>
              <p>Signalements opératoires à surveiller.</p>
            </div>
          </div>
          <div className="home-list">
            {alerts.length ? alerts.map((alert) => (
              <article className="home-alert-item" key={`${alert.title}-${alert.description}`}>
                <div className="home-alert-main">
                  <strong className="home-item-title">{alert.title}</strong>
                  <span className="home-item-meta">{alert.description}</span>
                </div>
                <span className={`home-status-pill home-status-pill--${alert.severity === 'critical' ? 'critical' : 'warning'}`}>
                  {formatNumber(alert.count)}
                </span>
              </article>
            )) : <p className="home-empty">Aucune alerte active.</p>}
          </div>
        </article>

        <article className="home-panel">
          <div className="home-panel-head">
            <div>
              <h2>Activité des admins</h2>
              <p>Dernières actions tracées dans le journal.</p>
            </div>
          </div>
          <div className="home-list">
            {activity.length ? activity.map((item) => (
              <article className="home-activity-item" key={`${item.actorUsername}-${item.createdAt}-${item.action}`}>
                <div className="home-activity-main">
                  <strong className="home-item-title">{item.actorUsername}</strong>
                  <span className="home-item-meta">
                    {`${item.action}${item.targetType ? ` - ${item.targetType}` : ''}${item.targetId ? ` #${item.targetId}` : ''}`}
                  </span>
                  {item.details ? <span className="home-item-meta">{item.details}</span> : null}
                </div>
                <span className="home-activity-time">{formatDateTime(item.createdAt)}</span>
              </article>
            )) : <p className="home-empty">Aucune activité récente.</p>}
          </div>
        </article>
      </section>
    );
  };

  return (
    <div className="home-page">
      <PortalHeader active="home" />

      <main className="home-content">
        <section className="home-hero">
          <div className="home-hero-copy">
            <h1>Accueil</h1>
            <p>
              {dashboardMode === 'super-admin'
                ? 'Pilotage de la plateforme, suivi de la santé technique et activité des comptes administrateurs.'
                : dashboardMode === 'division-chief'
                  ? 'Suivi des congés de la division, absents du jour et prochains événements.'
                  : dashboardMode === 'admin-hr'
                    ? 'Vue RH des congés, des demandes en attente et des indicateurs globaux.'
                    : 'Vos prochains événements, vos demandes de congé et votre solde restant.'}
            </p>
          </div>
        </section>

        {loading ? <section className="home-empty-state">Chargement...</section> : null}
        {error ? <section className="home-empty-state home-empty-state-error">{error}</section> : null}

        {!loading && !error && dashboardMode === 'super-admin' ? renderSuperAdminDashboard() : null}
        {!loading && !error && dashboardMode === 'division-chief' ? renderDivisionChiefDashboard() : null}
        {!loading && !error && dashboardMode === 'admin-hr' ? renderAdminDashboard() : null}
        {!loading && !error && dashboardMode === 'employee' ? renderEmployeeDashboard() : null}
      </main>

      <PortalFooter />
    </div>
  );
};

export default Home;
