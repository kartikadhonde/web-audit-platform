const fs = require('fs');
const path = require('path');

function scoreColor(score) {
    if (score === null || score === undefined) return '#94a3b8';
    if (score >= 80) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
}

function scoreLabel(score) {
    if (score === null || score === undefined) return 'N/A';
    if (score >= 80) return 'Good';
    if (score >= 50) return 'Needs Work';
    return 'Poor';
}

function badge(text, color) {
    return `<span class="badge" style="background:${color}">${text}</span>`;
}

function impactColor(impact) {
    const map = { critical: '#ef4444', serious: '#f97316', moderate: '#f59e0b', minor: '#94a3b8' };
    return map[impact] || '#94a3b8';
}

function scoreRing(score, label) {
    const color = scoreColor(score);
    const display = score !== null && score !== undefined ? score : '—';
    return `
    <div class="score-ring">
      <svg viewBox="0 0 80 80" width="80" height="80">
        <circle cx="40" cy="40" r="34" fill="none" stroke="#1e293b" stroke-width="8"/>
        <circle cx="40" cy="40" r="34" fill="none" stroke="${color}" stroke-width="8"
          stroke-dasharray="${score !== null && score !== undefined ? (score / 100) * 213.6 : 0} 213.6"
          stroke-linecap="round" transform="rotate(-90 40 40)"/>
      </svg>
      <div class="ring-label">
        <span class="ring-score" style="color:${color}">${display}</span>
        <span class="ring-name">${label}</span>
      </div>
    </div>`;
}

function renderList(items, color = '#94a3b8') {
    if (!items || items.length === 0) return '<p class="ok">✓ None found</p>';
    return `<ul>${items.map(i => `<li style="border-left:3px solid ${color}">${i}</li>`).join('')}</ul>`;
}

