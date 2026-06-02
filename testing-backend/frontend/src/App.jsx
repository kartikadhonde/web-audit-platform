import React, { useState } from 'react'
import './index.css'
import URLInput from './components/URLInput'
import Report from './components/Report'

import PlaywrightReport from './components/PlaywrightReport'

export default function App() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [scannedUrl, setScannedUrl] = useState('')

  async function handleScan(url) {
    setLoading(true)
    setError(null)
    setReport(null)
    setScannedUrl(url)

    // Production URL (via Vite proxy to bypass CORS)
    const N8N_WEBHOOK = '/webhook/13eb371d-1e25-45df-b589-c5b999969691'

    try {
      const res = await fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: url }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || `Scan failed with status ${res.status}`)
      }
      const data = await res.json()
      setReport(data)
    } catch (err) {
      setError(err?.message || 'Failed to scan the repository')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setReport(null)
    setError(null)
    setScannedUrl('')
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {!report && !loading && (
        <URLInput onScan={handleScan} error={error} />
      )}
      {loading && (
        <LoadingScreen url={scannedUrl} />
      )}
      {report && report.isPlaywright && (
        <PlaywrightReport report={report.report} onReset={handleReset} />
      )}
      {report && !report.isPlaywright && (
        <Report report={report} onReset={handleReset} />
      )}
    </div>
  )
}

function LoadingScreen({ url }) {
  const steps = [
    { label: 'Cloning GitHub repository', icon: '', delay: 0 },
    { label: 'Installing dependencies', icon: '', delay: 2.0 },
    { label: 'Running npm audit', icon: '', delay: 4.0 },
    { label: 'Analyzing cyclomatic complexity', icon: '', delay: 6.0 },
    { label: 'Generating metrics', icon: '', delay: 8.0 },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      gap: '3rem',
    }}>
      {/* Spinner */}
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <div style={{
          width: 80, height: 80,
          border: '3px solid rgba(99,102,241,0.15)',
          borderTop: '3px solid #6366f1',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
        }}>🔍</div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>
          Scanning your site
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
          {url}
        </p>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 400 }}>
        {steps.map((step, i) => (
          <div key={i} className="fade-up" style={{
            animationDelay: `${step.delay}s`,
            opacity: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
          }}>
            <span style={{ fontSize: 18 }}>{step.icon}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{step.label}</span>
            <div style={{
              marginLeft: 'auto',
              width: 6, height: 6,
              borderRadius: '50%',
              background: '#6366f1',
              animation: `pulse-ring 1.5s ease ${step.delay + 0.3}s infinite`,
            }} />
          </div>
        ))}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        This usually takes 20–40 seconds
      </p>
    </div>
  )
}
