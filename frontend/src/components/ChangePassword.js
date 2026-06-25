import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';
import OIP11 from '../images/OIP11.svg';
import PortalFooter from './PortalFooter';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { changePassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Tous les champs sont obligatoires.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);
    const result = await changePassword(currentPassword, newPassword);
    setIsSubmitting(false);

    if (result.ok) {
      navigate('/home', { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="login">
      <div className="login-panel">
        <div className="login-panel-content">
          <div className="login-panel-inner">
            <div className="login-brand">
              <img className="login-brand-logo" alt="Armoiries du Maroc" src={OIP11} />
              <p className="login-brand-text">
                Royaume du Maroc
                <br />
                Ministere de l&apos;Interieur
                <br />
                Wilaya De La Region De L&apos;Oriental
              </p>
            </div>

            <div className="login-copy">
              <h1 className="login-title">
                Changer le
                <br />
                mot de passe
              </h1>
              <p className="login-subtitle">
                Mettez a jour votre mot de passe avant de continuer.
              </p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <input
                className="login-input"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Mot de passe actuel"
              />
              <input
                className="login-input"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Nouveau mot de passe"
              />
              <input
                className="login-input"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Confirmer le mot de passe"
              />

              {error ? <p className="login-error">{error}</p> : null}

              <button className="login-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Mise a jour...' : 'Mettre a jour'}
              </button>
            </form>
          </div>

          <PortalFooter />
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
