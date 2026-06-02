function calculateScores(results) {
    const { accessibility, performance, security, brokenLinks } = results;

    // Accessibility score: start at 100, deduct per violation weighted by impact
    let accessibilityScore = 100;
    if (accessibility && !accessibility.error) {
        const impactPenalty = { critical: 15, serious: 10, moderate: 5, minor: 2 };
        for (const v of accessibility.violations || []) {
            accessibilityScore -= (impactPenalty[v.impact] || 3);
        }
    }
    accessibilityScore = Math.max(0, accessibilityScore);

    // Performance score: weighted composite of TTFB, domReady, and loadComplete.
    // Each metric measures a different phase of page load, so a single number
    // can't capture the full picture for modern SPAs and lazy-loading sites.
    //
    // Weights: TTFB 25% (server speed) | domReady 35% (parsing) | loadComplete 40% (full load)
    // If a metric is unavailable (e.g. SPA with no loadEventEnd), its weight is
    // redistributed proportionally to whichever metrics are present.
    let performanceScore = 100;
    if (performance && !performance.error) {

        const scoreForMetric = (value, thresholds) => {
            // thresholds: [ [maxMs, score], ... ] in ascending order of ms
            if (value === null || value === undefined) return null;
            for (const [limit, s] of thresholds) {
                if (value <= limit) return s;
            }
            return thresholds[thresholds.length - 1][1]; // worst tier
        };

        const ttfbThresholds     = [[200, 100], [500, 90], [1000, 75], [2000, 55], [Infinity, 30]];
        const domReadyThresholds = [[1000, 100], [2500, 88], [4000, 72], [6000, 55], [Infinity, 35]];
        const loadThresholds     = [[1500, 100], [3000, 88], [5000, 72], [8000, 55], [Infinity, 35]];

        const ttfbScore     = scoreForMetric(performance.ttfb,         ttfbThresholds);
        const domReadyScore = scoreForMetric(performance.domReady,      domReadyThresholds);
        const loadScore     = scoreForMetric(performance.loadComplete,  loadThresholds);

        // Build weighted average from only available (non-null) metrics
        const candidates = [
            { score: ttfbScore,     weight: 0.25 },
            { score: domReadyScore, weight: 0.35 },
            { score: loadScore,     weight: 0.40 },
        ].filter(c => c.score !== null);

        if (candidates.length > 0) {
            const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
            performanceScore = Math.round(
                candidates.reduce((s, c) => s + c.score * (c.weight / totalWeight), 0)
            );
        }
    }

    // Security score: each missing header deducts points
    let securityScore = 100;
    if (security && !security.error) {
        const missing = security.missingHeaders.length;
        securityScore = Math.max(0, 100 - missing * 15);
    }

    // Broken links penalty
    let brokenLinksScore = 100;
    if (brokenLinks && !brokenLinks.error) {
        brokenLinksScore = Math.max(0, 100 - brokenLinks.brokenCount * 10);
    }


    return {
        accessibilityScore,
        performanceScore,
        securityScore,
        brokenLinksScore,
    };
}

module.exports = { calculateScores };
