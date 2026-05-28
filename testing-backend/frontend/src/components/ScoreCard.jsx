import React from 'react'

// Circular SVG score ring
function ScoreRing({ score, size = 88, strokeWidth = 7, color }) {
  const r = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * r
  const progress = ((100 - score) / 100) * circumference

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={progress}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  )
}

function getScoreColor(score) {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#f59e0b'
  return '#f43f5e'
}

function getScoreLabel(score) {
  if (score >= 80) return 'Good'
  if (score >= 60) return 'Needs Work'
  return 'Poor'
}

export default function ScoreCard({ title, icon, worker, animDelay = 0, expanded, onToggle }) {
  if (!worker) return null

  const score = worker.score ?? 0
  const color = getScoreColor(score)
  const tests = worker.tests || []
  const passCount = tests.filter(t => t.status === 'PASS').length

  return (
    <div
      className="glass fade-up"
      style={{
        animationDelay: `${animDelay}s`,
        opacity: 0,
        padding: '1.5rem',
        cursor: tests.length > 0 ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
        boxShadow: expanded ? `0 8px 32px ${color}22` : 'var(--shadow-card)',
        borderColor: expanded ? `${color}44` : 'var(--border)',
      }}
      onMouseEnter={e => { if (!expanded) e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
      onClick={onToggle}
      role="button"
      tabIndex={0}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.2rem' }}>
        <div style={{
          width: 40, height: 40,
          borderRadius: 'var(--radius-md)',
          background: `${color}18`,
          border: `1px solid ${color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{title}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            {passCount}/{tests.length} tests passed
          </div>
        </div>
        {tests.length > 0 && (
          <div style={{
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(180deg)' : 'none',
          }}>▾</div>
        )}
      </div>

      {/* Score ring + number */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '1rem' }}>
        <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
          <ScoreRing score={score} color={color} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>/100</span>
          </div>
        </div>
        <div>
          <div className="badge" style={{
            background: `${color}18`,
            color,
            border: `1px solid ${color}33`,
            marginBottom: 8,
          }}>
            {getScoreLabel(score)}
          </div>
          {worker.error && (
            <div style={{ color: 'var(--fail)', fontSize: '0.75rem', maxWidth: 160 }}>
              ⚠ {worker.error}
            </div>
          )}
        </div>
      </div>

      {/* PASS/FAIL test list (expanded) */}
      {expanded && tests.length > 0 && (
        <div style={{
          marginTop: '1rem',
          borderTop: '1px solid var(--border)',
          paddingTop: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          {tests.map((test, i) => (
            <TestRow key={i} test={test} />
          ))}
        </div>
      )}
    </div>
  )
}

function TestRow({ test }) {
  const isPass = test.status === 'PASS'
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '8px 10px',
      background: isPass ? 'var(--pass-soft)' : 'var(--fail-soft)',
      borderRadius: 'var(--radius-sm)',
      fontSize: '0.82rem',
    }}>
      <span style={{ color: isPass ? 'var(--pass)' : 'var(--fail)', flexShrink: 0, marginTop: 1 }}>
        {isPass ? '✓' : '✗'}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{test.name}</div>
        {test.value !== null && test.value !== undefined && (
          <div style={{
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            marginTop: 2,
            wordBreak: 'break-all',
          }}>
            {String(test.value)}
          </div>
        )}
      </div>
      <span className="badge" style={{
        flexShrink: 0,
        background: isPass ? 'var(--pass-soft)' : 'var(--fail-soft)',
        color: isPass ? 'var(--pass)' : 'var(--fail)',
      }}>
        {test.status}
      </span>
    </div>
  )
}
