import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import './theme.css';

function App() {
  const [user, setUser] = useState(null);

  return (
    <Router>
      <div className="app-container">
        <div className="background-shapes">
            <div className="shape circle-1"></div>
            <div className="shape circle-2"></div>
            <div className="shape circle-3"></div>
        </div>

        <Routes>
          <Route path="/" element={
            user ? <Navigate to="/dashboard" /> : <Login onLogin={setUser} />
          } />
          <Route path="/dashboard" element={
            user ? <Dashboard user={user} onLogout={() => setUser(null)} /> : <Navigate to="/" />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;