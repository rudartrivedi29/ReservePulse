import React, { useState } from 'react';
import type { ResourceSlot } from '../types';

const INITIAL_SLOTS: ResourceSlot[] = [
  {
    id: 'res-1',
    resourceName: 'Cluster Node Alpha (8x H100 Tensor)',
    category: 'Compute',
    capacity: '8 GPUs • 640GB VRAM',
    timeSlot: '14:00 - 16:00 UTC',
    status: 'available',
  },
  {
    id: 'res-2',
    resourceName: 'Executive Strategy Boardroom 4B',
    category: 'Workspace',
    capacity: '16 Seats • 4K Telepresence',
    timeSlot: '10:00 - 11:30 AM',
    status: 'available',
  },
  {
    id: 'res-3',
    resourceName: 'Rapid Medical Telehealth Pod C',
    category: 'Consultation',
    capacity: '1 Provider • 1 Patient Session',
    timeSlot: '15:30 - 16:00 PM',
    status: 'available',
  },
];

export const ReservationSimulator: React.FC = () => {
  const [slots, setSlots] = useState<ResourceSlot[]>(INITIAL_SLOTS);
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [recentLog, setRecentLog] = useState<string | null>(null);

  const handleLockSlot = (slot: ResourceSlot) => {
    if (slot.status !== 'available') {
      // Toggle back to available for interactive replay
      setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, status: 'available', reservedBy: undefined } : s));
      setRecentLog(`Unlocked "${slot.resourceName}". Slot is now available again.`);
      return;
    }

    setLockingId(slot.id);
    setRecentLog(`Acquiring distributed mutex lock on "${slot.resourceName}"...`);

    setTimeout(() => {
      setSlots(prev =>
        prev.map(s =>
          s.id === slot.id
            ? { ...s, status: 'locked', reservedBy: 'Local Developer Session' }
            : s
        )
      );
      setLockingId(null);
      setRecentLog(`✓ Optimistic lock validated. Zero collision detected for "${slot.resourceName}".`);
    }, 800);
  };

  return (
    <section className="simulator-section" id="simulator">
      <div className="section-head">
        <span className="section-kicker">Core Pipeline Engine</span>
        <h2 className="section-heading">Zero-Collision Reservation Simulation</h2>
        <p className="section-subtext">
          Interactive showcase of ReservePulse's concurrency-safe slot allocation and optimistic locking safeguards.
        </p>
      </div>

      <div className="simulator-glass-card">
        {/* Status Log Banner */}
        {recentLog && (
          <div className="simulator-log-banner">
            <span className="log-pulse-dot" />
            <span className="log-text">{recentLog}</span>
          </div>
        )}

        <div className="slots-grid">
          {slots.map((slot) => {
            const isLocking = lockingId === slot.id;
            const isLocked = slot.status === 'locked';

            return (
              <div key={slot.id} className={`slot-glass-item ${isLocked ? 'is-reserved' : ''}`}>
                <div className="slot-top-row">
                  <span className={`category-tag cat-${slot.category.toLowerCase()}`}>
                    {slot.category}
                  </span>
                  <span className={`slot-status-pill ${isLocked ? 'pill-locked' : 'pill-available'}`}>
                    <span className="dot-status" />
                    {isLocked ? 'Locked / Reserved' : 'Available'}
                  </span>
                </div>

                <h3 className="slot-resource-title">{slot.resourceName}</h3>
                <p className="slot-capacity-text">{slot.capacity}</p>

                <div className="slot-time-box">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{slot.timeSlot}</span>
                </div>

                <div className="slot-action-area">
                  <button
                    type="button"
                    className={`btn-lock-action ${isLocked ? 'btn-release' : 'btn-lock'}`}
                    onClick={() => handleLockSlot(slot)}
                    disabled={isLocking}
                  >
                    {isLocking ? (
                      <>
                        <span className="spinner-mini" /> Locking...
                      </>
                    ) : isLocked ? (
                      'Release Lock (Reset)'
                    ) : (
                      'Lock & Reserve Slot'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
