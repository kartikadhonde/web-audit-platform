// Aggregate all worker results into a single weighted score

const WEIGHTS = {
  seo:           0.20,
  visual:        0.10,
  performance:   0.25,
  accessibility: 0.20,
  security:      0.15,
  links:         0.10,
}

function aggregate(workers) {
  let weightedSum = 0
  let totalWeight = 0

  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const worker = workers[key]
    if (worker && typeof worker.score === 'number') {
      weightedSum += worker.score * weight
      totalWeight += weight
    }
  }

  const overallScore = totalWeight > 0
    ? Math.round(weightedSum / totalWeight)
    : 0

  return {
    overallScore,
    status: overallScore >= 70 ? 'PASS' : 'FAIL',
    scannedAt: new Date().toISOString(),
    workers,
  }
}

module.exports = { aggregate }
