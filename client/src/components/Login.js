// src/components/Login.js
import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase/config';
import API from "../api";
import './Login.css';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('admin@company.com');
  const [password, setPassword] = useState('admin123');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState('checking');
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    checkFirebaseStatus();
  }, []);

  const checkFirebaseStatus = () => {
    try {
      if (auth) {
        setFirebaseStatus('ready');
        console.log('✅ Firebase auth is ready');
      } else {
        setFirebaseStatus('error');
        setError('Firebase authentication is not available');
      }
    } catch (error) {
      console.error('Firebase check error:', error);
      setFirebaseStatus('error');
      setError('Firebase configuration error: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await API.post('/api/auth/login', {
        email,
        password
      });

      const data = response.data;

      if (data.success) {
        onLogin(data.user, data.token);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Cannot connect to server. Please check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (firebaseStatus !== 'ready') {
      setError('Firebase is not ready. Please check configuration.');
      return;
    }

    setGoogleLoading(true);
    setError('');

    try {
      console.log('Starting Google authentication...');
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);
      console.log('✅ Google auth successful');
      
      const user = result.user;
      const idToken = await user.getIdToken();

      const response = await API.post('/api/auth/google', {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        idToken: idToken
      });

      const data = response.data;

      if (data.success) {
        onLogin(data.user, data.token);
      } else {
        setError(data.message || 'Google login failed on server');
      }
    } catch (error) {
      console.error('❌ Google login error:', error);
      
      switch (error.code) {
        case 'auth/configuration-not-found':
          setError('Firebase configuration missing. Please register web app in Firebase Console.');
          break;
        case 'auth/invalid-api-key':
          setError('Invalid Firebase API key. Please check configuration.');
          break;
        case 'auth/unauthorized-domain':
          setError('This domain is not authorized. Please add localhost to authorized domains in Firebase Console.');
          break;
        case 'auth/operation-not-allowed':
          setError('Google sign-in is not enabled. Please enable it in Firebase Console.');
          break;
        default:
          setError(`Google login failed: ${error.message}`);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Background Elements */}
      <div className="background-elements">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
        <div className="floating-shape shape-4"></div>
      </div>

      <div className="login-content">
        {/* Left Side - Branding */}
        <div className="login-branding">
          <div className="brand-logo">
            <div className="logo-icon">
              <i className="fas fa-user-clock"></i>
            </div>
            <h1>AttendancePro</h1>
          </div>
          <div className="brand-content">
            <h2>Streamline Your Workforce Management</h2>
            <p>Efficient, reliable, and modern attendance tracking system for your organization</p>
            <div className="features-list">
              <div className="feature-item">
                <i className="fas fa-check-circle"></i>
                <span>Real-time Tracking</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-check-circle"></i>
                <span>Automated Reports</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-check-circle"></i>
                <span>Secure Access</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-wrapper">
          <div className="login-form-card">
            <div className="form-header">
              <h2>Welcome Back</h2>
              <p>Sign in to your account</p>
            </div>
            
            {error && (
              <div className="error-message animated-shake">
                <i className="fas fa-exclamation-circle"></i>
                <div className="error-content">
                  <strong>Login Error</strong>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <div className="input-container">
                  <i className="fas fa-envelope input-icon"></i>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={loading || googleLoading}
                    className="input-field"
                  />
                  <label className="input-label">Email Address</label>
                </div>
              </div>

              <div className="form-group">
                <div className="input-container">
                  <i className="fas fa-lock input-icon"></i>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={loading || googleLoading}
                    className="input-field"
                  />
                  <label className="input-label">Password</label>
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    disabled={loading || googleLoading}
                  />
                  <span className="custom-checkbox">
                    <i className="fas fa-check"></i>
                  </span>
                  Remember me
                </label>
                <a href="#forgot" className="forgot-link">
                  Forgot password?
                </a>
              </div>

              <button 
                type="submit" 
                className={`login-btn ${loading ? 'loading' : ''}`}
                disabled={loading || googleLoading}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {loading ? (
                  <>
                    <div className="btn-spinner"></div>
                    Signing In...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt"></i>
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="divider">
              <span>Or continue with</span>
            </div>

            <button 
              className={`google-login-btn ${googleLoading ? 'loading' : ''}`}
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading || firebaseStatus !== 'ready'}
            >
              {googleLoading ? (
                <>
                  <div className="btn-spinner"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <div className="google-icon-wrapper">
                    <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  Continue with Google
                </>
              )}
            </button>

            <div className="demo-credentials">
              <div className="demo-header">
                <i className="fas fa-info-circle"></i>
                <span>Demo Access</span>
              </div>
              <div className="demo-info">
                <div className="demo-item">
                  <i className="fas fa-user"></i>
                  <span>admin@company.com</span>
                </div>
                <div className="demo-item">
                  <i className="fas fa-key"></i>
                  <span>admin123</span>
                </div>
              </div>
            </div>

            {firebaseStatus !== 'ready' && (
              <div className={`status-indicator ${firebaseStatus}`}>
                <i className={`fas ${
                  firebaseStatus === 'ready' ? 'fa-check-circle' :
                  firebaseStatus === 'checking' ? 'fa-sync fa-spin' : 'fa-exclamation-triangle'
                }`}></i>
                Firebase: {firebaseStatus === 'ready' ? 'Ready' : firebaseStatus === 'checking' ? 'Checking...' : 'Error'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;