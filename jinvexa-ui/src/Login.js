import React, { useState } from 'react';

function Login({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    const endpoint = isSignUp ? '/api/signup' : '/api/login';
    const payload = isSignUp 
      ? { name, email, phone, password } 
      : { username: email, password };

    try {
      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        if (isSignUp) {
          setSuccessMsg('Account created successfully! Please log in.');
          setIsSignUp(false);
          setPassword('');
        } else {
          onLogin(data);
        }
      } else {
        setError(data.detail || 'Authentication failed');
      }
    } catch (err) {
      setError('Cannot connect to the server. Is FastAPI running?');
    }
    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <div className="glass-card">
        <div className="header">
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3Z" fill="#8D6E63"/>
              <path d="M5 13.18V17.18C5 17.18 8.5 21 12 21C15.5 21 19 17.18 19 17.18V13.18L12 17L5 13.18Z" fill="#8D6E63"/>
          </svg>
          <h1>JINVEXA</h1>
          <p className="subtitle">{isSignUp ? 'JOIN THE COMMUNITY' : 'LEARNING AI'}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          {successMsg && <div style={{color: '#06D6A0', fontWeight: '600', marginBottom: '1rem'}}>{successMsg}</div>}
          
          {isSignUp && (
            <>
              <div className="input-group neomorph-inset">
                <span className="icon">👋</span>
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
              </div>
              <div className="input-group neomorph-inset">
                <span className="icon">📱</span>
                <input 
                  type="tel" 
                  placeholder="Phone Number" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required 
                />
              </div>
            </>
          )}

          <div className="input-group neomorph-inset">
            <span className="icon">✉️</span>
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="input-group neomorph-inset">
            <span className="icon">🔑</span>
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="neomorph-outset btn-primary" disabled={isLoading}>
            {isLoading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Enter the Hub')}
          </button>
        </form>
        
        <div className="footer-text" style={{ marginTop: '1.5rem', cursor: 'pointer', color: '#8D6E63' }} onClick={() => {
            setIsSignUp(!isSignUp);
            setError('');
            setSuccessMsg('');
        }}>
          <p>{isSignUp ? "Already have an account? Log In" : "New here? Create an Account"}</p>
        </div>
      </div>
    </div>
  );
}

export default Login;