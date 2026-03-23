// App.jsx — Root component managing app state and routing between upload and dashboard views
import { useState, useEffect } from 'react';
import UploadZone from './components/UploadZone';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  // 'upload' | 'loading' | 'results' | 'error'
  const [stage, setStage] = useState('upload');
  const [analysisData, setAnalysisData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Simulate loading step progression for better UX
  useEffect(() => {
    if (stage === 'loading') {
      setLoadingStep(0);
      const timers = [
        setTimeout(() => setLoadingStep(1), 800),
        setTimeout(() => setLoadingStep(2), 2200),
        setTimeout(() => setLoadingStep(3), 4500),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [stage]);

  // Handle file analysis submission
  const handleAnalyze = async (file, jobDescription) => {
    setStage('loading');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('resume', file);
    if (jobDescription) formData.append('jobDescription', jobDescription);

    try {
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Analysis failed. Please try again.');
      }

      const data = await response.json();
      setAnalysisData(data);
      setStage('results');
    } catch (err) {
      setErrorMsg(err.message);
      setStage('error');
    }
  };

  const handleReset = () => {
    setStage('upload');
    setAnalysisData(null);
    setErrorMsg('');
    setLoadingStep(0);
  };

  return (
    <div className="app-wrapper">
      {/* Navbar */}
      <nav className="navbar">
        <a className="navbar-brand" href="/" onClick={(e) => { e.preventDefault(); handleReset(); }}>
          <span className="brand-icon">✦</span>
          <span>ResumeAI</span>
        </a>
        <div className="navbar-actions">
          {stage === 'results' && (
            <button className="btn btn-secondary btn-sm" onClick={handleReset}>
              ← New Analysis
            </button>
          )}
          <button
            className="btn btn-icon btn-ghost"
            onClick={() => setDarkMode(!darkMode)}
            title="Toggle theme"
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {stage === 'upload' && (
          <UploadZone onAnalyze={handleAnalyze} />
        )}

        {stage === 'loading' && (
          <div className="loader-wrapper">
            <div className="spinner">
              <div className="spinner-inner" />
            </div>
            <div>
              <h3 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Analyzing your resume…</h3>
              <p style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Our AI is reviewing every detail</p>
            </div>
            <div className="loading-steps">
              {[
                'Extracting text from your document',
                'Running AI analysis',
                'Calculating scores & match',
                'Generating recommendations',
              ].map((step, i) => (
                <div
                  key={i}
                  className={`loading-step ${loadingStep === i ? 'active' : loadingStep > i ? 'done' : ''}`}
                >
                  <span className="loading-step-dot" />
                  <span>{loadingStep > i ? '✓ ' : ''}{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stage === 'results' && analysisData && (
          <Dashboard data={analysisData} onReset={handleReset} />
        )}

        {stage === 'error' && (
          <div className="card error-card" style={{ maxWidth: 540, margin: '4rem auto' }}>
            <div className="error-icon">⚠️</div>
            <h3 style={{ marginBottom: '0.75rem' }}>Analysis Failed</h3>
            <p style={{ marginBottom: '1.5rem' }}>{errorMsg}</p>
            <button className="btn btn-primary" onClick={handleReset}>
              Try Again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
