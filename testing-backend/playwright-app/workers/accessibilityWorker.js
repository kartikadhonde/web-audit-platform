const { AxeBuilder } = require('@axe-core/playwright');

async function accessibilityWorker(page) {
    try {
        const results = await new AxeBuilder({ page }).analyze();
        const violations = results.violations;
        return {
            type: 'accessibility',
            violationCount: violations.length,
            violations: violations.map(v => ({
                id: v.id,
                impact: v.impact,
                description: v.description,
                nodes: v.nodes.length,
            })),
        };
    } catch (err) {
        return { type: 'accessibility', error: err.message, violationCount: 0, violations: [] };
    }
}

module.exports = accessibilityWorker;