function generateDashboard(report) {
    const { url, title, generatedAt, scores, accessibility, performance, lighthouse, security, brokenLinks, screenshot, seo, visualAnalysis } = report;

    // Compute overall score
    const allScores = [
        scores.performanceScore,
        scores.accessibilityScore,
        scores.securityScore,
        scores.brokenLinksScore,
        lighthouse?.scores?.performance,
        lighthouse?.scores?.seo,
    ].filter(s => s !== null && s !== undefined);
    const overallScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;

    let screenshotBase64 = null;
    if (screenshot?.path && fs.existsSync(screenshot.path)) {
        screenshotBase64 = fs.readFileSync(screenshot.path).toString('base64');
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Site Audit — ${title || url}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
  a { color: #60a5fa; }

  /* Header */
  .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-bottom: 1px solid #1e293b; padding: 2rem; }
  .header h1 { font-size: 1.5rem; font-weight: 700; color: #f8fafc; margin-bottom: .25rem; }
  .header .meta { font-size: .85rem; color: #64748b; }
  .header .url { color: #60a5fa; font-size: .95rem; margin-top: .25rem; word-break: break-all; }

  /* Overall */
  .overall { display: flex; align-items: center; gap: 1.5rem; padding: 1.5rem 2rem; background: #1e293b; border-bottom: 1px solid #334155; }
  .overall-label { font-size: 2.5rem; font-weight: 800; }
  .overall-text h2 { font-size: 1.1rem; font-weight: 600; }
  .overall-text p { font-size: .85rem; color: #94a3b8; }

  /* Score grid */
  .score-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; padding: 1.5rem 2rem; background: #1e293b; border-bottom: 1px solid #334155; }
  .score-ring { position: relative; display: flex; flex-direction: column; align-items: center; gap: .5rem; }
  .ring-label { text-align: center; }
  .ring-score { display: block; font-size: 1.1rem; font-weight: 700; }
  .ring-name { display: block; font-size: .7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; }

  /* Main layout */
  .main { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; padding: 1.5rem 2rem; }
  @media (max-width: 900px) { .main { grid-template-columns: 1fr; } }

  /* Cards */
  .card { background: #1e293b; border: 1px solid #334155; border-radius: .75rem; overflow: hidden; }
  .card.full { grid-column: 1 / -1; }
  .card-header { padding: .875rem 1.25rem; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; }
  .card-header h3 { font-size: .95rem; font-weight: 600; display: flex; align-items: center; gap: .5rem; }
  .card-header .icon { font-size: 1.1rem; }
  .card-body { padding: 1.25rem; }
  .card-body p { font-size: .85rem; line-height: 1.6; color: #cbd5e1; }

  /* Badge */
  .badge { display: inline-block; padding: .2rem .6rem; border-radius: 999px; font-size: .75rem; font-weight: 600; color: #fff; }

  /* Metrics table */
  .metric-row { display: flex; justify-content: space-between; align-items: center; padding: .4rem 0; border-bottom: 1px solid #0f172a; font-size: .85rem; }
  .metric-row:last-child { border-bottom: none; }
  .metric-label { color: #94a3b8; }
  .metric-value { font-weight: 600; color: #f1f5f9; }

  /* Lists */
  ul { list-style: none; display: flex; flex-direction: column; gap: .5rem; }
  li { padding: .5rem .75rem; background: #0f172a; border-radius: .375rem; font-size: .82rem; color: #cbd5e1; border-left: 3px solid #334155; }
  .ok { color: #22c55e; font-size: .85rem; }

  /* Violation badge */
  .violation { padding: .5rem .75rem; background: #0f172a; border-radius: .375rem; margin-bottom: .5rem; }
  .violation-title { font-size: .82rem; font-weight: 600; margin-bottom: .2rem; }
  .violation-desc { font-size: .78rem; color: #94a3b8; }

  /* Lighthouse grid */
  .lh-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .lh-score { text-align: center; padding: .75rem; background: #0f172a; border-radius: .5rem; }
  .lh-score-num { font-size: 1.6rem; font-weight: 800; }
  .lh-score-label { font-size: .7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; margin-top: .2rem; }

  /* Screenshot */
  .screenshot-img { width: 100%; border-radius: .5rem; border: 1px solid #334155; }

  /* SEO tags */
  .tag-group { margin-bottom: .75rem; }
  .tag-group label { font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: #64748b; display: block; margin-bottom: .25rem; }
  .tag-value { font-size: .84rem; color: #e2e8f0; background: #0f172a; padding: .35rem .6rem; border-radius: .375rem; word-break: break-word; }
  .tag-missing { font-size: .84rem; color: #ef4444; font-style: italic; }

  /* Footer */
  .footer { text-align: center; padding: 1.5rem; color: #475569; font-size: .8rem; border-top: 1px solid #1e293b; margin-top: 1rem; }
</style>
</head>
<body>

<div class="header">
  <h1>🔍 Website Audit Report</h1>
  <div class="url"><a href="${url}" target="_blank">${url}</a></div>
  <div class="meta">Generated ${new Date(generatedAt).toLocaleString()} &nbsp;·&nbsp; ${title || '(no title)'}</div>
</div>

<div class="overall">
  <div class="overall-label" style="color:${scoreColor(overallScore)}">${overallScore ?? '—'}</div>
  <div class="overall-text">
    <h2>Overall Score</h2>
    <p>${scoreLabel(overallScore)} &nbsp;·&nbsp; Average across all audit categories</p>
  </div>
</div>

<div class="score-grid">
  ${scoreRing(scores.performanceScore, 'Performance')}
  ${scoreRing(scores.accessibilityScore, 'Accessibility')}
  ${scoreRing(scores.securityScore, 'Security')}
  ${scoreRing(scores.brokenLinksScore, 'Links')}
  ${scoreRing(lighthouse?.scores?.performance ?? null, 'LH Perf')}
  ${scoreRing(lighthouse?.scores?.accessibility ?? null, 'LH A11y')}
  ${scoreRing(lighthouse?.scores?.bestPractices ?? null, 'LH Best')}
  ${scoreRing(lighthouse?.scores?.seo ?? null, 'LH SEO')}
</div>

<div class="main">

  <!-- Performance -->
  <div class="card">
    <div class="card-header">
      <h3><span class="icon">⚡</span> Performance</h3>
      ${badge(scoreLabel(scores.performanceScore), scoreColor(scores.performanceScore))}
    </div>
    <div class="card-body">
      ${performance && !performance.error ? `
      <div class="metric-row"><span class="metric-label">Time to First Byte</span><span class="metric-value" style="color:${scoreColor(performance.ttfb < 600 ? 100 : performance.ttfb < 1500 ? 70 : 30)}">${performance.ttfb ?? 'n/a'} ms</span></div>
      <div class="metric-row"><span class="metric-label">DOM Ready</span><span class="metric-value">${performance.domReady ?? 'n/a'} ms</span></div>
      <div class="metric-row"><span class="metric-label">Load Complete</span><span class="metric-value">${performance.loadComplete ?? 'n/a (SPA)'} ${performance.loadComplete ? 'ms' : ''}</span></div>
      <div class="metric-row"><span class="metric-label">Resources Loaded</span><span class="metric-value">${performance.resourceCount ?? 'n/a'}</span></div>
      <div class="metric-row"><span class="metric-label">Transfer Size</span><span class="metric-value">${performance.transferSize ? (performance.transferSize / 1024).toFixed(1) + ' KB' : 'n/a'}</span></div>
      ` : `<p style="color:#ef4444">${performance?.error || 'Unavailable'}</p>`}
    </div>
  </div>

  <!-- Lighthouse -->
  <div class="card">
    <div class="card-header">
      <h3><span class="icon">🏠</span> Lighthouse</h3>
      ${badge(lighthouse?.error ? 'Error' : 'Core Web Vitals', lighthouse?.error ? '#ef4444' : '#6366f1')}
    </div>
    <div class="card-body">
      ${lighthouse && !lighthouse.error ? `
      <div class="lh-grid" style="margin-bottom:1rem">
        <div class="lh-score"><div class="lh-score-num" style="color:${scoreColor(lighthouse.scores.performance)}">${lighthouse.scores.performance}</div><div class="lh-score-label">Performance</div></div>
        <div class="lh-score"><div class="lh-score-num" style="color:${scoreColor(lighthouse.scores.accessibility)}">${lighthouse.scores.accessibility}</div><div class="lh-score-label">Accessibility</div></div>
        <div class="lh-score"><div class="lh-score-num" style="color:${scoreColor(lighthouse.scores.bestPractices)}">${lighthouse.scores.bestPractices}</div><div class="lh-score-label">Best Practices</div></div>
        <div class="lh-score"><div class="lh-score-num" style="color:${scoreColor(lighthouse.scores.seo)}">${lighthouse.scores.seo}</div><div class="lh-score-label">SEO</div></div>
      </div>
      <div class="metric-row"><span class="metric-label">First Contentful Paint</span><span class="metric-value">${lighthouse.metrics.firstContentfulPaint}</span></div>
      <div class="metric-row"><span class="metric-label">Largest Contentful Paint</span><span class="metric-value">${lighthouse.metrics.largestContentfulPaint}</span></div>
      <div class="metric-row"><span class="metric-label">Total Blocking Time</span><span class="metric-value">${lighthouse.metrics.totalBlockingTime}</span></div>
      <div class="metric-row"><span class="metric-label">Cumulative Layout Shift</span><span class="metric-value">${lighthouse.metrics.cumulativeLayoutShift}</span></div>
      <div class="metric-row"><span class="metric-label">Speed Index</span><span class="metric-value">${lighthouse.metrics.speedIndex}</span></div>
      <div class="metric-row"><span class="metric-label">Time to Interactive</span><span class="metric-value">${lighthouse.metrics.interactive}</span></div>
      ` : `<p style="color:#ef4444">${lighthouse?.error || 'Unavailable'}</p>`}
    </div>
  </div>

  <!-- Accessibility -->
  <div class="card">
    <div class="card-header">
      <h3><span class="icon">♿</span> Accessibility</h3>
      ${badge(`${accessibility?.violationCount ?? 0} violations`, accessibility?.violationCount === 0 ? '#22c55e' : accessibility?.violationCount < 5 ? '#f59e0b' : '#ef4444')}
    </div>
    <div class="card-body">
      ${accessibility && !accessibility.error ? (
        accessibility.violations?.length > 0
            ? accessibility.violations.map(v => `
              <div class="violation">
                <div class="violation-title" style="color:${impactColor(v.impact)}">[${v.impact?.toUpperCase()}] ${v.id} <span style="color:#64748b;font-weight:400">(${v.nodes} element${v.nodes !== 1 ? 's' : ''})</span></div>
                <div class="violation-desc">${v.description}</div>
              </div>`).join('')
            : '<p class="ok">✓ No violations found</p>'
      ) : `<p style="color:#ef4444">${accessibility?.error || 'Unavailable'}</p>`}
    </div>
  </div>

  <!-- Security -->
  <div class="card">
    <div class="card-header">
      <h3><span class="icon">🔒</span> Security Headers</h3>
      ${badge(scoreLabel(scores.securityScore), scoreColor(scores.securityScore))}
    </div>
    <div class="card-body">
      ${security && !security.error ? `
      <p style="font-size:.8rem;color:#94a3b8;margin-bottom:.75rem">Checked against OWASP recommended headers</p>
      ${Object.entries(security.presentHeaders || {}).map(([k, v]) => `
        <div class="metric-row">
          <span class="metric-label" style="color:#22c55e">✓ ${k}</span>
          <span class="metric-value" style="font-size:.75rem;color:#64748b;max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${v}">${v}</span>
        </div>`).join('')}
      ${(security.missingHeaders || []).map(h => `
        <div class="metric-row">
          <span class="metric-label" style="color:#ef4444">✗ ${h}</span>
          <span class="metric-value" style="color:#ef4444;font-size:.75rem">Missing</span>
        </div>`).join('')}
      ` : `<p style="color:#ef4444">${security?.error || 'Unavailable'}</p>`}
    </div>
  </div>

  <!-- Broken Links -->
  <div class="card">
    <div class="card-header">
      <h3><span class="icon">🔗</span> Broken Links</h3>
      ${badge(`${brokenLinks?.brokenCount ?? 0} broken / ${brokenLinks?.totalChecked ?? 0} checked`, brokenLinks?.brokenCount === 0 ? '#22c55e' : '#ef4444')}
    </div>
    <div class="card-body">
      ${brokenLinks && !brokenLinks.error
        ? brokenLinks.brokenLinks?.length > 0
            ? renderList(brokenLinks.brokenLinks.map(l => `[${l.status}] ${l.link}`), '#ef4444')
            : '<p class="ok">✓ All links are working</p>'
        : `<p style="color:#ef4444">${brokenLinks?.error || 'Unavailable'}</p>`}
    </div>
  </div>

  <!-- SEO & Content -->
  <div class="card">
    <div class="card-header">
      <h3><span class="icon">📈</span> SEO & Content</h3>
      ${badge(seo?.aiAnalysis?.contentQuality || (seo?.error ? 'Error' : 'Analysed'), seo?.aiAnalysis?.contentQuality === 'Good' ? '#22c55e' : seo?.aiAnalysis?.contentQuality === 'Fair' ? '#f59e0b' : '#ef4444')}
    </div>
    <div class="card-body">
      ${seo && !seo.error ? `
      <div class="tag-group"><label>Title</label><div class="${seo.extracted.title ? 'tag-value' : 'tag-missing'}">${seo.extracted.title || 'Missing'}</div></div>
      <div class="tag-group"><label>Meta Description</label><div class="${seo.extracted.metaDescription ? 'tag-value' : 'tag-missing'}">${seo.extracted.metaDescription || 'Missing'}</div></div>
      <div class="tag-group"><label>Canonical</label><div class="${seo.extracted.canonical ? 'tag-value' : 'tag-missing'}">${seo.extracted.canonical || 'Missing'}</div></div>
      <div class="metric-row"><span class="metric-label">H1 tags</span><span class="metric-value">${seo.extracted.headings?.h1?.length ?? 0}</span></div>
      <div class="metric-row"><span class="metric-label">H2 tags</span><span class="metric-value">${seo.extracted.headings?.h2?.length ?? 0}</span></div>
      <div class="metric-row"><span class="metric-label">Word Count</span><span class="metric-value">${seo.extracted.wordCount}</span></div>
      <div class="metric-row"><span class="metric-label">Images missing alt</span><span class="metric-value" style="color:${seo.extracted.images?.missingAlt > 0 ? '#ef4444' : '#22c55e'}">${seo.extracted.images?.missingAlt} / ${seo.extracted.images?.total}</span></div>
      <div class="metric-row"><span class="metric-label">OG Image</span><span class="metric-value" style="color:${seo.extracted.ogImage ? '#22c55e' : '#ef4444'}">${seo.extracted.ogImage ? '✓ Present' : '✗ Missing'}</span></div>
      ${seo.aiAnalysis ? `
      <div style="margin-top:1rem;padding:.75rem;background:#0f172a;border-radius:.5rem;font-size:.83rem;color:#94a3b8;line-height:1.6">
        ${seo.aiAnalysis.summary || ''}
      </div>
      ${seo.aiAnalysis.recommendations?.length ? `<div style="margin-top:.75rem"><p style="font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:.5rem">Recommendations</p>${renderList(seo.aiAnalysis.recommendations, '#6366f1')}</div>` : ''}
      ` : ''}
      ` : `<p style="color:#ef4444">${seo?.error || 'Unavailable'}</p>`}
    </div>
  </div>

  <!-- Visual Analysis -->
  <div class="card">
    <div class="card-header">
      <h3><span class="icon">👁️</span> Visual Analysis</h3>
      ${badge(visualAnalysis?.layoutScore !== undefined ? `Layout ${visualAnalysis.layoutScore}/100` : (visualAnalysis?.error ? 'Error' : 'Analysed'), scoreColor(visualAnalysis?.layoutScore))}
    </div>
    <div class="card-body">
      ${visualAnalysis && !visualAnalysis.error ? `
      ${visualAnalysis.summary ? `<div style="padding:.75rem;background:#0f172a;border-radius:.5rem;font-size:.83rem;color:#94a3b8;line-height:1.6;margin-bottom:1rem">${visualAnalysis.summary}</div>` : ''}
      ${visualAnalysis.contrastIssues?.length ? `<div style="margin-bottom:.75rem"><p style="font-size:.75rem;color:#ef4444;margin-bottom:.4rem">Contrast Issues</p>${renderList(visualAnalysis.contrastIssues, '#ef4444')}</div>` : '<p class="ok" style="margin-bottom:.5rem">✓ No contrast issues</p>'}
      ${visualAnalysis.layoutIssues?.length ? `<div style="margin-bottom:.75rem"><p style="font-size:.75rem;color:#f59e0b;margin-bottom:.4rem">Layout Issues</p>${renderList(visualAnalysis.layoutIssues, '#f59e0b')}</div>` : '<p class="ok" style="margin-bottom:.5rem">✓ No layout issues</p>'}
      ${visualAnalysis.uiAnomalies?.length ? `<div style="margin-bottom:.75rem"><p style="font-size:.75rem;color:#f97316;margin-bottom:.4rem">UI Anomalies</p>${renderList(visualAnalysis.uiAnomalies, '#f97316')}</div>` : ''}
      ${visualAnalysis.recommendations?.length ? `<div style="margin-top:.75rem"><p style="font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:.5rem">Recommendations</p>${renderList(visualAnalysis.recommendations, '#6366f1')}</div>` : ''}
      ` : `<p style="color:#ef4444">${visualAnalysis?.error || 'Unavailable'}</p>`}
    </div>
  </div>

  <!-- Screenshot -->
  <div class="card full">
    <div class="card-header">
      <h3><span class="icon">📸</span> Screenshot</h3>
      ${badge(screenshot?.success ? 'Captured' : 'Failed', screenshot?.success ? '#22c55e' : '#ef4444')}
    </div>
    <div class="card-body">
      ${screenshotBase64
        ? `<img class="screenshot-img" src="data:image/png;base64,${screenshotBase64}" alt="Page screenshot"/>`
        : '<p style="color:#ef4444">Screenshot not available</p>'}
    </div>
  </div>

</div>

<div class="footer">
  Generated by Website Audit Tool &nbsp;·&nbsp; ${new Date(generatedAt).toLocaleString()}
</div>

</body>
</html>`;

    return html;
}

function saveDashboard(report, outputPath) {
    const html = generateDashboard(report);
    fs.writeFileSync(outputPath, html, 'utf8');
    return outputPath;
}

module.exports = { saveDashboard };
