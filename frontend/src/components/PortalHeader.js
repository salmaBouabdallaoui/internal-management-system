import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PortalHeader.css';
import logo from '../images/OIP11.svg';
import homeIconGreen from '../images/home icon.svg';
import homeIconWhite from '../images/home icon white.svg';
import eventsIconWhite from '../images/events icon.svg';
import eventsIconGreen from '../images/events icon green.svg';
import congesIconWhite from '../images/conges icon.svg';
import congesIconGreen from '../images/conges icon green.svg';
import calendarIconWhite from '../images/calendrier icon.svg';
import calendarIconGreen from '../images/calendrier icon green.svg';
import employeesIconWhite from '../images/employes icon.svg';
import employeesIconGreen from '../images/employes icon green.svg';
import helpIconWhite from '../images/aide icon.svg';
import helpIconGreen from '../images/aide icon green.svg';
import logoutIconWhite from '../images/logout icon.svg';
import logoutIconGreen from '../images/logout icon green.svg';

const formatTitleCase = (value) => {
  if (!value) {
    return '';
  }

  return value
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

const formatDateTime = (date) => {
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const formattedDate = dateFormatter.format(date);

  return `${formattedDate.charAt(0).toUpperCase()}${formattedDate.slice(1)} - ${timeFormatter.format(date)}`;
};

const PortalHeader = ({ active = 'home' }) => {
  const { logout, isAdmin, isSuperAdmin, isDivisionChief, isServiceChief, canAccessEmployeesDirectory, user } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    document.body.classList.toggle('portal-sidebar-collapsed', isCollapsed);
    return () => document.body.classList.remove('portal-sidebar-collapsed');
  }, [isCollapsed]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const profile = useMemo(() => {
    const rawFullName = (user?.fullName || '').trim();
    const fallbackName = formatTitleCase(user?.username || 'Utilisateur');
    const displayName = rawFullName || fallbackName;
    const departmentLabel = (user?.department || '').trim();
    const initialsSource = displayName.split(/\s+/).filter(Boolean);
    const initials = initialsSource.length >= 2
      ? `${initialsSource[0][0]}${initialsSource[1][0]}`
      : (initialsSource[0]?.slice(0, 2) || 'U');
    const roleLabel = isSuperAdmin
      ? 'Super Admin'
      : (isAdmin
        ? 'Admin'
        : isDivisionChief
          ? `Chef de division${departmentLabel ? ` ${departmentLabel}` : ''}`
          : isServiceChief
            ? `Chef de service${departmentLabel ? ` ${departmentLabel}` : ''}`
            : 'Employé');

    return { displayName, initials: initials.toUpperCase(), roleLabel };
  }, [isAdmin, isDivisionChief, isServiceChief, isSuperAdmin, user?.department, user?.fullName, user?.username]);

  const mainItems = [
    { key: 'home', label: 'Accueil', to: '/home', iconWhite: homeIconWhite, iconGreen: homeIconGreen },
    { key: 'events', label: 'Événements', to: '/events', iconWhite: eventsIconWhite, iconGreen: eventsIconGreen },
    { key: 'leaves', label: 'Congés', to: '/conge', iconWhite: congesIconWhite, iconGreen: congesIconGreen },
    { key: 'holidays', label: 'Calendrier', to: '/holidays', iconWhite: calendarIconWhite, iconGreen: calendarIconGreen },
    ...(canAccessEmployeesDirectory ? [{ key: 'employers', label: 'Employés', to: '/employers', iconWhite: employeesIconWhite, iconGreen: employeesIconGreen }] : []),
  ];

  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const confirmLogout = async () => {
    setIsLogoutConfirmOpen(false);
    await logout({ reason: 'MANUAL' });
    navigate('/login', { replace: true });
  };

  const isItemActive = (key) => active === key || (key === 'events' && active.startsWith('events'));
  const isHelpActive = active === 'help';

  return (
    <div className={`portal-shell ${isCollapsed ? 'portal-shell-collapsed' : ''}`}>
      <aside className="portal-sidebar" aria-label="Navigation principale">
        <button
          className="portal-sidebar-toggle"
          type="button"
          onClick={() => setIsCollapsed((current) => !current)}
          aria-label={isCollapsed ? 'Afficher le menu' : 'Reduire le menu'}
          title={isCollapsed ? 'Afficher le menu' : 'Reduire le menu'}
        >
          {isCollapsed ? '›' : '‹'}
        </button>

        <div className="portal-sidebar-brand">
          <img className="portal-sidebar-logo" src={logo} alt="Wilaya Portal" />
          <span className="portal-sidebar-title">Wilaya Portal</span>
        </div>

        <nav className="portal-sidebar-menu">
          {mainItems.map((item) => (
            <Link
              key={item.key}
              className={`portal-sidebar-link ${isItemActive(item.key) ? 'portal-sidebar-link-active' : ''}`}
              to={item.to}
              title={item.label}
            >
              <span className="portal-sidebar-icon" aria-hidden="true">
                <img className="portal-sidebar-icon-img portal-sidebar-icon-img-white" src={item.iconWhite} alt="" />
                <img className="portal-sidebar-icon-img portal-sidebar-icon-img-green" src={item.iconGreen} alt="" />
              </span>
              <span className="portal-sidebar-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="portal-sidebar-footer">
          <Link
            className={`portal-sidebar-link portal-sidebar-footer-link ${isHelpActive ? 'portal-sidebar-link-active' : ''}`}
            to="/aide"
            title="Aide"
            aria-current={isHelpActive ? 'page' : undefined}
          >
            <span className="portal-sidebar-icon" aria-hidden="true">
              <img className="portal-sidebar-icon-img portal-sidebar-icon-img-white" src={helpIconWhite} alt="" />
              <img className="portal-sidebar-icon-img portal-sidebar-icon-img-green" src={helpIconGreen} alt="" />
            </span>
            <span className="portal-sidebar-label">Aide</span>
          </Link>
          <button className="portal-sidebar-link portal-sidebar-footer-link" type="button" onClick={handleLogout} title="Deconnexion">
            <span className="portal-sidebar-icon" aria-hidden="true">
              <img className="portal-sidebar-icon-img portal-sidebar-icon-img-white" src={logoutIconWhite} alt="" />
              <img className="portal-sidebar-icon-img portal-sidebar-icon-img-green" src={logoutIconGreen} alt="" />
            </span>
            <span className="portal-sidebar-label">Deconnexion</span>
          </button>
        </div>
      </aside>

      <section className="portal-content-header" aria-label="En-tete utilisateur">
        <div className="portal-greeting">
          <h1>{`Bonjour, ${profile.displayName}!`}</h1>
          <p>{formatDateTime(now)}</p>
        </div>

        <Link className="portal-profile-pill portal-profile-pill-link" to="/profil" aria-label="Ouvrir le profil utilisateur" title="Profil utilisateur">
          <span className="portal-profile-avatar">{profile.initials}</span>
          <span className="portal-profile-copy">
            <strong>{profile.displayName}</strong>
            <small>{profile.roleLabel}</small>
          </span>
        </Link>
      </section>

      {isLogoutConfirmOpen ? (
        <div className="portal-confirm-overlay" role="presentation">
          <div className="portal-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-confirm-title">
            <h2 id="logout-confirm-title">Confirmer la deconnexion</h2>
            <p>Voulez-vous vraiment vous deconnecter de Wilaya Portal ?</p>
            <div className="portal-confirm-actions">
              <button className="portal-confirm-cancel" type="button" onClick={() => setIsLogoutConfirmOpen(false)}>
                Annuler
              </button>
              <button className="portal-confirm-submit" type="button" onClick={confirmLogout}>
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PortalHeader;
