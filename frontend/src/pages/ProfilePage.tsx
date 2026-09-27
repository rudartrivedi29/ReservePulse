import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Input,
  Select,
  useToast,
} from '../components/ui';

export const ProfilePage: React.FC = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [organization, setOrganization] = useState(user.organization);
  const [timezone, setTimezone] = useState('America/New_York');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Profile Updated', 'Your identity preferences have been saved.');
  };

  return (
    <div className="space-y-6 font-sans max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          User Profile &amp; Preferences
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your personal reservation credentials and notification channels.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Profile Overview */}
        <div className="md:col-span-4">
          <Card variant="glass">
            <CardContent className="flex flex-col items-center text-center pt-6 space-y-3">
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-emerald-500/20 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center text-white text-[10px] font-bold">
                  ✓
                </span>
              </div>

              <div>
                <h3 className="font-bold text-base text-slate-900">{user.name}</h3>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>

              <Badge variant="purple" size="sm" dot>
                {role.toUpperCase()} ROLE
              </Badge>

              <div className="w-full pt-3 border-t border-slate-100 text-left text-xs space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Organization:</span>
                  <span className="font-medium text-slate-800">{user.organization}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Account Status:</span>
                  <span className="font-semibold text-emerald-600">Active</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Form Details */}
        <div className="md:col-span-8">
          <form onSubmit={handleSave}>
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your contact and timezone defaults</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Organization Unit"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                  />
                  <Select
                    label="Default Timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    options={[
                      { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
                      { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
                      { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
                      { value: 'Europe/London', label: 'London, Edinburgh' },
                      { value: 'Asia/Tokyo', label: 'Tokyo, Osaka' },
                    ]}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3">
                <Button variant="ghost" size="sm" type="button" onClick={() => setName(user.name)}>
                  Reset
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
};
