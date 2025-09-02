// Simple development server that serves both API and frontend
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Enable CORS for development
app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/vendors', (req, res) => {
  res.json([
    { id: "v-plumbfast", name: "PlumbFast Co.", category: "Plumbing" },
    { id: "v-hvacpro", name: "HVAC Pro Team", category: "HVAC" }
  ]);
});

app.get('/api/analytics/kpis', (req, res) => {
  res.json({
    occupancyPct: 92,
    avgRent: 2145,
    capRate: 6.1,
    ttmNOI: 832000,
    slaHitPct: 86,
    avgResponseHrs: 2.8,
    costPerWO: 487,
    compliancePct: 78,
    backlog7: 9,
    backlog30: 3
  });
});

// Serve static files from the web app
app.use(express.static(path.join(__dirname, 'apps/web')));

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'apps/web', 'index.html'));
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ Your UI should now be accessible!`);
});