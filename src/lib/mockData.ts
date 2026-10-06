export function generateTradeMetrics() {
  return {
    activeBuyers: Math.floor(120 + Math.random() * 30),
    shipmentsInTransit: Math.floor(8 + Math.random() * 5),
    complianceAlerts: Math.floor(Math.random() * 4),
    avgTransitDays: (12 + Math.random() * 3).toFixed(1),
    lastUpdatedAt: new Date()
  }
}
