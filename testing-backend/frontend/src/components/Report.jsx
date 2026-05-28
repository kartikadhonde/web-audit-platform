import React, { useState } from 'react'
import ScoreCard from './ScoreCard'

const WORKERS = [
  { key: 'performance',   title: 'Performance',   icon: '⚡' },
  { key: 'seo',           title: 'SEO',            icon: '📝' },
  { key: 'accessibility', title: 'Accessibility',  icon: '♿' },
  { key: 'security',      title: 'Security',       icon: '🔒' },
  { key: 'links',         title: 'Broken Links',   icon: '🔗' },
  { key: 'visual',        title: 'Visual',         icon: '📸' },
]

function getOverallColor(score) {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#f59e0b'
  return '#f43f5e'
}

function OverallRing({ score }) {
  const size = 160
  const strokeWidth = 10
  const r = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * r
  const progress = ((100 - score) / 100) * circumference
  const color = getOverallColor(score)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
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
        <span style={{ fontSize: '2.8rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Overall Score</span>
      </div>
    </div>
  )
}

export default function Report({ report, onReset }) {
  const [expandedCard, setExpandedCard] = useState(null)
  const [showScreenshot, setShowScreenshot] = useState(false)

  const { url, overallScore, status, scannedAt, workers } = report
  const color = getOverallColor(overallScore)
  const screenshot = workers?.visual?.screenshot

  function toggleCard(key) {
    setExpandedCard(prev => prev === key ? null : key)
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>

      {/* Header */}
      <div className="fade-up" style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2.5rem',
        flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>
            Audit Report
          </h1>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
          }}>
            {url}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Scanned {new Date(scannedAt).toLocaleString()}
          </div>
        </div>
        <button
          id="new-scan-btn"
          onClick={onReset}
          style={{
            padding: '10px 20px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = '#a5b4fc' }}
          onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)' }}
        >
          ← New Scan
        </button>
      </div>

      {/* Overall hero panel */}
      <div className="glass fade-up fade-up-1" style={{
        padding: '2.5rem',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '3rem',
        flexWrap: 'wrap',
        boxShadow: `0 0 60px ${color}18`,
        borderColor: `${color}33`,
      }}>
        <OverallRing score={overallScore} />

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
            <span style={{
              padding: '6px 18px',
              background: status === 'PASS' ? 'var(--pass-soft)' : 'var(--fail-soft)',
              border: `1px solid ${status === 'PASS' ? 'rgba(34,197,94,0.3)' : 'rgba(244,63,94,0.3)'}`,
              borderRadius: 100,
              color: status === 'PASS' ? 'var(--pass)' : 'var(--fail)',
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.05em',
            }}>
              {status === 'PASS' ? '✓ PASS' : '✗ FAIL'}
            </span>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {overallScore >= 80
              ? 'Looking great! Minor improvements possible.'
              : overallScore >= 60
              ? 'Some issues found. Check the details below.'
              : 'Significant issues detected across multiple areas.'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
            Scanned {WORKERS.length} dimensions in parallel. Click any card below to see detailed PASS/FAIL results.
          </p>

          {/* Mini score bar */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6,
            }}>
              <span>0</span><span>50</span><span>100</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${overallScore}%`,
                background: `linear-gradient(90deg, ${color}88, ${color})`,
                borderRadius: 4,
                transition: 'width 1.5s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: `0 0 12px ${color}66`,
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Worker grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.2rem',
        marginBottom: '2rem',
      }}>
        {WORKERS.map((w, i) => (
          <ScoreCard
            key={w.key}
            title={w.title}
            icon={w.icon}
            worker={workers?.[w.key]}
            animDelay={0.1 * (i + 2)}
            expanded={expandedCard === w.key}
            onToggle={() => toggleCard(w.key)}
          />
        ))}
      </div>

      {/* Screenshot panel */}
      {screenshot && (
        <div className="glass fade-up" style={{ padding: '1.5rem' }}>
          <div
            style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer', marginBottom: showScreenshot ? '1.2rem' : 0,
            }}
            onClick={() => setShowScreenshot(s => !s)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📸</span>
              <span style={{ fontWeight: 600 }}>Screenshot Preview</span>
            </div>
            <span style={{
              color: 'var(--text-muted)', fontSize: '0.85rem',
              transition: 'transform 0.2s',
              transform: showScreenshot ? 'rotate(180deg)' : 'none',
            }}>▾</span>
          </div>
          {showScreenshot && (
            <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <img
                src={`data:image/png;base64,${screenshot}`}
                alt="Page screenshot"
                style={{ width: '100%', display: 'block' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Claude analysis — shown if present */}
      {workers?.seo?.claudeAnalysis && !workers.seo.claudeAnalysis.error && (
        <div className="glass fade-up" style={{ padding: '1.5rem', marginTop: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <span style={{ fontWeight: 600 }}>Claude AI — SEO Analysis</span>
            <span style={{
              marginLeft: 'auto',
              padding: '3px 12px',
              background: 'var(--accent-soft)',
              color: '#a5b4fc',
              borderRadius: 100,
              fontSize: '0.78rem',
              fontWeight: 600,
            }}>Score: {workers.seo.claudeAnalysis.score}/100</span>
          </div>
          {workers.seo.claudeAnalysis.issues?.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Issues</div>
              {workers.seo.claudeAnalysis.issues.map((issue, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, color: 'var(--fail)', fontSize: '0.875rem', marginBottom: 4 }}>
                  <span>✗</span><span>{issue}</span>
                </div>
              ))}
            </div>
          )}
          {workers.seo.claudeAnalysis.suggestions?.length > 0 && (
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Suggestions</div>
              {workers.seo.claudeAnalysis.suggestions.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, color: 'var(--pass)', fontSize: '0.875rem', marginBottom: 4 }}>
                  <span>→</span><span>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
