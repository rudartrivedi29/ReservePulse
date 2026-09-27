import React, { useState } from 'react';

interface TierDetail {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  icon: string;
  port?: string;
  tech: string[];
  folders: { path: string; desc: string }[];
  highlight: string;
}

const TIERS: TierDetail[] = [
  {
    id: 'frontend',
    name: 'Frontend Presentation Tier',
    subtitle: 'Modular SPA Engine with React 19, TypeScript & Vite',
    badge: 'Port 5173',
    icon: '⚡',
    port: 'http://localhost:5173',
    tech: ['React 19', 'TypeScript', 'Vite 8', 'Vanilla CSS Tokens'],
    folders: [
      { path: 'src/components', desc: 'Reusable UI building blocks' },
      { path: 'src/pages', desc: 'Top-level routed view screens' },
      { path: 'src/layouts', desc: 'Application shells & navigation frames' },
      { path: 'src/hooks', desc: 'Stateful logic & data query hooks' },
      { path: 'src/services', desc: 'HTTP client & API contract bridges' },
      { path: 'src/store', desc: 'Foundation global state context' },
      { path: 'src/utils', desc: 'Constants, formatting, & pure helpers' },
      { path: 'src/types', desc: 'Strict TypeScript interfaces & DTOs' },
      { path: 'src/assets', desc: 'Static SVG icons & media' },
    ],
    highlight: 'Decoupled build pipeline that compiles independently in <400ms.',
  },
  {
    id: 'backend',
    name: 'Backend REST API Core',
    subtitle: 'Layered Express TypeScript Service with Graceful Shutdown',
    badge: 'Port 5000',
    icon: '🛡️',
    port: 'http://localhost:5000',
    tech: ['Node.js 24', 'Express 4', 'TypeScript', 'tsx Hot-Reload'],
    folders: [
      { path: 'src/config', desc: 'Environment & connection settings' },
      { path: 'src/controllers', desc: 'HTTP request & response handlers' },
      { path: 'src/middleware', desc: 'Logging, CORS, helmet & error filters' },
      { path: 'src/models', desc: 'Entity contracts & data schemas' },
      { path: 'src/routes', desc: 'Express API route definitions' },
      { path: 'src/services', desc: 'Core orchestration business logic' },
      { path: 'src/utils', desc: 'Winston-style logger & response envelopes' },
      { path: 'src/validators', desc: 'Input validation rules & schemas' },
    ],
    highlight: 'Standardized JSON envelope responses with SIGTERM graceful lifecycle.',
  },
  {
    id: 'database',
    name: 'Resilient Data Tier',
    subtitle: 'Version-Controlled SQL Migrations & Deterministic Seeds',
    badge: 'PostgreSQL Ready',
    icon: '🗄️',
    tech: ['PostgreSQL', 'SQL Migrations', 'Idempotent DDL', 'Seed Fixtures'],
    folders: [
      { path: 'migrations/001_initial_schema.sql', desc: 'Users & audit logging tables' },
      { path: 'migrations/README.md', desc: 'Migration conventions & rollback rules' },
      { path: 'seed/seed.sql', desc: 'Default system users & audit events' },
      { path: 'seed/README.md', desc: 'Development seed instructions' },
    ],
    highlight: 'Ensures reproducible schema deployment and migration tracking.',
  },
];

export const ArchitectureExplorer: React.FC = () => {
  const [activeTierId, setActiveTierId] = useState<string>('frontend');
  const activeTier = TIERS.find(t => t.id === activeTierId) || TIERS[0];

  return (
    <section className="architecture-section" id="architecture">
      <div className="section-head">
        <span className="section-kicker">Foundation Architecture</span>
        <h2 className="section-heading">Decoupled Three-Tier Topology</h2>
        <p className="section-subtext">
          Engineered for strict separation of concerns, independent testing, and zero-conflict scalability.
        </p>
      </div>

      {/* Tier Selector Pills */}
      <div className="tier-pills-bar">
        {TIERS.map((tier) => (
          <button
            key={tier.id}
            type="button"
            className={`tier-pill ${activeTierId === tier.id ? 'active' : ''}`}
            onClick={() => setActiveTierId(tier.id)}
          >
            <span className="tier-pill-icon">{tier.icon}</span>
            <span className="tier-pill-name">{tier.name.split(' ')[0]} Tier</span>
            <span className="tier-pill-badge">{tier.badge}</span>
          </button>
        ))}
      </div>

      {/* Detail Glass Card */}
      <div className="tier-detail-card">
        <div className="tier-detail-header">
          <div className="tier-title-cluster">
            <span className="tier-main-icon">{activeTier.icon}</span>
            <div>
              <h3 className="tier-detail-title">{activeTier.name}</h3>
              <p className="tier-detail-subtitle">{activeTier.subtitle}</p>
            </div>
          </div>

          <div className="tier-tech-chips">
            {activeTier.tech.map((t) => (
              <span key={t} className="tech-chip-item">{t}</span>
            ))}
          </div>
        </div>

        {/* Highlight Callout */}
        <div className="tier-highlight-bar">
          <span className="highlight-spark">✦</span>
          <span>{activeTier.highlight}</span>
        </div>

        {/* Folder Directory Explorer */}
        <div className="tier-folders-container">
          <h4 className="folders-header-title">Configured Sub-Module Structure</h4>
          <div className="folders-grid">
            {activeTier.folders.map((f) => (
              <div key={f.path} className="folder-entry-item">
                <div className="folder-path-row">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <code>{f.path}</code>
                </div>
                <span className="folder-desc">{f.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
