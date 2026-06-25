import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import OIP11 from "../images/OIP11.svg";
import polygonGrey from "../images/Polygon 1.svg";
import polygonAmber from "../images/Polygon 2.svg";
import polygonGreen from "../images/Polygon 3.svg";
import polygonRed from "../images/Polygon 3-1.svg";
import PortalFooter from './PortalFooter';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const normalizedUsername = username.trim();

    if (!normalizedUsername || !password) {
      setError('Veuillez renseigner votre identifiant et votre mot de passe.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(normalizedUsername, password);
    setIsSubmitting(false);

    if (result.ok) {
      navigate(result.forcePasswordChange ? '/change-password' : '/home', { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="login">
      <div className="login-panel">
        <div className="login-panel-bg" />
        <img className="login-shape login-shape-red" alt="" src={polygonRed} />
        <img className="login-shape login-shape-grey" alt="" src={polygonGrey} />
        <img className="login-shape login-shape-amber" alt="" src={polygonAmber} />
        <img className="login-shape login-shape-green" alt="" src={polygonGreen} />

        <div className="login-panel-content">
          <div className="login-panel-inner">
            <div className="login-brand">
              <img className="login-brand-logo" alt="Armoiries du Maroc" src={OIP11} />
              <p className="login-brand-text">
                Royaume du Maroc
                <br />
                Ministère de l&apos;Intérieur
                <br />
                Wilaya De La Région De L&apos;Oriental
              </p>
            </div>

            <div className="login-copy">
              <h1 className="login-title">
                Bienvenue a
                <br />
                Wilaya Portal
              </h1>

              <p className="login-subtitle">
                Connectez-vous au Portail avec l&apos;identifiant et le mot de passe fournis
                par l&apos;administrateur.
              </p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <input
                className="login-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Identifiant"
              />

              <input
                className="login-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Mot de Passe"
              />

              {error ? <p className="login-error">{error}</p> : null}

              <button className="login-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Connexion...' : 'Connecter'}
              </button>
            </form>
          </div>

          <PortalFooter />
        </div>
      </div>
    </div>
  );
};

export default Login;
