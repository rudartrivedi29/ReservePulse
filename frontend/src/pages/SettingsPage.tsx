import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Select,
  Badge,
  useToast,
} from '../components/ui';

export const SettingsPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'booking' | 'concurrency' | 'notifications'>('booking');

  const [lockTimeout, setLockTimeout] = useState('300');
  const [maxAdvanceDays, setMaxAdvanceDays] = useState('30');
  const [requireConfirmation, setRequireConfirmation] = useState(true);
  const [autoReleaseUnpaid, setAutoReleaseUnpaid] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Configuration Saved', 'System policies have been updated successfully.');
  };

  return (
    <div className="space-y-6 font-sans max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Platform &amp; Workspace Settings
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure reservation policies, concurrency lock timeouts, and operational rules.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-2 overflow-x-auto">
        {[
          { id: 'booking', label: 'Booking Rules' },
          { id: 'concurrency', label: 'Concurrency Engine' },
          { id: 'general', label: 'General Info' },
          { id: 'notifications', label: 'Notifications' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        {activeTab === 'booking' && (
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Reservation Policy Configuration</CardTitle>
              <CardDescription>Rules governing lead time, advance booking, and confirmation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Maximum Advance Booking Horizon"
                  value={maxAdvanceDays}
                  onChange={(e) => setMaxAdvanceDays(e.target.value)}
                  options={[
                    { value: '7', label: '7 Days in Advance' },
                    { value: '14', label: '14 Days in Advance' },
                    { value: '30', label: '30 Days in Advance (Recommended)' },
                    { value: '90', label: '90 Days in Advance' },
                  ]}
                  helperText="Limits how far in the future slots can be locked"
                />

                <Select
                  label="Cancellation Window Threshold"
                  defaultValue="24"
                  options={[
                    { value: '1', label: '1 Hour Prior' },
                    { value: '12', label: '12 Hours Prior' },
                    { value: '24', label: '24 Hours Prior (Standard)' },
                    { value: '48', label: '48 Hours Prior' },
                  ]}
                  helperText="Minimum notice required to release a slot without penalty"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireConfirmation}
                    onChange={(e) => setRequireConfirmation(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Require Organiser Manual Confirmation for VIP Resources
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoReleaseUnpaid}
                    onChange={(e) => setAutoReleaseUnpaid(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Automatically return unconfirmed reservation locks to pool upon timeout
                  </span>
                </label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button variant="primary" size="sm" type="submit">
                Save Booking Policies
              </Button>
            </CardFooter>
          </Card>
        )}

        {activeTab === 'concurrency' && (
          <Card variant="glass">
            <CardHeader>
              <div>
                <CardTitle>Concurrency Engine &amp; Lock Safeguards</CardTitle>
                <CardDescription>Configure distributed lock TTL and race condition mitigation</CardDescription>
              </div>
              <Badge variant="emerald" size="xs" dot pulseDot>
                ACID Enforced
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Lock Time-to-Live (TTL)"
                value={lockTimeout}
                onChange={(e) => setLockTimeout(e.target.value)}
                options={[
                  { value: '120', label: '2 Minutes (120 seconds)' },
                  { value: '300', label: '5 Minutes (300 seconds - Recommended)' },
                  { value: '600', label: '10 Minutes (600 seconds)' },
                ]}
                helperText="Hold window during user checkout before automatic release"
              />

              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-1.5">
                <div className="font-bold text-emerald-950">Active Protection Safeguards:</div>
                <div className="text-emerald-800">• Row-level lock acquisition on database slots</div>
                <div className="text-emerald-800">• Idempotent retry tokens for high-concurrency bursts</div>
                <div className="text-emerald-800">• Real-time heartbeat validation probe</div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button variant="primary" size="sm" type="submit">
                Update Lock Engine Parameters
              </Button>
            </CardFooter>
          </Card>
        )}

        {activeTab === 'general' && (
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Workspace Identity &amp; Domain</CardTitle>
              <CardDescription>Primary organization metadata and support channels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Workspace Display Name" defaultValue="ReservePulse Production Fleet" />
              <Input label="Support Escalation Email" defaultValue="ops@reservepulse.local" />
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button variant="primary" size="sm" type="submit">
                Save Workspace Info
              </Button>
            </CardFooter>
          </Card>
        )}

        {activeTab === 'notifications' && (
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>Configure webhook, email, and audit broadcast endpoints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Webhook Dispatch URL" placeholder="https://api.yourcompany.com/webhooks/reservepulse" />
              <div className="text-xs text-slate-500">
                Webhooks trigger on events: <code>booking.locked</code>, <code>booking.confirmed</code>, <code>booking.released</code>.
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button variant="primary" size="sm" type="submit">
                Save Notification Endpoints
              </Button>
            </CardFooter>
          </Card>
        )}
      </form>
    </div>
  );
};
