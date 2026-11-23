// A small multi-tenant project API used as the system under test.
//
// It runs in two modes:
//   - "vulnerable": the build as first reviewed, with three access-control findings
//   - "fixed":      the same build after the fixes, used for the follow-up retest
//
// The findings are documented in /findings and covered by tests in /tests.

const crypto = require('crypto');
const path = require('path');
const express = require('express');

function seedUsers() {
  return {
    alice: { id: 'u1', username: 'alice', password: 'alice-pass', tenant: 'acme', role: 'admin' },
    bob: { id: 'u2', username: 'bob', password: 'bob-pass', tenant: 'acme', role: 'member' },
    carol: { id: 'u3', username: 'carol', password: 'carol-pass', tenant: 'globex', role: 'admin' },
  };
}

function seedProjects() {
  return [
    { id: 'p1', tenant: 'acme', name: 'Acme Payroll' },
    { id: 'p2', tenant: 'acme', name: 'Acme Website' },
    { id: 'p3', tenant: 'globex', name: 'Globex Product Roadmap' },
  ];
}

function publicUser(user) {
  const { password, ...rest } = user;
  return rest;
}

function createApp({ fixed = false } = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public'))); // the web UI at /

  let users = seedUsers();
  let projects = seedProjects();
  let nextProjectId = 4;
  const tokens = new Map(); // token -> username

  app.get('/health', (req, res) => res.json({ status: 'ok', mode: fixed ? 'fixed' : 'vulnerable' }));

  // Test-only endpoint: restores the seed data so every test starts from the same state.
  app.post('/__test/reset', (req, res) => {
    users = seedUsers();
    projects = seedProjects();
    nextProjectId = 4;
    tokens.clear();
    res.status(204).end();
  });

  app.post('/login', (req, res) => {
    const { username, password } = req.body || {};
    const user = users[username];
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    const token = crypto.randomBytes(16).toString('hex');
    tokens.set(token, user.username);
    res.json({ token });
  });

  function authenticate(req, res, next) {
    const header = req.get('authorization') || '';
    const match = header.match(/^Bearer (\S+)$/);
    const username = match && tokens.get(match[1]);
    if (!username) return res.status(401).json({ error: 'unauthorized' });
    req.user = users[username];
    next();
  }

  app.get('/me', authenticate, (req, res) => res.json(publicUser(req.user)));

  app.get('/tenants/:tenant/projects', authenticate, (req, res) => {
    if (req.user.tenant !== req.params.tenant) return res.status(403).json({ error: 'forbidden' });
    res.json(projects.filter((p) => p.tenant === req.params.tenant));
  });

  app.post('/tenants/:tenant/projects', authenticate, (req, res) => {
    if (req.user.tenant !== req.params.tenant) return res.status(403).json({ error: 'forbidden' });
    const name = (req.body && req.body.name) || '';
    if (!name.trim()) return res.status(400).json({ error: 'name_required' });
    const project = { id: `p${nextProjectId++}`, tenant: req.params.tenant, name: name.trim() };
    projects.push(project);
    res.status(201).json(project);
  });

  // FINDING-001: the vulnerable build looks the project up by ID only and never checks the tenant.
  app.get('/projects/:id', authenticate, (req, res) => {
    const project = projects.find((p) => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'not_found' });
    if (fixed && project.tenant !== req.user.tenant) return res.status(404).json({ error: 'not_found' });
    res.json(project);
  });

  // FINDING-002: the vulnerable build lets any member of the tenant delete a project.
  app.delete('/projects/:id', authenticate, (req, res) => {
    const project = projects.find((p) => p.id === req.params.id);
    if (!project || project.tenant !== req.user.tenant) return res.status(404).json({ error: 'not_found' });
    if (fixed && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    projects = projects.filter((p) => p.id !== project.id);
    res.status(204).end();
  });

  // FINDING-003: the vulnerable build lets a member change roles, including their own.
  app.patch('/users/:id/role', authenticate, (req, res) => {
    const target = Object.values(users).find((u) => u.id === req.params.id);
    if (!target || target.tenant !== req.user.tenant) return res.status(404).json({ error: 'not_found' });
    if (fixed && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    const role = req.body && req.body.role;
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'invalid_role' });
    target.role = role;
    res.json(publicUser(target));
  });

  return app;
}

module.exports = { createApp };
