#!/usr/bin/env node
const baseUrl = (process.env.QA_BASE_URL || process.argv[2] || 'http://100.85.92.106:5173').replace(/\/$/, '');

const routes = [
  { path: '/', expectHtml: true, label: 'root redirect/fallback' },
  { path: '/discover', expectHtml: true, label: 'Discover' },
  { path: '/search?q=godfather', expectHtml: true, label: 'Search query deep link' },
  { path: '/search?q=harry%20potter', expectHtml: true, label: 'Search collection-ish query deep link' },
  { path: '/search?q=james%20bond', expectHtml: true, label: 'Search franchise query deep link' },
  { path: '/settings/profile', expectHtml: true, label: 'Settings profile deep link' },
  { path: '/settings/maturity', expectHtml: true, label: 'Settings maturity deep link' },
  { path: '/settings/lists', expectHtml: true, label: 'Settings lists deep link' },
  { path: '/lists/bad-id', expectHtml: true, label: 'Missing list recovery route' },
  { path: '/movies.json', expectJson: true, label: 'movie catalog runtime data' },
];

function routeUrl(path) {
  return `${baseUrl}${path}`;
}

async function checkRoute(route) {
  const response = await fetch(routeUrl(route.path), { redirect: 'follow' });
  const contentType = response.headers.get('content-type') || '';
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  if (route.expectHtml) {
    if (!contentType.includes('text/html')) {
      throw new Error(`expected HTML, got ${contentType || 'unknown content type'}`);
    }
    if (!body.includes('<div id="app"')) {
      throw new Error('HTML shell is missing #app mount point');
    }
    if (!body.includes('/assets/') && !body.includes('/src/main.js')) {
      throw new Error('HTML shell is missing built/Vite or dev asset references');
    }
  }

  if (route.expectJson) {
    if (!contentType.includes('application/json')) {
      throw new Error(`expected JSON, got ${contentType || 'unknown content type'}`);
    }
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (error) {
      throw new Error(`invalid JSON: ${error.message}`);
    }
    if (!Array.isArray(parsed.movies) || parsed.movies.length === 0) {
      throw new Error('movies.json has no movies array');
    }
  }
}

let failed = 0;

for (const route of routes) {
  try {
    await checkRoute(route);
    console.log(`✓ ${route.label}: ${route.path}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${route.label}: ${route.path}`);
    console.error(`  ${error.message}`);
  }
}

if (failed) {
  console.error(`\n${failed} dev route smoke check(s) failed against ${baseUrl}.`);
  process.exit(1);
}

console.log(`\nDev route smoke checks passed against ${baseUrl}.`);
