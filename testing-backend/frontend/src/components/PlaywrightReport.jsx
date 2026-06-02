import React from 'react'

function getOverallColor(score) {
  if (score >= 90) return '#22c55e'
  if (score >= 70) return '#f59e0b'
  return '#f43f5e'
}

function ScoreRing({ score, label }) {
  const size = 120
  const strokeWidth = 8
  const r = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * r
  const progress = ((100 - score) / 100) * circumference
  const color = getOverallColor(score)

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={progress}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${color}88)` }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</span>
      </div>
    </div>
  )
}

export default function PlaywrightReport({ report, onReset }) {
  if (report.error) {
    return (
      <div className="report-container">
        <h2 style={{ color: '#f43f5e' }}>Client-Side Test Failed</h2>
        <p>{report.error}</p>
        <button className="btn btn-secondary mt-8" onClick={onReset}>Scan Another URL</button>
      </div>
    )
  }

  const scores = report.scores || {}
  const lhScores = report.lighthouse?.scores || {}

  return (
    <div className="report-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>E2E Client-Side Audit</h1>
          <a href={report.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
            {report.url}
          </a>
        </div>
        <button className="btn btn-secondary" onClick={onReset}>New Scan</button>
      </div>

      {/* Top Scores Grid */}
      <div className="grid">
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ marginBottom: 16 }}>Performance</h3>
          <ScoreRing score={lhScores.performance || 0} label="Lighthouse" />
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ marginBottom: 16 }}>Accessibility</h3>
          <ScoreRing score={lhScores.accessibility || scores.accessibilityScore || 0} label="Axe-core" />
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ marginBottom: 16 }}>SEO & Content</h3>
          <ScoreRing score={lhScores.seo || 0} label="Lighthouse" />
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ marginBottom: 16 }}>Security</h3>
          <ScoreRing score={scores.securityScore || 0} label="Headers" />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr', marginTop: 24 }}>
        {/* Accessibility Details */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e' }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 style={{ margin: 0 }}>Accessibility Violations</h2>
          </div>
          
          {report.accessibility?.violations?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {report.accessibility.violations.map((v, i) => (
                <div key={i} style={{ padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>{v.id}</strong>
                    <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: v.impact === 'critical' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: v.impact === 'critical' ? '#f43f5e' : '#f59e0b', textTransform: 'uppercase' }}>
                      {v.impact}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{v.description} ({v.nodes} elements affected)</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No accessibility violations found! Perfect score.</p>
          )}
        </div>

        {/* Security Details */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 style={{ margin: 0 }}>Security Headers</h2>
          </div>
          
          {report.security?.missingHeaders?.length > 0 ? (
            <ul style={{ paddingLeft: 20, color: 'var(--text-muted)' }}>
              {report.security.missingHeaders.map((h, i) => (
                <li key={i} style={{ marginBottom: 8, color: '#f43f5e' }}>Missing: <strong>{h}</strong></li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>All recommended security headers are present!</p>
          )}
        </div>
      </div>
    </div>
  )
}
