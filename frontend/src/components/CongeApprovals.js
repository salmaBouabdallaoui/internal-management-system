import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EventLayout from './EventLayout';
import logo from '../images/OIP11.svg';
import {
  LEAVES_API_URL,
  escapeHtml,
  formatArabicDate,
  formatArabicWorkDays,
  formatDateTime,
  formatJobTitleArabic,
  formatLeavePeriod,
  formatLeaveTypeArabic,
  getEmployeeLeaveValidationLabel,
  pluralize,
  statusLabels,
} from './leaveUtils';

const CongeApprovals = () => {
  const { isAdmin, user } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [hrApprovals, setHrApprovals] = useState([]);
  const [reviewedRequests, setReviewedRequests] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [canReviewHr, setCanReviewHr] = useState(false);
  const [isApprovalsLoading, setIsApprovalsLoading] = useState(false);
  const [isHrApprovalsLoading, setIsHrApprovalsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewReason, setReviewReason] = useState('');

  const historyStorageKey = user?.username ? `leave-approvals-history:${user.username}` : null;
  const hasApprovalAccess = canReview || canReviewHr || isAdmin;

  const saveReviewedRequests = useCallback((nextReviewedRequests) => {
    setReviewedRequests(nextReviewedRequests);
    if (historyStorageKey) {
      localStorage.setItem(historyStorageKey, JSON.stringify(nextReviewedRequests));
    }
  }, [historyStorageKey]);

  const upsertReviewedRequest = useCallback((request) => {
    if (!request) {
      return;
    }

    setReviewedRequests((current) => {
      const next = [request, ...current.filter((item) => item.id !== request.id)];
      if (historyStorageKey) {
        localStorage.setItem(historyStorageKey, JSON.stringify(next));
      }
      return next;
    });
  }, [historyStorageKey]);

  const mergeRequests = useCallback((liveRequests) => {
    const merged = new Map();
    reviewedRequests.forEach((request) => {
      merged.set(request.id, request);
    });
    liveRequests.forEach((request) => {
      merged.set(request.id, request);
    });

    return Array.from(merged.values()).sort((left, right) => {
      const leftTime = new Date(left.reviewedAt || left.createdAt || 0).getTime();
      const rightTime = new Date(right.reviewedAt || right.createdAt || 0).getTime();
      return rightTime - leftTime;
    });
  }, [reviewedRequests]);

  const divisionRows = useMemo(() => mergeRequests(approvals), [approvals, mergeRequests]);
  const hrRows = useMemo(() => mergeRequests(hrApprovals), [hrApprovals, mergeRequests]);

  const loadApprovals = useCallback(async () => {
    if (!canReview) {
      setApprovals([]);
      return;
    }

    setIsApprovalsLoading(true);
    try {
      const response = await axios.get(`${LEAVES_API_URL}/approvals`);
      setApprovals(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setErrorMessage(error.response?.data || 'Impossible de charger les demandes a valider.');
    } finally {
      setIsApprovalsLoading(false);
    }
  }, [canReview]);

  const loadHrApprovals = useCallback(async () => {
    if (!(canReviewHr || isAdmin)) {
      setHrApprovals([]);
      return;
    }

    setIsHrApprovalsLoading(true);
    try {
      const response = await axios.get(`${LEAVES_API_URL}/hr-approvals`);
      setHrApprovals(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setErrorMessage(error.response?.data || 'Impossible de charger les demandes RH a valider.');
    } finally {
      setIsHrApprovalsLoading(false);
    }
  }, [canReviewHr, isAdmin]);

  useEffect(() => {
    const loadAccess = async () => {
      try {
        const response = await axios.get(`${LEAVES_API_URL}/me`);
        setCanReview(Boolean(response.data.canReview));
        setCanReviewHr(Boolean(response.data.canReviewHr));
        setErrorMessage('');
      } catch (error) {
        setErrorMessage(error.response?.data || 'Impossible de charger la page conges.');
      }
    };

    void loadAccess();
  }, []);

  useEffect(() => {
    if (!historyStorageKey) {
      saveReviewedRequests([]);
      return;
    }

    try {
      const stored = localStorage.getItem(historyStorageKey);
      if (!stored) {
        saveReviewedRequests([]);
        return;
      }

      const parsed = JSON.parse(stored);
      saveReviewedRequests(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      saveReviewedRequests([]);
    }
  }, [historyStorageKey, saveReviewedRequests, user?.username]);

  useEffect(() => {
    void loadApprovals();
  }, [loadApprovals]);

  useEffect(() => {
    void loadHrApprovals();
  }, [loadHrApprovals]);

  const printLeaveRequest = (request) => {
    const documentTitle = `طلب إجازة ${request.id}`;
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      setErrorMessage("Impossible d'ouvrir la fenêtre d'impression. Autorisez les pop-ups pour imprimer la demande.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(documentTitle)}</title>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&display=swap" rel="stylesheet" />
          <style>
            @page { size: A4; margin: 18mm; }
            * { box-sizing: border-box; }
            body {
              color: #111;
              direction: rtl;
              font-family: "Noto Naskh Arabic", Tahoma, Arial, sans-serif;
              margin: 0;
              text-align: right;
            }
            .doc {
              min-height: 100%;
              padding: 18px 0 0;
            }
            .head {
              align-items: center;
              border-bottom: 1px solid #d7ded9;
              display: flex;
              flex-direction: row-reverse;
              gap: 18px;
              padding-bottom: 16px;
            }
            .head img {
              height: 68px;
              object-fit: contain;
              width: 68px;
            }
            .brand {
              font-size: 15px;
              font-weight: 700;
              line-height: 1.6;
            }
            h1 {
              color: #0f7540;
              font-size: 28px;
              margin: 32px 0 8px;
              text-align: center;
            }
            .grid {
              display: grid;
              gap: 12px;
              grid-template-columns: 1fr 1fr;
              margin-bottom: 6px;
            }
            .field {
              border-bottom: 1px solid #dfe7e2;
              min-height: 50px;
              padding: 8px 0 10px;
            }
            .field.full {
              grid-column: 1 / -1;
            }
            .label {
              color: #607064;
              display: block;
              font-size: 12px;
              font-weight: 700;
              margin-bottom: 5px;
            }
            .value {
              color: #15251b;
              font-size: 16px;
              font-weight: 700;
            }
            .section-title {
              border-bottom: 1px solid #d7ded9;
              color: #173322;
              font-size: 17px;
              font-weight: 700;
              margin: 24px 0 10px;
              padding-bottom: 8px;
            }
            .signatures {
              display: grid;
              gap: 18px;
              grid-template-columns: 1fr 1fr;
              margin-top: 40px;
            }
            .signature {
              border-top: 1px solid #d7ded9;
              min-height: 92px;
              padding: 12px 0 0;
            }
            .signature strong {
              display: block;
              font-size: 14px;
              margin-bottom: 32px;
            }
            .footer {
              border-top: 1px solid #d7ded9;
              color: #637167;
              font-size: 12px;
              margin-top: 34px;
              padding-top: 12px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <main class="doc">
            <header class="head">
              <img src="${logo}" alt="الشعار" />
              <div class="brand">
                المملكة المغربية<br />
                وزارة الداخلية<br />
                ولاية جهة الشرق
              </div>
            </header>

            <h1>طلب إجازة</h1>

            <p class="section-title">معلومات الموظف</p>
            <section class="grid">
              <div class="field">
                <span class="label">الاسم الكامل</span>
                <span class="value">${escapeHtml(request.requesterFullName)}</span>
              </div>
              <div class="field">
                <span class="label">الدرجة</span>
                <span class="value">${escapeHtml(formatJobTitleArabic(request.requesterRole))}</span>
              </div>
              <div class="field full">
                <span class="label">القسم</span>
                <span class="value">${escapeHtml(request.requesterDepartment)}</span>
              </div>
            </section>

            <p class="section-title">معلومات الإجازة</p>
            <section class="grid">
              <div class="field">
                <span class="label">نوع الإجازة</span>
                <span class="value">${escapeHtml(formatLeaveTypeArabic(request.leaveType))}</span>
              </div>
              <div class="field">
                <span class="label">المدة</span>
                <span class="value">${escapeHtml(formatArabicWorkDays(request.durationDays))}</span>
              </div>
              <div class="field">
                <span class="label">تاريخ البداية</span>
                <span class="value">${escapeHtml(formatArabicDate(request.startDate))}</span>
              </div>
              <div class="field">
                <span class="label">تاريخ النهاية</span>
                <span class="value">${escapeHtml(formatArabicDate(request.endDate))}</span>
              </div>
              <div class="field full">
                <span class="label">المصادقة الإدارية</span>
                <span class="value">${escapeHtml(request.reviewerName || 'غير محدد')}</span>
              </div>
            </section>

            <section class="signatures">
              <div class="signature">
                <strong>ختم / رأي الكاتب العام</strong>
                <span>التاريخ والختم</span>
              </div>
              <div class="signature">
                <strong>قرار إدارة الموارد البشرية</strong>
                <span>التوقيع</span>
              </div>
            </section>
          </main>
          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleReviewDecision = async (request, action, reasonValue, stage = 'division') => {
    const reason = reasonValue.trim();
    if (action === 'refuse' && !reason) {
      setErrorMessage('Le motif du refus est obligatoire.');
      return;
    }

    try {
      const url = stage === 'hr' ? `${LEAVES_API_URL}/hr-approvals/review` : `${LEAVES_API_URL}/approvals/review`;
      const response = await axios.post(url, {
        requestId: request.id,
        decision: action === 'approve' ? 'APPROVED' : 'REFUSED',
        reason: action === 'refuse' ? reason : '',
      });

      upsertReviewedRequest(response.data);
      if (stage === 'hr') {
        setSuccessMessage(action === 'approve' ? 'Demande approuvée par RH.' : 'Demande refusée par RH.');
      } else {
        setSuccessMessage(action === 'approve' ? "Demande transmise à l'admin RH." : 'Demande refusée.');
      }
      setErrorMessage('');
      setReviewModal(null);
      setReviewReason('');
      await loadApprovals();
      await loadHrApprovals();
    } catch (error) {
      setErrorMessage(error.response?.data || 'Impossible de traiter cette demande.');
    }
  };

  const openReviewModal = (request, action, stage = 'division') => {
    if (action === 'approve') {
      void handleReviewDecision(request, action, '', stage);
      return;
    }

    setReviewModal({ request, action, stage });
    setReviewReason('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleReview = async (event) => {
    event.preventDefault();
    if (!reviewModal) {
      return;
    }

    await handleReviewDecision(reviewModal.request, reviewModal.action, reviewReason, reviewModal.stage);
  };

  return (
    <EventLayout active="leaves" shellClassName="events-shell-wide">
      <section className="events-toolbar">
        <div className="events-toolbar-copy">
          <h1 className="events-page-title">Congés</h1>
          <p className="events-page-subtitle">Demandes à valider par la hiérarchie et par le service RH.</p>
        </div>

        <div className="leave-page-switcher">
          <NavLink
            className={({ isActive }) => `leave-page-switch-link ${isActive ? 'leave-page-switch-link-active' : ''}`}
            to="/conge"
            end
          >
            Mes demandes
          </NavLink>
          <NavLink
            className={({ isActive }) => `leave-page-switch-link ${isActive ? 'leave-page-switch-link-active' : ''}`}
            to="/conge/validations"
          >
            Demandes a valider
          </NavLink>
        </div>
      </section>

      {errorMessage ? <p className="events-feedback events-feedback-error">{errorMessage}</p> : null}
      {successMessage ? <p className="events-feedback events-feedback-success">{successMessage}</p> : null}

      <section className="leave-page-stack">
        {canReview ? (
          <article className="events-dashboard-card leave-approvals-card leave-approvals-card-full">
            <div className="events-chart-header">
              <h2>Demandes a valider</h2>
              <span>{divisionRows.length}</span>
            </div>

            {isApprovalsLoading ? (
              <p className="events-empty-state">Chargement...</p>
            ) : divisionRows.length > 0 ? (
              <div className="leave-table-wrap">
                <table className="leave-request-table">
                  <thead>
                    <tr>
                      <th>Demande</th>
                      <th>Période</th>
                      <th>Durée</th>
                      <th>Statut</th>
                      <th>Validation</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divisionRows.map((request) => {
                      const isPending = request.status === 'PENDING';
                      const statusClass = request.status === 'REFUSED'
                        ? 'leave-status-refused'
                        : request.status === 'APPROVED'
                          ? 'leave-status-approved'
                          : 'leave-status-pending';

                      return (
                        <tr key={request.id}>
                          <td>
                            <div className="leave-table-primary">
                              <strong>{request.requesterFullName}</strong>
                              <span>{request.requesterRole}</span>
                            </div>
                          </td>
                          <td>{formatLeavePeriod(request)}</td>
                          <td>{pluralize(request.durationDays, 'jour', 'jours')}</td>
                          <td>
                            <span className={`leave-status-badge ${statusClass}`}>
                              {statusLabels[request.status] || request.status}
                            </span>
                          </td>
                          <td>
                            <div className="leave-validation-cell">
                              <strong>{getEmployeeLeaveValidationLabel(request)}</strong>
                              {request.reviewedAt ? <span>{`Le ${formatDateTime(request.reviewedAt)}`}</span> : null}
                              {request.reviewReason ? <small className="leave-review-reason">{`Motif: ${request.reviewReason}`}</small> : null}
                            </div>
                          </td>
                          <td>
                            <div className="leave-request-actions leave-request-actions-table">
                              {isPending ? (
                                <>
                                  <button className="events-inline-button" type="button" onClick={() => printLeaveRequest(request)}>
                                    Imprimer la demande
                                  </button>
                                  <button className="events-inline-button events-inline-button-danger" type="button" onClick={() => openReviewModal(request, 'refuse')}>
                                    Refuser
                                  </button>
                                  <button className="events-inline-button" type="button" onClick={() => openReviewModal(request, 'approve')}>
                                    Transmettre RH
                                  </button>
                                </>
                              ) : (
                                <button className="events-inline-button" type="button" onClick={() => printLeaveRequest(request)}>
                                  Imprimer la demande
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="events-empty-state">Aucune demande en attente.</p>
            )}
          </article>
        ) : null}

        {canReviewHr || isAdmin ? (
          <article className="events-dashboard-card leave-approvals-card leave-approvals-card-full">
            <div className="events-chart-header">
              <h2>Demandes RH a valider</h2>
              <span>{hrRows.length}</span>
            </div>

            {isHrApprovalsLoading ? (
              <p className="events-empty-state">Chargement...</p>
            ) : hrRows.length > 0 ? (
              <div className="leave-table-wrap">
                <table className="leave-request-table">
                  <thead>
                    <tr>
                      <th>Demande</th>
                      <th>Période</th>
                      <th>Durée</th>
                      <th>Statut</th>
                      <th>Validation</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hrRows.map((request) => {
                      const isPendingHr = request.status === 'PENDING_HR';
                      const statusClass = request.status === 'REFUSED'
                        ? 'leave-status-refused'
                        : request.status === 'APPROVED'
                          ? 'leave-status-approved'
                          : 'leave-status-pending';

                      return (
                        <tr key={request.id}>
                          <td>
                            <div className="leave-table-primary">
                              <strong>{request.requesterFullName}</strong>
                              <span>{request.requesterRole}</span>
                            </div>
                          </td>
                          <td>{formatLeavePeriod(request)}</td>
                          <td>{pluralize(request.durationDays, 'jour', 'jours')}</td>
                          <td>
                            <span className={`leave-status-badge ${statusClass}`}>
                              {statusLabels[request.status] || request.status}
                            </span>
                          </td>
                          <td>
                            <div className="leave-validation-cell">
                              <strong>{getEmployeeLeaveValidationLabel(request)}</strong>
                              {request.reviewedAt ? <span>{`Le ${formatDateTime(request.reviewedAt)}`}</span> : null}
                              {request.reviewReason ? <small className="leave-review-reason">{`Motif: ${request.reviewReason}`}</small> : null}
                            </div>
                          </td>
                          <td>
                            <div className="leave-request-actions leave-request-actions-table">
                              {isPendingHr ? (
                                <>
                                  <button className="events-inline-button" type="button" onClick={() => printLeaveRequest(request)}>
                                    Imprimer la demande
                                  </button>
                                  <button className="events-inline-button events-inline-button-danger" type="button" onClick={() => openReviewModal(request, 'refuse', 'hr')}>
                                    Refuser
                                  </button>
                                  <button className="events-inline-button" type="button" onClick={() => openReviewModal(request, 'approve', 'hr')}>
                                    Approuver
                                  </button>
                                </>
                              ) : (
                                <button className="events-inline-button" type="button" onClick={() => printLeaveRequest(request)}>
                                  Imprimer la demande
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="events-empty-state">Aucune demande RH en attente.</p>
            )}
          </article>
        ) : null}

        {!hasApprovalAccess ? <p className="events-empty-state">Accès réservé aux valideurs.</p> : null}
      </section>

      {reviewModal ? (
        <div className="events-modal-overlay" role="presentation">
          <div className="events-modal leave-request-modal">
            <h2>{reviewModal.stage === 'hr' ? 'Refuser la demande RH' : 'Refuser la demande'}</h2>
            <p>
              {`${reviewModal.request.requesterFullName} - ${reviewModal.request.leaveType} - ${formatLeavePeriod(reviewModal.request)}`}
            </p>

            <form className="leave-request-form" onSubmit={handleReview}>
              <label className="event-form-field">
                <span>Motif du refus</span>
                <textarea
                  value={reviewReason}
                  onChange={(event) => {
                    setReviewReason(event.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="Expliquez le motif du refus"
                  required
                />
              </label>

              <div className="events-modal-actions">
                <button
                  className="events-secondary-button"
                  type="button"
                  onClick={() => {
                    setReviewModal(null);
                    setReviewReason('');
                  }}
                >
                  Annuler
                </button>
                <button className="events-inline-button events-inline-button-danger" type="submit">
                  Confirmer le refus
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </EventLayout>
  );
};

export default CongeApprovals;
