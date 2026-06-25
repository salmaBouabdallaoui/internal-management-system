import React from 'react';
import './Help.css';
import PortalHeader from './PortalHeader';
import PortalFooter from './PortalFooter';

const workflowSteps = [
  {
    title: 'Employé',
    text: 'Vous saisissez votre demande depuis la page Congés.',
  },

  {
    title: 'Chef de division',
    text: 'Le chef de division valide.',
  },
  {
    title: 'RH',
    text: 'La validation finale est faite par l\'admin RH.',
  },
];

const faqs = [
  {
    question: 'Que faire si j\'ai oublié mon mot de passe ?',
    answer: 'Contactez l\'admin RH ou le support interne pour réinitialiser votre accès. Un nouveau mot de passe peut ensuite être défini à la prochaine connexion.',
  },
  {
    question: 'Comment modifier une demande déjà envoyée ?',
    answer: 'Ouvrez la page Congés, retrouvez votre demande puis cliquez sur Modifier. Si la demande a déjà été traitée, son statut peut être recalculé selon la règle du système.',
  },
  {
    question: 'Qui valide mes congés si mon supérieur est absent ?',
    answer: 'Si le chef de division est absent, la demande est envoyée directement au RH. Si le chef de service soumet la demande et que le chef de division est absent, le circuit bascule aussi vers le RH.',
  },
];

const Help = () => {
  return (
    <div className="help-page">
      <PortalHeader active="help" />

      <main className="help-content">
        <section className="help-hero">
          <div className="help-hero-copy">
            <p className="help-kicker">Aide</p>
            <h1>Comprendre le fonctionnement de la plateforme</h1>
            <p>
              Cette page résume le circuit des congés, les réponses aux questions fréquentes et la marche à suivre
              pour demander de l&apos;assistance.
            </p>
          </div>
          <div className="help-hero-panel">
            <span>Support</span>
            <strong>support@wilaya.ma</strong>
            <p>Utilisez ce contact pour les problèmes techniques, les accès et les demandes de réinitialisation.</p>
            <a className="help-ticket-button" href="mailto:support@wilaya.ma?subject=Ticket%20d%27assistance%20Wilaya%20Portal">
              Envoyer un ticket
            </a>
          </div>
        </section>

        <section className="help-section">
          <div className="help-section-head">
            <h2>Workflow des congés</h2>
            <p>Le parcours ci-dessous montre le cheminement d&apos;une demande selon le cas d&apos;usage.</p>
          </div>

          <div className="help-workflow">
            {workflowSteps.map((step, index) => (
              <React.Fragment key={step.title}>
                <article className="help-workflow-step">
                  <span className="help-workflow-index">{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.text}</p>
                  </div>
                </article>
                {index < workflowSteps.length - 1 ? <div className="help-workflow-arrow" aria-hidden="true">→</div> : null}
              </React.Fragment>
            ))}
          </div>

          <div className="help-special-rule">
            <strong>Règle spéciale</strong>
            <p>
              Si le chef de division est absent, les demandes du département ne s&apos;arrêtent pas. Elles passent
              directement au RH.
            </p>
          </div>
        </section>

        <section className="help-section">
          <div className="help-section-head">
            <h2>Questions fréquentes</h2>
            <p>Les réponses ci-dessous couvrent les usages les plus courants.</p>
          </div>

          <div className="help-faq">
            {faqs.map((faq) => (
              <details className="help-faq-item" key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

      </main>

      <PortalFooter />
    </div>
  );
};

export default Help;
