import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { apiUrl } from '../config/api';
import { useAuth } from '../context/AuthContext';
import EventLayout from './EventLayout';

const HOLIDAYS_API_URL = apiUrl('/api/holidays');
const EVENTS_API_URL = apiUrl('/api/events');

const CATEGORY_OPTIONS = [
  { value: 'NATIONAL', label: 'National', colorClass: 'calendar-pill-national' },
  { value: 'RELIGIEUX', label: 'Religieux', colorClass: 'calendar-pill-religious' },
];

const emptyForm = {
  name: '',
  date: '',
  category: 'NATIONAL',
  durationDays: 1,
  recurringAnnual: false,
  active: true,
};

const categoryLabels = CATEGORY_OPTIONS.reduce((labels, option) => ({
  ...labels,
  [option.value]: option.label,
}), {});

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const pad = (value) => String(value).padStart(2, '0');

const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseLocalDate = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const addDays = (date, count) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const startOfWeek = (date) => {
  const dayIndex = (date.getDay() + 6) % 7;
  return addDays(date, -dayIndex);
};

const endOfWeek = (date) => addDays(date, 6 - ((date.getDay() + 6) % 7));

const capitalizeFirst = (value) => {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatDate = (value) => {
  const parsed = parseLocalDate(value);
  if (!parsed) {
    return '--';
  }

  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatMonthLabel = (date) => capitalizeFirst(date.toLocaleDateString('fr-FR', {
  month: 'long',
  year: 'numeric',
}));

const formatWeekdayLabel = (date) => capitalizeFirst(date.toLocaleDateString('fr-FR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
}));

const pluralize = (count, singular, plural) => `${count} ${count > 1 ? plural : singular}`;

const createHolidayOccurrences = (holiday, monthDate) => {
  const baseDate = parseLocalDate(holiday.date);
  if (!baseDate) {
    return [];
  }

  const duration = Math.max(Number(holiday.durationDays) || 1, 1);
  const entries = [];

  if (holiday.recurringAnnual) {
    const recurringStart = new Date(monthDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    for (let index = 0; index < duration; index += 1) {
      const current = addDays(recurringStart, index);
      if (current.getMonth() === monthDate.getMonth() && current.getFullYear() === monthDate.getFullYear()) {
        entries.push({
          dateKey: toDateKey(current),
          date: current,
        });
      }
    }
    return entries;
  }

  for (let index = 0; index < duration; index += 1) {
    const current = addDays(baseDate, index);
    if (current.getMonth() === monthDate.getMonth() && current.getFullYear() === monthDate.getFullYear()) {
      entries.push({
        dateKey: toDateKey(current),
        date: current,
      });
    }
  }

  return entries;
};

const createEventOccurrences = (event, monthDate) => {
  const start = parseLocalDate(event.startDate);
  const end = parseLocalDate(event.endDate || event.startDate);

  if (!start || !end) {
    return [];
  }

  const entries = [];
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const finalDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (current <= finalDate) {
    if (current.getMonth() === monthDate.getMonth() && current.getFullYear() === monthDate.getFullYear()) {
      entries.push({
        dateKey: toDateKey(current),
        date: new Date(current),
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return entries;
};

const Holidays = () => {
  const { isAdmin } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [events, setEvents] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [isEventsPanelOpen, setIsEventsPanelOpen] = useState(false);
  const [activeHolidayCategory, setActiveHolidayCategory] = useState(null);

  const loadCalendarData = async () => {
    try {
      const [holidaysResult, eventsResult] = await Promise.allSettled([
        axios.get(HOLIDAYS_API_URL),
        axios.get(EVENTS_API_URL),
      ]);

      if (holidaysResult.status === 'fulfilled') {
        setHolidays(Array.isArray(holidaysResult.value.data) ? holidaysResult.value.data : []);
      } else {
        setHolidays([]);
      }

      if (eventsResult.status === 'fulfilled') {
        setEvents(Array.isArray(eventsResult.value.data) ? eventsResult.value.data : []);
      } else {
        setEvents([]);
      }

      if (holidaysResult.status === 'rejected') {
        setErrorMessage('Impossible de charger les jours feries.');
      } else if (eventsResult.status === 'rejected') {
        setErrorMessage('Impossible de charger les evenements.');
      } else {
        setErrorMessage('');
      }
    } catch (error) {
      setErrorMessage('Impossible de charger le calendrier.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, []);

  const groupedHolidays = useMemo(() => (
    CATEGORY_OPTIONS.map((category) => ({
      ...category,
      items: holidays.filter((holiday) => holiday.category === category.value),
    }))
  ), [holidays]);

  const monthEntries = useMemo(() => {
    const holidayEntries = holidays.flatMap((holiday) => (
      createHolidayOccurrences(holiday, displayMonth).map((entry) => ({
        id: `holiday-${holiday.id}-${entry.dateKey}`,
        kind: 'holiday',
        dateKey: entry.dateKey,
        date: entry.date,
        title: holiday.name,
        subtitle: categoryLabels[holiday.category] || holiday.category || 'Jour ferie',
        colorClass: holiday.category === 'RELIGIEUX' ? 'calendar-chip-religious' : 'calendar-chip-national',
        href: null,
      }))
    ));

    const eventEntries = events.flatMap((event) => (
      createEventOccurrences(event, displayMonth).map((entry) => ({
        id: `event-${event.id}-${entry.dateKey}`,
        kind: 'event',
        dateKey: entry.dateKey,
        date: entry.date,
        title: event.title,
        subtitle: event.type || 'Evenement',
        colorClass: 'calendar-chip-event',
        href: `/event/${event.id}`,
      }))
    ));

    return [...holidayEntries, ...eventEntries].sort((left, right) => (
      left.date.getTime() - right.date.getTime()
    ));
  }, [displayMonth, events, holidays]);

  const monthEntryMap = useMemo(() => {
    return monthEntries.reduce((map, entry) => {
      if (!map[entry.dateKey]) {
        map[entry.dateKey] = [];
      }
      map[entry.dateKey].push(entry);
      return map;
    }, {});
  }, [monthEntries]);

  const calendarCells = useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    const gridStart = startOfWeek(monthStart);
    const monthEnd = endOfMonth(displayMonth);
    const gridEnd = endOfWeek(monthEnd);
    const cells = [];

    for (let current = new Date(gridStart); current <= gridEnd; current.setDate(current.getDate() + 1)) {
      const date = new Date(current);
      const dateKey = toDateKey(date);
      cells.push({
        date,
        dateKey,
        inMonth: date.getMonth() === displayMonth.getMonth(),
        isToday: dateKey === toDateKey(new Date()),
        entries: monthEntryMap[dateKey] || [],
      });
    }

    return cells;
  }, [displayMonth, monthEntryMap]);

  useEffect(() => {
    const displayMonthKey = `${displayMonth.getFullYear()}-${pad(displayMonth.getMonth() + 1)}`;
    if (!selectedDateKey.startsWith(displayMonthKey)) {
      setSelectedDateKey(toDateKey(startOfMonth(displayMonth)));
    }
  }, [displayMonth, selectedDateKey]);

  const selectedDate = parseLocalDate(selectedDateKey);
  const selectedDayEntries = selectedDateKey ? (monthEntryMap[selectedDateKey] || []) : [];
  const selectedDayLabel = selectedDate ? formatWeekdayLabel(selectedDate) : 'Selection du jour';

  const monthHolidayEntries = monthEntries.filter((entry) => entry.kind === 'holiday');
  const monthEventEntries = monthEntries.filter((entry) => entry.kind === 'event');
  const activeHolidayGroup = activeHolidayCategory
    ? groupedHolidays.find((group) => group.value === activeHolidayCategory)
    : null;
  const firstEventPreview = monthEventEntries[0] || null;

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setIsFormOpen(false);
    setErrorMessage('');
  };

  const openCreateForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setIsFormOpen(true);
    setSuccessMessage('');
    setErrorMessage('');
  };

  const openEditForm = (holiday) => {
    setFormData({
      name: holiday.name,
      date: holiday.date,
      category: holiday.category,
      durationDays: holiday.durationDays || 1,
      recurringAnnual: holiday.recurringAnnual,
      active: holiday.active,
    });
    setEditingId(holiday.id);
    setIsFormOpen(true);
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        date: formData.date,
        category: formData.category,
        durationDays: Number(formData.durationDays) || 1,
        recurringAnnual: formData.recurringAnnual,
        active: formData.active,
      };

      if (editingId) {
        await axios.put(`${HOLIDAYS_API_URL}/${editingId}`, payload);
        setSuccessMessage('Jour ferie modifie.');
      } else {
        await axios.post(HOLIDAYS_API_URL, payload);
        setSuccessMessage('Jour ferie ajoute.');
      }

      resetForm();
      await loadCalendarData();
    } catch (error) {
      setErrorMessage(error.response?.data || 'Impossible d enregistrer ce jour ferie.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (holiday) => {
    const confirmed = window.confirm(`Supprimer ${holiday.name} ?`);
    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(`${HOLIDAYS_API_URL}/${holiday.id}`);
      setSuccessMessage('Jour ferie supprime.');
      if (editingId === holiday.id) {
        resetForm();
      }
      await loadCalendarData();
    } catch (error) {
      setErrorMessage(error.response?.data || 'Impossible de supprimer ce jour ferie.');
    }
  };

  const goToPreviousMonth = () => {
    setDisplayMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setDisplayMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  };

  return (
    <EventLayout active="holidays" shellClassName="events-shell-wide">
      <section className="events-toolbar">
        <div>
          <h1 className="events-page-title">Jours feries</h1>
          <p className="events-page-subtitle">Calendrier Maroc: jours feries et evenements reunis dans une meme vue.</p>
        </div>
        {isAdmin ? (
          <button className="events-primary-button" type="button" onClick={openCreateForm}>
            Ajouter un jour ferie
          </button>
        ) : null}
      </section>

      {errorMessage ? <p className="events-feedback events-feedback-error">{errorMessage}</p> : null}
      {successMessage ? <p className="events-feedback events-feedback-success">{successMessage}</p> : null}

      {isFormOpen && isAdmin ? (
        <form className="event-form-card holidays-form-card" onSubmit={handleSubmit}>
          <div className="event-form-grid holidays-form-grid">
            <label className="event-form-field">
              <span>Nom</span>
              <input name="name" value={formData.name} onChange={handleChange} required />
            </label>

            <label className="event-form-field">
              <span>Date</span>
              <input name="date" type="date" value={formData.date} onChange={handleChange} required />
            </label>

            <label className="event-form-field">
              <span>Categorie</span>
              <select name="category" value={formData.category} onChange={handleChange}>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="event-form-field">
              <span>Duree</span>
              <input
                name="durationDays"
                type="number"
                min="1"
                value={formData.durationDays}
                onChange={handleChange}
                required
              />
            </label>

            <div className="holidays-checks">
              <label className="holidays-checkbox">
                <input
                  name="recurringAnnual"
                  type="checkbox"
                  checked={formData.recurringAnnual}
                  onChange={handleChange}
                />
                <span>Repeter chaque annee</span>
              </label>

              <label className="holidays-checkbox">
                <input name="active" type="checkbox" checked={formData.active} onChange={handleChange} />
                <span>Actif</span>
              </label>
            </div>
          </div>

          <div className="event-form-actions">
            <button className="events-secondary-button" type="button" onClick={resetForm}>
              Annuler
            </button>
            <button className="events-primary-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      ) : null}

      <section className="holidays-calendar-section" aria-label="Calendrier des jours feries et evenements">
        <div className="holidays-calendar-board">
          <div className="holidays-calendar-header">
            <div>
              <h2>{formatMonthLabel(displayMonth)}</h2>
              <p>{pluralize(monthHolidayEntries.length, 'jour ferie', 'jours feries')} et {pluralize(monthEventEntries.length, 'evenement', 'evenements')} ce mois-ci</p>
            </div>

            <div className="holidays-calendar-nav">
              <button className="holidays-calendar-nav-button" type="button" onClick={goToPreviousMonth} aria-label="Mois precedent">
                ‹
              </button>
              <button className="holidays-calendar-nav-button" type="button" onClick={() => setDisplayMonth(startOfMonth(new Date()))}>
                Aujourd'hui
              </button>
              <button className="holidays-calendar-nav-button" type="button" onClick={goToNextMonth} aria-label="Mois suivant">
                ›
              </button>
            </div>
          </div>

          <div className="holidays-calendar-legend" aria-label="Legende du calendrier">
            {CATEGORY_OPTIONS.map((option) => (
              <span key={option.value} className={`calendar-legend-item ${option.colorClass}`}>
                {option.label}
              </span>
            ))}
            <span className="calendar-legend-item calendar-pill-event">Evenements</span>
          </div>

          <div className="holidays-calendar-weekdays" role="presentation">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="holidays-calendar-days" role="grid" aria-label={`Calendrier ${formatMonthLabel(displayMonth)}`}>
            {calendarCells.map((cell) => (
              <button
                key={cell.dateKey}
                className={[
                  'holidays-calendar-day',
                  !cell.inMonth ? 'holidays-calendar-day-outside' : '',
                  cell.isToday ? 'holidays-calendar-day-today' : '',
                  selectedDateKey === cell.dateKey ? 'holidays-calendar-day-selected' : '',
                ].filter(Boolean).join(' ')}
                type="button"
                onClick={() => setSelectedDateKey(cell.dateKey)}
                aria-label={formatWeekdayLabel(cell.date)}
              >
                <span className="holidays-calendar-day-number">{cell.date.getDate()}</span>
                {cell.entries.length > 0 ? (
                  <span className="holidays-calendar-day-badges">
                    {cell.entries.slice(0, 3).map((entry) => (
                      <span key={entry.id} className={`holidays-calendar-day-dot ${entry.colorClass}`} title={entry.title} />
                    ))}
                    {cell.entries.length > 3 ? <span className="holidays-calendar-day-count">+{cell.entries.length - 3}</span> : null}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <aside className="holidays-calendar-sidebar">
          <article className="events-dashboard-card holidays-calendar-panel">
            <div className="events-chart-header">
              <h2>{selectedDayLabel}</h2>
              <span>{selectedDate ? formatDate(selectedDate) : '--'}</span>
            </div>

            {selectedDayEntries.length > 0 ? (
              <div className="holidays-calendar-panel-list">
                {selectedDayEntries.map((entry) => (
                  <div className="holidays-calendar-panel-item" key={entry.id}>
                    <span className={`holidays-calendar-panel-kind ${entry.colorClass}`}>{entry.kind === 'holiday' ? 'Ferie' : 'Evenement'}</span>
                    {entry.href ? (
                      <Link to={entry.href} className="holidays-calendar-panel-link">{entry.title}</Link>
                    ) : (
                      <strong>{entry.title}</strong>
                    )}
                    <small>{entry.subtitle}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="events-empty-state">Aucun element pour cette date.</p>
            )}
          </article>

          <article className="events-dashboard-card holidays-calendar-panel">
            <div className="events-chart-header">
              <h2>Jours feries</h2>
              <span>{monthHolidayEntries.length}</span>
            </div>

            {monthHolidayEntries.length > 0 ? (
              <div className="holidays-calendar-panel-list">
                {monthHolidayEntries.slice(0, 8).map((entry) => (
                  <div className="holidays-calendar-panel-item" key={entry.id}>
                    <span className={`holidays-calendar-panel-kind ${entry.colorClass}`}>Ferie</span>
                    <strong>{entry.title}</strong>
                    <small>{formatDate(entry.date)}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="events-empty-state">Aucun jour ferie pour ce mois.</p>
            )}
          </article>

          <article className="events-dashboard-card holidays-calendar-panel">
            <div className="events-chart-header">
              <h2>Evenements</h2>
              <div className="holidays-calendar-panel-actions">
                <span>{monthEventEntries.length}</span>
                <button
                  className="holidays-calendar-panel-toggle"
                  type="button"
                  onClick={() => setIsEventsPanelOpen((current) => !current)}
                  aria-expanded={isEventsPanelOpen}
                  aria-controls="holidays-month-events"
                  title={isEventsPanelOpen ? 'Replier les evenements' : 'Deplier les evenements'}
                >
                  {isEventsPanelOpen ? '−' : '+'}
                </button>
              </div>
            </div>

            {monthEventEntries.length > 0 ? (
              <div className="holidays-calendar-panel-list" id="holidays-month-events">
                <div className="holidays-calendar-panel-item holidays-calendar-panel-item-featured">
                  <span className={`holidays-calendar-panel-kind ${firstEventPreview.colorClass}`}>Evenement</span>
                  <Link to={firstEventPreview.href} className="holidays-calendar-panel-link">{firstEventPreview.title}</Link>
                  <small>{formatDate(firstEventPreview.date)}</small>
                </div>

                {isEventsPanelOpen ? (
                  monthEventEntries.slice(1, 8).map((entry) => (
                    <div className="holidays-calendar-panel-item" key={entry.id}>
                      <span className={`holidays-calendar-panel-kind ${entry.colorClass}`}>Evenement</span>
                      <Link to={entry.href} className="holidays-calendar-panel-link">{entry.title}</Link>
                      <small>{formatDate(entry.date)}</small>
                    </div>
                  ))
                ) : null}
              </div>
            ) : (
              <p className="events-empty-state" id="holidays-month-events">Aucun evenement pour ce mois.</p>
            )}
          </article>
        </aside>
      </section>

      {isLoading ? (
        <p className="events-empty-state">Chargement...</p>
      ) : (
        <section className="holidays-category-actions">
          {CATEGORY_OPTIONS.map((group) => (
            <button
              key={group.value}
              className={`holidays-category-button ${group.colorClass}`}
              type="button"
              onClick={() => setActiveHolidayCategory(group.value)}
            >
              <span>{`Jour ferie ${group.label.toLowerCase()}`}</span>
              <small>{pluralize(groupedHolidays.find((item) => item.value === group.value)?.items.length || 0, 'jour', 'jours')}</small>
            </button>
          ))}
        </section>
      )}

      {activeHolidayGroup ? (
        <div
          className="events-modal-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setActiveHolidayCategory(null);
            }
          }}
        >
          <div
            className={`events-modal holidays-category-modal ${activeHolidayGroup.value === 'NATIONAL' ? 'holidays-category-modal-national' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="holidays-category-title"
          >
            <div className="events-chart-header">
              <h2 id="holidays-category-title">{`Jours feries ${activeHolidayGroup.label.toLowerCase()}`}</h2>
              <button className="holidays-calendar-panel-toggle" type="button" onClick={() => setActiveHolidayCategory(null)} aria-label="Fermer">
                ×
              </button>
            </div>

            {activeHolidayGroup.items.length ? (
              <div className="holidays-calendar-panel-list">
                {activeHolidayGroup.items.map((holiday) => (
                  <div className={`holidays-calendar-panel-item ${holiday.active ? '' : 'holidays-item-disabled'}`} key={holiday.id}>
                    <span className={`holidays-calendar-panel-kind ${groupedHolidays.find((item) => item.value === holiday.category)?.colorClass || ''}`}>
                      {categoryLabels[holiday.category] || holiday.category}
                    </span>
                    <strong>{holiday.name}</strong>
                    <small>{`${formatDate(holiday.date)} - ${pluralize(holiday.durationDays || 1, 'jour', 'jours')} - ${holiday.recurringAnnual ? 'Chaque annee' : 'Date fixe'}`}</small>

                    {isAdmin ? (
                      <div className="holidays-actions">
                        <button className="events-inline-button" type="button" onClick={() => openEditForm(holiday)}>
                          Modifier
                        </button>
                        <button
                          className="events-inline-button events-inline-button-danger"
                          type="button"
                          onClick={() => handleDelete(holiday)}
                        >
                          Supprimer
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="events-empty-state">Aucun jour ferie dans cette categorie.</p>
            )}
          </div>
        </div>
      ) : null}
    </EventLayout>
  );
};

export default Holidays;
