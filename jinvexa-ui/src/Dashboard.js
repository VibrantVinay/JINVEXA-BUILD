import React, { useState, useEffect } from 'react';

function Dashboard({ user, onLogout }) {
  const displayName = user.username === 'admin' ? 'Vinayakrishnan' : user.username;
  const userInitial = displayName.charAt(0).toUpperCase();

  // Tab State: 'goal', 'reference', 'teaching', 'assignment', 'mentor', 'progress', 'profile'
  const [activeView, setActiveView] = useState('goal');

  // Base backend URL: Uses Vercel environment variable in production, localhost in development
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';

  // State for Goal Discovery
  const [goalInput, setGoalInput] = useState('');
  const [discoveryPlan, setDiscoveryPlan] = useState(null);
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);
  const [isGeneratingAssignment, setIsGeneratingAssignment] = useState(false);
  const [assignmentData, setAssignmentData] = useState(null);

  // State for Reference Learning
  const [refSource, setRefSource] = useState('');

  // State for Sessions (Dropdowns for Teaching, Assignments, Mentoring)
  const [sessions, setSessions] = useState([]);
  const [selectedTeachingSession, setSelectedTeachingSession] = useState('');
  const [selectedAssignmentSession, setSelectedAssignmentSession] = useState('');
  const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);
  const [courseResult, setCourseResult] = useState(null);

  // State for Mentor Chat
  const [chatMessages, setMessages] = useState([
    { role: 'assistant', content: `Hello ${displayName}! I'm your Jinvexa Mentor. What would you like to discuss today?` }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mentorMode, setMentorMode] = useState('full');
  const [selectedMentorSession, setSelectedMentorSession] = useState('');

  // State for Progress
  const [progressData, setProgressData] = useState(null);

  // State for Profile
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', phone: '', bio: '', learningGoal: '' });
  const [formData, setFormData] = useState({ name: '', phone: '', bio: '', learningGoal: '' });
  const [updateStatus, setUpdateStatus] = useState('');

  // Load Initial Data
  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Profile
      try {
        const profRes = await fetch(`${API_BASE_URL}/api/users/${user.user_id}`);
        if (profRes.ok) {
          const pData = await profRes.json();
          const pObj = { name: pData.name || '', phone: pData.phone || '', bio: pData.bio || '', learningGoal: pData.learning_goal || '' };
          setProfileData(pObj);
          setFormData(pObj);
        }
      } catch (err) { console.error("Profile fetch error."); }

      // 2. Fetch Sessions for Dropdowns
      try {
        const sessRes = await fetch(`${API_BASE_URL}/api/users/${user.user_id}/sessions`);
        if (sessRes.ok) {
          const sData = await sessRes.json();
          setSessions(sData.sessions || []);
          if (sData.sessions && sData.sessions.length > 0) {
            setSelectedTeachingSession(sData.sessions[0].session_id);
            setSelectedAssignmentSession(sData.sessions[0].session_id);
            setSelectedMentorSession(sData.sessions[0].session_id);
          }
        }
      } catch (err) { console.error("Session fetch error."); }

      // 3. Fetch Real Progress Data
      try {
        const progRes = await fetch(`${API_BASE_URL}/api/agents/tracker/progress`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.user_id, action: 'progress' })
        });
        if (progRes.ok) {
          setProgressData(await progRes.json());
        }
      } catch (err) { console.error("Progress fetch error."); }
    };

    fetchData();
  }, [user.user_id]);

  // Handlers
  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    setLoadingDiscovery(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/agents/discover`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'goal', user_id: user.user_id, goal: goalInput })
      });
      const data = await response.json();
      setDiscoveryPlan(data.plan);
      
      // Refresh sessions list so the new plan appears in dropdowns
      const sessRes = await fetch(`${API_BASE_URL}/api/users/${user.user_id}/sessions`);
      if (sessRes.ok) {
        const sData = await sessRes.json();
        setSessions(sData.sessions || []);
      }
    } catch (err) { alert("Error generating learning plan."); }
    setLoadingDiscovery(false);
  };

  const handleGenerateCourse = async () => {
    // BUG FIX: Auto-select the first course if React state is empty but sessions exist
    let sessionToBuild = selectedTeachingSession;
    if (!sessionToBuild && sessions.length > 0) {
      sessionToBuild = sessions[0].session_id;
      setSelectedTeachingSession(sessionToBuild);
    }

    if (!sessionToBuild) return alert("Please select a learning path first!");
    
    setIsGeneratingCourse(true);
    setCourseResult(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/agents/teach`, {
        method: 'POST', headers: { 'Content-Type': 'application/json','ngrok-skip-browser-warning': 'true'},
        body: JSON.stringify({ action: 'generate_course', session_id: sessionToBuild })
      });
      const data = await response.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        setCourseResult(data);
      }
    } catch (err) {
      alert("Failed to connect to the Teaching Agent.");
    }
    setIsGeneratingCourse(false);
  };

  const handleGenerateAssignment = async () => {
    // BUG FIX: Auto-select the first course if React state is empty but sessions exist
    let sessionToBuild = selectedAssignmentSession;
    if (!sessionToBuild && sessions.length > 0) {
      sessionToBuild = sessions[0].session_id;
      setSelectedAssignmentSession(sessionToBuild);
    }

    if (!sessionToBuild) return alert("Please select a course first!");
    
    setIsGeneratingAssignment(true);
    setAssignmentData(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/agents/assignment/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'generate', 
          user_id: user.user_id, 
          session_id: sessionToBuild 
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        setAssignmentData(data.assignment || data); 
      }
    } catch (err) {
      alert("Failed to connect to the Assignment Agent.");
    }
    
    setIsGeneratingAssignment(false);
  };

  const handleMentorChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { role: 'user', content: chatInput };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
      const payload = {
        action: 'chat',
        user_id: user.user_id,
        message: userMsg.content,
        mode: mentorMode,
      };
      if (mentorMode === 'session') payload.session_id = selectedMentorSession;

      const response = await fetch(`${API_BASE_URL}/api/agents/mentor`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response || "No response received." }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Server connection failed." }]);
    }
    setIsTyping(false);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setUpdateStatus('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${user.user_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, phone: formData.phone, bio: formData.bio, learning_goal: formData.learningGoal })
      });
      if (response.ok) {
        setProfileData(formData);
        setIsEditing(false);
        setUpdateStatus('Profile saved successfully! ✨');
        setTimeout(() => setUpdateStatus(''), 3000);
      }
    } catch (err) { setUpdateStatus('Error updating profile.'); }
  };

  const getNavStyle = () => ({
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
    textAlign: 'left', padding: '12px 15px', marginBottom: '8px', borderRadius: '12px',
    boxSizing: 'border-box', border: 'none', cursor: 'pointer', fontWeight: '600'
  });

  return (
    <div className="dashboard-wrapper">
      <aside className="glass-sidebar" style={{ minWidth: '260px', width: '260px', flexShrink: 0 }}>
        <div className="brand" style={{ marginBottom: '2rem' }}>
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3Z" fill="#06D6A0"/>
            <path d="M5 13.18V17.18C5 17.18 8.5 21 12 21C15.5 21 19 17.18 19 17.18V13.18L12 17L5 13.18Z" fill="#06D6A0"/>
          </svg>
          <h2>JINVEXA</h2>
        </div>

        <nav className="sidebar-nav" style={{ overflowY: 'auto', paddingRight: '5px' }}>
          <div className="nav-section" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Discovery</h3>
            <button className={`nav-item neomorph-inset ${activeView === 'goal' ? 'active' : ''}`} onClick={() => setActiveView('goal')} style={getNavStyle()}>🎯 Goal Discovery</button>
            <button className={`nav-item neomorph-inset ${activeView === 'reference' ? 'active' : ''}`} onClick={() => setActiveView('reference')} style={getNavStyle()}>📎 Reference Learning</button>
          </div>
          <div className="nav-section" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Creation</h3>
            <button className={`nav-item neomorph-inset ${activeView === 'teaching' ? 'active' : ''}`} onClick={() => setActiveView('teaching')} style={getNavStyle()}>📚 Teaching Layer</button>
            <button className={`nav-item neomorph-inset ${activeView === 'assignment' ? 'active' : ''}`} onClick={() => setActiveView('assignment')} style={getNavStyle()}>📝 Assignment Layer</button>
          </div>
          <div className="nav-section" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Guidance & Stats</h3>
            <button className={`nav-item neomorph-inset ${activeView === 'mentor' ? 'active' : ''}`} onClick={() => setActiveView('mentor')} style={getNavStyle()}>🤖 AI Mentor</button>
            <button className={`nav-item neomorph-inset ${activeView === 'progress' ? 'active' : ''}`} onClick={() => setActiveView('progress')} style={getNavStyle()}>📊 Progress & Stats</button>
          </div>
          <div className="nav-section">
            <h3 style={{ fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Account</h3>
            <button className={`nav-item neomorph-inset ${activeView === 'profile' ? 'active' : ''}`} onClick={() => { setActiveView('profile'); setIsEditing(false); }} style={getNavStyle()}>⚙️ Profile Settings</button>
          </div>
        </nav>

        <button className="logout-btn neomorph-outset" onClick={onLogout} style={{ marginTop: 'auto', padding: '12px', width: '100%', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Log Out</button>
      </aside>

      <main className="main-content" style={{ flex: 1, padding: '0 1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#2D3748', margin: 0 }}>Welcome back, {displayName}! 👋</h1>
            <p style={{ color: '#8D6E63', fontWeight: '600', fontSize: '1rem', margin: 0 }}>Brain: Gemma4 31B Cloud (Ollama)</p>
          </div>
          <div className="neomorph-outset" onClick={() => { setActiveView('profile'); setIsEditing(false); }} title="Profile Settings" style={{ flex: '0 0 55px', height: '55px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.5rem', fontWeight: '800', color: '#4E342E', cursor: 'pointer', overflow: 'hidden' }}>{userInitial}</div>
        </header>

        {activeView === 'goal' && (
          <section className="glass-panel" style={{ padding: '2rem', borderRadius: '24px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>🎯 Goal-Based Learning Discovery</h2>
            <form onSubmit={handleGoalSubmit} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '15px', marginBottom: '2rem', alignItems: 'stretch' }}>
              <button type="submit" className="neomorph-outset btn-primary" disabled={loadingDiscovery} style={{ padding: '15px 30px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', height: '100%', margin: 0 }}>{loadingDiscovery ? 'Analyzing...' : 'Generate Path'}</button>
              <input type="text" className="neomorph-inset" placeholder="e.g. I want to become an AI Engineer" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} style={{ width: '100%', padding: '15px', border: 'none', borderRadius: '12px', outline: 'none', fontSize: '1rem', boxSizing: 'border-box', margin: 0 }} required />
            </form>

            {discoveryPlan && (
              <div className="neomorph-inset" style={{ padding: '30px', borderRadius: '20px', display: 'block', width: '100%', boxSizing: 'border-box' }}>
                <h3 style={{ fontSize: '1.8rem', color: '#4E342E', margin: '0 0 15px 0', borderBottom: '2px solid rgba(6,214,160,0.3)', paddingBottom: '10px' }}>{discoveryPlan.main_topic}</h3>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '25px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.5)', padding: '10px 20px', borderRadius: '12px', color: '#4E342E' }}>
                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, display: 'block', marginBottom: '4px' }}>Goal</span>
                    <strong style={{ fontSize: '1.1rem' }}>{discoveryPlan.goal}</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.5)', padding: '10px 20px', borderRadius: '12px', color: '#4E342E' }}>
                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, display: 'block', marginBottom: '4px' }}>Estimated Time</span>
                    <strong style={{ fontSize: '1.1rem' }}>{discoveryPlan.estimated_time_hours} hrs</strong>
                  </div>
                </div>
                <h4 style={{ fontSize: '1.2rem', color: '#2D3748', marginBottom: '15px' }}>Roadmap Phases:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {discoveryPlan.roadmap?.map((phase, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.4)', padding: '15px 20px', borderRadius: '12px', borderLeft: '5px solid #06D6A0' }}>
                      <strong style={{ color: '#06D6A0', fontSize: '1.15rem', display: 'block', marginBottom: '6px' }}>Phase {phase.phase_number || idx + 1}: {phase.title}</strong>
                      <span style={{ color: '#4B5563', lineHeight: '1.5', display: 'block', fontSize: '1.05rem' }}>{phase.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {activeView === 'reference' && (
          <section className="glass-panel" style={{ padding: '2rem', borderRadius: '24px' }}>
            <h2 style={{ marginBottom: '1rem' }}>📎 Reference-Based Learning</h2>
            <p style={{ marginBottom: '20px', color: '#6B7280', fontSize: '1.1rem' }}>Paste a website URL to extract concepts.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '15px', alignItems: 'stretch' }}>
              <button className="neomorph-outset btn-primary" onClick={() => alert("Ingestion initiated via Playwright!")} style={{ padding: '15px 30px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', height: '100%', margin: 0 }}>Extract Concepts</button>
              <input type="text" className="neomorph-inset" placeholder="Paste URL..." value={refSource} onChange={(e) => setRefSource(e.target.value)} style={{ width: '100%', padding: '15px', border: 'none', borderRadius: '12px', outline: 'none', fontSize: '1rem', boxSizing: 'border-box', margin: 0 }} />
            </div>
          </section>
        )}

        {activeView === 'teaching' && (
          <section className="glass-panel" style={{ padding: '2rem', borderRadius: '24px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginBottom: '1rem' }}>📚 Teaching Layer</h2>
            <p style={{ marginBottom: '20px', color: '#6B7280', fontSize: '1.1rem' }}>Generates parallel audio/text lesson modules using Gemma 4 31B and saves them to MongoDB.</p>
            
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <select className="neomorph-inset" value={selectedTeachingSession} onChange={(e) => setSelectedTeachingSession(e.target.value)} style={{ padding: '15px', border: 'none', borderRadius: '12px', outline: 'none', fontSize: '1rem', minWidth: '300px' }}>
                {sessions.length === 0 ? <option value="">No paths available</option> : sessions.map((s) => (<option key={s.session_id} value={s.session_id}>{s.main_topic}</option>))}
              </select>
              <button className="neomorph-outset btn-primary" onClick={handleGenerateCourse} disabled={isGeneratingCourse} style={{ padding: '15px 30px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                {isGeneratingCourse ? 'Building...' : 'Build Active Course'}
              </button>
            </div>

            {courseResult && (
              <div className="neomorph-inset" style={{ marginTop: '20px', padding: '20px', borderRadius: '16px' }}>
                <h3 style={{ color: '#06D6A0' }}>✅ Course Generated Successfully!</h3>
                <p><strong>Total Lessons Created:</strong> {courseResult.total_lessons}</p>
                <p><strong>Database:</strong> Saved directly to MongoDB Atlas</p>
              </div>
            )}
          </section>
        )}

        {activeView === 'assignment' && (
          <section className="glass-panel" style={{ padding: '2rem', borderRadius: '24px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginBottom: '1rem' }}>📝 Assignment Layer</h2>
            <p style={{ marginBottom: '20px', color: '#6B7280', fontSize: '1.1rem' }}>Select a completed course to generate MCQs and essay questions.</p>
            
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
              <select className="neomorph-inset" value={selectedAssignmentSession} onChange={(e) => setSelectedAssignmentSession(e.target.value)} style={{ padding: '15px', border: 'none', borderRadius: '12px', outline: 'none', fontSize: '1rem', minWidth: '300px' }}>
                {sessions.length === 0 ? <option value="">No courses available</option> : sessions.map((s) => (<option key={s.session_id} value={s.session_id}>{s.main_topic}</option>))}
              </select>
              <button className="neomorph-outset btn-primary" onClick={handleGenerateAssignment} disabled={isGeneratingAssignment} style={{ padding: '15px 30px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                {isGeneratingAssignment ? 'Generating...' : 'Start Assignment'}
              </button>
            </div>

            {assignmentData && (
              <div className="neomorph-inset" style={{ padding: '20px', borderRadius: '16px', overflowY: 'auto' }}>
                <h3 style={{ color: '#06D6A0', marginBottom: '15px', borderBottom: '2px solid rgba(6,214,160,0.3)', paddingBottom: '10px' }}>
                  ✅ Assignment Generated!
                </h3>
                
                {/* Render Multiple Choice Questions */}
                {assignmentData.mcq_questions && assignmentData.mcq_questions.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ color: '#4E342E', fontSize: '1.2rem', marginBottom: '15px' }}>Multiple Choice Questions</h4>
                    {assignmentData.mcq_questions.map((q, idx) => (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.6)', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
                        <p style={{ fontWeight: 'bold', color: '#2D3748', margin: '0 0 10px 0' }}>{idx + 1}. {q.question}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {q.options?.map((opt, i) => (
                            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#4B5563' }}>
                              <input type="radio" name={`mcq_${idx}`} value={opt} style={{ accentColor: '#06D6A0' }} />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Render Essay Questions */}
                {assignmentData.essay_questions && assignmentData.essay_questions.length > 0 && (
                  <div style={{ marginTop: '25px' }}>
                    <h4 style={{ color: '#4E342E', fontSize: '1.2rem', marginBottom: '15px' }}>Essay Questions</h4>
                    {assignmentData.essay_questions.map((q, idx) => (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.6)', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
                        <p style={{ fontWeight: 'bold', color: '#2D3748', margin: '0 0 10px 0' }}>{idx + 1}. {q.question || q}</p>
                        <textarea 
                          className="neomorph-inset" 
                          placeholder="Write your answer here..." 
                          style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' }} 
                        />
                      </div>
                    ))}
                  </div>
                )}

                <button className="neomorph-outset btn-primary" style={{ marginTop: '20px', padding: '12px 25px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
                  Submit Assignment for AI Grading
                </button>
              </div>
            )}
          </section>
        )}

        {activeView === 'mentor' && (
          <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '650px', padding: '2rem', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>🤖 Jinvexa AI Mentor</h2>
              
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <select className="neomorph-inset" value={mentorMode} onChange={(e) => setMentorMode(e.target.value)} style={{ padding: '10px 15px', border: 'none', borderRadius: '8px', outline: 'none', fontWeight: 'bold' }}>
                  <option value="full">Free Chat (All Courses)</option>
                  <option value="session">Course Specific</option>
                </select>
                {mentorMode === 'session' && (
                  <select className="neomorph-inset" value={selectedMentorSession} onChange={(e) => setSelectedMentorSession(e.target.value)} style={{ padding: '10px 15px', border: 'none', borderRadius: '8px', outline: 'none' }}>
                    {sessions.map((s) => (<option key={s.session_id} value={s.session_id}>{s.main_topic}</option>))}
                  </select>
                )}
              </div>
            </div>

            <div className="neomorph-inset" style={{ flex: 1, overflowY: 'auto', padding: '20px', borderRadius: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column' }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '15px', width: '100%' }}>
                  <div style={{ padding: '12px 18px', borderRadius: '16px', maxWidth: '75%', background: msg.role === 'user' ? '#06D6A0' : '#FFF', color: msg.role === 'user' ? '#FFF' : '#2D3748', fontWeight: '500', lineHeight: '1.5', boxShadow: msg.role !== 'user' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none' }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && <div style={{ color: '#8D6E63', fontStyle: 'italic', marginLeft: '10px' }}>Jinvexa is thinking...</div>}
            </div>
            
            <form onSubmit={handleMentorChat} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '15px', alignItems: 'stretch' }}>
              <input type="text" className="neomorph-inset" placeholder="Ask your mentor anything..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} style={{ width: '100%', padding: '15px', border: 'none', borderRadius: '12px', outline: 'none', fontSize: '1rem', boxSizing: 'border-box', margin: 0 }} />
              <button type="submit" className="neomorph-outset btn-primary" disabled={isTyping} style={{ padding: '15px 30px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', height: '100%', margin: 0 }}>Send</button>
            </form>
          </section>
        )}

        {activeView === 'progress' && (
          <section className="glass-panel" style={{ padding: '2rem', borderRadius: '24px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>📊 Learning Analytics & Progress</h2>
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div className="stat-card neomorph-outset" style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div className="stat-icon" style={{ fontSize: '2rem', background: 'rgba(255,255,255,0.5)', padding: '10px', borderRadius: '12px' }}>📚</div>
                <div className="stat-info">
                  <h3 style={{ fontSize: '1.2rem', color: '#4E342E' }}>Assignments</h3>
                  <p style={{ color: '#6B7280', fontWeight: 'bold' }}>{progressData ? progressData.total_assignments : 0} Completed</p>
                </div>
              </div>
              <div className="stat-card neomorph-outset" style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div className="stat-icon" style={{ fontSize: '2rem', background: 'rgba(255,255,255,0.5)', padding: '10px', borderRadius: '12px' }}>📈</div>
                <div className="stat-info">
                  <h3 style={{ fontSize: '1.2rem', color: '#4E342E' }}>Average Score</h3>
                  <p style={{ color: '#6B7280', fontWeight: 'bold' }}>{progressData ? progressData.average_score : 0}%</p>
                </div>
              </div>
            </div>
            {progressData && progressData.trend && (
              <div className="neomorph-inset" style={{ marginTop: '2rem', padding: '20px', borderRadius: '16px' }}>
                <h3 style={{ color: '#4E342E', marginBottom: '10px' }}>Performance Trend</h3>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#06D6A0' }}>{progressData.trend}</p>
                <p style={{ color: '#6B7280', marginTop: '5px' }}>Performance Rating: {progressData.performance}</p>
              </div>
            )}
          </section>
        )}

        {activeView === 'profile' && (
          <section className="glass-panel" style={{ padding: '2rem', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0 }}>{isEditing ? 'Edit Profile' : 'Profile Settings'}</h2>
              <button onClick={() => setIsEditing(!isEditing)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '800', color: '#06D6A0', fontSize: '1.1rem' }}>{isEditing ? '❌ Cancel' : '✏️ Edit Profile'}</button>
            </div>

            {!isEditing ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="neomorph-inset" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.8rem', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Display Name</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#2D3748' }}>{profileData.name || 'Not set'}</span>
                </div>
                <div className="neomorph-inset" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.8rem', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Phone Number</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#2D3748' }}>{profileData.phone || 'Not set'}</span>
                </div>
                <div className="neomorph-inset" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.8rem', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Learning Goal</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#2D3748' }}>{profileData.learningGoal || 'Not set'}</span>
                </div>
                <div className="neomorph-inset" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: '120px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Bio</span>
                  <span style={{ fontSize: '1.1rem', color: '#2D3748', lineHeight: '1.5' }}>{profileData.bio || 'Not set'}</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProfileUpdate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <input type="text" className="neomorph-inset" placeholder="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} style={{ padding: '15px', border: 'none', borderRadius: '12px', fontSize: '1rem', width: '100%', boxSizing: 'border-box' }} />
                  <input type="tel" className="neomorph-inset" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} style={{ padding: '15px', border: 'none', borderRadius: '12px', fontSize: '1rem', width: '100%', boxSizing: 'border-box' }} />
                  <input type="text" className="neomorph-inset" placeholder="Learning Goal" value={formData.learningGoal} onChange={(e) => setFormData({...formData, learningGoal: e.target.value})} style={{ padding: '15px', border: 'none', borderRadius: '12px', fontSize: '1rem', width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <textarea className="neomorph-inset" placeholder="Tell us about yourself..." value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} style={{ padding: '15px', border: 'none', borderRadius: '12px', fontSize: '1rem', width: '100%', boxSizing: 'border-box', minHeight: '165px', resize: 'none' }} />
                  <button type="submit" className="neomorph-outset btn-primary" style={{ padding: '15px', borderRadius: '12px', fontSize: '1.1rem', width: '100%', border: 'none', cursor: 'pointer' }}>Save Profile</button>
                </div>
              </form>
            )}
            {updateStatus && <p style={{ marginTop: '20px', color: '#06D6A0', fontWeight: '800', fontSize: '1.1rem' }}>{updateStatus}</p>}
          </section>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
