import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Events.css';
import EventLayout from './EventLayout';
import { useAuth } from '../context/AuthContext';
import { API_URL, getDescriptionPreview, getEventDateBadge, isArchivedEvent, isOngoingEvent } from '../utils/eventUtils';

const EVENTS_PER_PAGE = 12;

const sortEvents = (items) => {
  const toTimestamp = (value) => {
    const parsed = new Date(value || 0);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

  return [...items].sort((left, right) => (
    toTimestamp(right.startDate || right.endDate) - toTimestamp(left.startDate || left.endDate)
  ));
};

const normalizeText = (value) => (value || '').trim().toLowerCase();

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
    <path d="M16.2 16.2L21 21" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
  </svg>
);

const Events = () => {
  const [events, setEvents] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const { isAdmin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(API_URL);
        setEvents(sortEvents(Array.isArray(response.data) ? response.data : []));
        setErrorMessage('');
      } catch (error) {
        setErrorMessage('Impossible de charger les evenements.');
      }
    };

    fetchEvents();
  }, []);

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const rawView = query.get('view') || 'all';
  const rawType = query.get('type') || 'all';

  const normalizedView = rawView === 'active' ? 'upcoming' : rawView;
  const normalizedTypeFilter = normalizeText(rawType);

  const visibleTypes = useMemo(() => {
    const seen = new Map();

    events.forEach((event) => {
      const label = (event.type || 'Autre').trim() || 'Autre';
      const key = normalizeText(label);
      if (!seen.has(key)) {
        seen.set(key, label);
      }
    });

    return Array.from(seen.values()).sort((left, right) => left.localeCompare(right, 'fr'));
  }, [events]);

  const createQueryString = (overrides = {}) => {
    const params = new URLSearchParams(location.search);

    Object.entries(overrides).forEach(([key, value]) => {
      if (!value || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const search = params.toString();
    return search ? `${location.pathname}?${search}` : location.pathname;
  };

  const filteredEvents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return events.filter((event) => {
      const archived = isArchivedEvent(event.endDate, event.startDate);
      const ongoing = isOngoingEvent(event.startDate, event.endDate);

      if (normalizedView === 'upcoming' && (archived || ongoing)) {
        return false;
      }

      if (normalizedView === 'ongoing' && !ongoing) {
        return false;
      }

      if (normalizedView === 'archive' && !archived) {
        return false;
      }

      if (normalizedTypeFilter !== 'all' && normalizeText(event.type) !== normalizedTypeFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        event.title,
        event.description,
        event.type,
        event.location,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [events, normalizedTypeFilter, normalizedView, searchTerm]);

  const pagedEvents = useMemo(() => {
    const pages = [];

    for (let index = 0; index < filteredEvents.length; index += EVENTS_PER_PAGE) {
      pages.push(filteredEvents.slice(index, index + EVENTS_PER_PAGE));
    }

    return pages;
  }, [filteredEvents]);

  useEffect(() => {
    setCurrentPage(0);
  }, [normalizedView, normalizedTypeFilter, searchTerm]);

  useEffect(() => {
    if (pagedEvents.length === 0) {
      setCurrentPage(0);
      return;
    }

    setCurrentPage((page) => Math.min(page, pagedEvents.length - 1));
  }, [pagedEvents.length]);

  useEffect(() => {
    if (isSearchOpen) {
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [isSearchOpen]);

  const statusOptions = [
    { label: 'Tous', value: 'all' },
    { label: 'A venir', value: 'upcoming' },
    { label: 'En cours', value: 'ongoing' },
    { label: 'Archives', value: 'archive' },
  ];

  const typeOptions = [
    { label: 'Tous', value: 'all' },
    ...visibleTypes.map((type) => ({ label: type, value: type })),
  ];

  const pageContent = {
    all: {
      title: 'Evenements',
      subtitle: 'Consultez les evenements et participez.',
      empty: 'Aucun événement disponible pour le moment.',
    },
    upcoming: {
      title: 'Evenements',
      subtitle: 'Les prochains evenements a venir.',
      empty: 'Aucun événement à venir pour le moment.',
    },
    ongoing: {
      title: 'Evenements',
      subtitle: 'Les evenements en cours actuellement.',
      empty: 'Aucun événement en cours pour le moment.',
    },
    archive: {
      title: 'Evenements',
      subtitle: 'Les evenements archives.',
      empty: 'Aucun événement archivé disponible.',
    },
  }[normalizedView] || {
    title: 'Evenements',
    subtitle: 'Consultez les evenements et participez.',
    empty: 'Aucun événement disponible pour le moment.',
  };

  const currentEvents = pagedEvents[currentPage] || [];

  const handlePageChange = (pageIndex) => {
    setCurrentPage(pageIndex);
  };

  const handleNextPage = () => {
    setCurrentPage((page) => Math.min(page + 1, pagedEvents.length - 1));
  };

  const activeSearch = isSearchOpen || searchTerm.trim().length > 0;

  return (
    <EventLayout active="events">
      <section className="events-toolbar">
        <div className="events-toolbar-copy">
          <h1 className="events-page-title">{pageContent.title}</h1>
          <p className="events-page-subtitle">{pageContent.subtitle}</p>
        </div>

        <div className="events-toolbar-actions">
          <button
            className={`events-icon-button events-search-toggle ${activeSearch ? 'events-search-toggle-active' : ''}`}
            type="button"
            onClick={() => setIsSearchOpen((current) => !current)}
            aria-label="Rechercher"
            title="Rechercher"
          >
            <SearchIcon />
          </button>

          {isAdmin ? (
            <Link className="events-primary-button events-create-button" to="/event/add">
              <PlusIcon />
              <span>Nouvel événement</span>
            </Link>
          ) : null}
        </div>
      </section>

      {activeSearch ? (
        <section className="events-search-panel" aria-label="Recherche des événements">
          <label className="events-search-field events-search-field-inline">
            <span>Recherche</span>
            <input
              ref={searchInputRef}
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher un événement"
            />
          </label>

          <button
            className="events-secondary-button events-search-reset"
            type="button"
            onClick={() => {
              setSearchTerm('');
              setIsSearchOpen(false);
            }}
          >
            Réinitialiser
          </button>
        </section>
      ) : null}

      <section className="events-filter-panel" aria-label="Filtres des événements">
        <div className="events-filter-row">
          {statusOptions.map((option) => (
            <Link
              key={option.value}
              className={`events-filter-chip ${normalizedView === option.value ? 'events-filter-chip-active' : ''}`}
              to={createQueryString({ view: option.value })}
            >
              {option.label}
            </Link>
          ))}
        </div>

        <div className="events-filter-row">
          {typeOptions.map((option) => (
            <Link
              key={option.value}
              className={`events-filter-chip ${normalizedTypeFilter === normalizeText(option.value) ? 'events-filter-chip-active' : ''}`}
              to={createQueryString({ type: option.value })}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </section>

      {errorMessage ? <p className="events-feedback events-feedback-error">{errorMessage}</p> : null}

      <section className="events-group">
        {filteredEvents.length > 0 ? (
          <>
            <div className="events-scroll-shell">
              <div className="event-slider-page-grid event-slider-page-grid-centered">
                {currentEvents.map((event) => {
                  const archived = isArchivedEvent(event.endDate, event.startDate);

                  return (
                    <Link className={`event-grid-card ${archived ? 'event-grid-card-archived' : ''}`} key={event.id} to={`/event/${event.id}`}>
                      {event.photoUrl ? (
                        <div className="event-grid-image-wrap">
                          <img
                            className="event-grid-image"
                            src={event.photoUrl}
                            alt={event.title}
                            loading="lazy"
                          />
                          <span className="event-grid-badge">{archived ? 'Archive' : getEventDateBadge(event.startDate, event.endDate)}</span>
                        </div>
                      ) : (
                        <div className="event-grid-image-wrap event-grid-image-wrap-empty">
                          <span className="event-grid-badge">{archived ? 'Archive' : getEventDateBadge(event.startDate, event.endDate)}</span>
                        </div>
                      )}

                      <div className="event-grid-body">
                        <h2>{event.title}</h2>
                        <p>{getDescriptionPreview(event.description, 60)}</p>
                        <div className="event-grid-footer">
                          <span>{event.type || 'Evenement'}</span>
                          <span>{event.participantCount || 0}/{event.participantLimit || 50}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {pagedEvents.length > 1 ? (
              <div className="event-slider-pagination" aria-label="Pagination des evenements">
                {pagedEvents.map((_, pageIndex) => (
                  <button
                    key={`events-page-${pageIndex}`}
                    className={`event-slider-page-button ${currentPage === pageIndex ? 'event-slider-page-button-active' : ''}`}
                    type="button"
                    onClick={() => handlePageChange(pageIndex)}
                  >
                    {pageIndex + 1}
                  </button>
                ))}
                <button
                  className="event-slider-page-button event-slider-page-button-next"
                  type="button"
                  onClick={handleNextPage}
                  disabled={currentPage >= pagedEvents.length - 1}
                >
                  &gt;&gt;
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="events-empty-state">{pageContent.empty}</p>
        )}
      </section>
    </EventLayout>
  );
};

export default Events;
