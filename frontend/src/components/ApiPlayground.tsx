import React, { useState } from 'react';

interface EndpointOption {
  method: 'GET';
  path: string;
  description: string;
}

const AVAILABLE_ENDPOINTS: EndpointOption[] = [
  {
    method: 'GET',
    path: '/api/v1/health',
    description: 'Comprehensive system heartbeat, uptime stats, & database check',
  },
  {
    method: 'GET',
    path: '/api/v1/health/ping',
    description: 'Ultra-fast liveness probe for container orchestrators & load balancers',
  },
  {
    method: 'GET',
    path: '/',
    description: 'Root service discovery and API version descriptor',
  },
];

export const ApiPlayground: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointOption>(AVAILABLE_ENDPOINTS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseLatency, setResponseLatency] = useState<number | null>(null);
  const [responseBody, setResponseBody] = useState<unknown | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const executeRequest = async (ep: EndpointOption) => {
    setIsLoading(true);
    setErrorMsg(null);
    const start = performance.now();
    const baseUrl = 'http://localhost:5000';

    try {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        headers: { Accept: 'application/json' },
      });
      const latency = Math.round(performance.now() - start);
      const data = await res.json();
      setResponseStatus(res.status);
      setResponseLatency(latency);
      setResponseBody(data);
    } catch (err: unknown) {
      setResponseStatus(0);
      setResponseLatency(Math.round(performance.now() - start));
      setResponseBody(null);
      setErrorMsg(err instanceof Error ? err.message : 'Connection failed to backend');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="api-playground-section" id="playground">
      <div className="section-head">
        <span className="section-kicker">Developer Console</span>
        <h2 className="section-heading">Interactive API Playground</h2>
        <p className="section-subtext">
          Dispatch live HTTP probes directly to the backend Express server and inspect response payloads.
        </p>
      </div>

      <div className="playground-glass-card">
        {/* Endpoint Selector Buttons */}
        <div className="endpoint-selector-tabs">
          {AVAILABLE_ENDPOINTS.map((ep) => (
            <button
              key={ep.path}
              type="button"
              className={`endpoint-tab-btn ${selectedEndpoint.path === ep.path ? 'active' : ''}`}
              onClick={() => {
                setSelectedEndpoint(ep);
                executeRequest(ep);
              }}
            >
              <span className="http-tag get">{ep.method}</span>
              <span className="endpoint-path">{ep.path}</span>
            </button>
          ))}
        </div>

        {/* Action & URL Bar */}
        <div className="request-bar-box">
          <div className="url-display">
            <span className="base-url">http://localhost:5000</span>
            <span className="active-path">{selectedEndpoint.path}</span>
          </div>

          <button
            type="button"
            className="btn-send-request"
            onClick={() => executeRequest(selectedEndpoint)}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-mini" /> Sending...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Send Request
              </>
            )}
          </button>
        </div>

        <p className="endpoint-explainer">{selectedEndpoint.description}</p>

        {/* Live Response Panel */}
        <div className="response-panel">
          <div className="response-panel-header">
            <div className="response-meta-left">
              <span className="panel-label">HTTP Response</span>
              {responseStatus !== null && (
                <span className={`status-pill ${responseStatus === 200 ? 'status-200' : 'status-err'}`}>
                  {responseStatus === 0 ? 'Network Error' : `${responseStatus} OK`}
                </span>
              )}
            </div>

            {responseLatency !== null && (
              <span className="latency-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {responseLatency} ms
              </span>
            )}
          </div>

          <div className="response-body-box">
            {isLoading ? (
              <div className="response-loading-state">
                <div className="loader-pulse" />
                <span>Executing request to Express backend...</span>
              </div>
            ) : errorMsg ? (
              <div className="response-error-state">
                <span>⚠️ {errorMsg}</span>
                <p>Verify that your backend process is running on port 5000 (`npm run dev:backend`).</p>
              </div>
            ) : responseBody ? (
              <pre className="json-output">
                <code>{JSON.stringify(responseBody, null, 2)}</code>
              </pre>
            ) : (
              <div className="response-empty-state">
                <span>Click "Send Request" to test this endpoint.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
