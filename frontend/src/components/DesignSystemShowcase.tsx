import React, { useState } from 'react';
import {
  Button,
  Input,
  Select,
  Modal,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  Spinner,
  SkeletonCard,
  SkeletonText,
  LoadingOverlay,
  ProgressBar,
  Calendar,
  useToast,
  type ModalSize,
  type EmptyStatePreset,
  type CalendarSlotStatus,
} from './ui';
import { tokens } from '../tokens';

export const DesignSystemShowcase: React.FC = () => {
  const { toast } = useToast();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    'all' | 'buttons-badges' | 'forms' | 'cards-modals' | 'table-empty' | 'calendar' | 'feedback' | 'tokens'
  >('all');

  // Button state
  const [isBtnLoading, setIsBtnLoading] = useState(false);

  // Input states
  const [sampleText, setSampleText] = useState('Workspace Unit Alpha');
  const [sampleError, setSampleError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('compute');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState<ModalSize>('md');

  // Table state
  const [tableDensity, setTableDensity] = useState<'compact' | 'normal' | 'spacious'>('normal');
  const [tableStriped, setTableStriped] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'slot' | 'status'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Empty state preset
  const [emptyPreset, setEmptyPreset] = useState<EmptyStatePreset>('no-reservations');

  // Loading overlay state
  const [isCardLoading, setIsCardLoading] = useState(false);
  const [progressVal, setProgressVal] = useState(65);

  // Calendar state
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Removable badge list
  const [activeTags, setActiveTags] = useState([
    'Instant Confirmation',
    'High Priority',
    'VIP Room',
    'Dedicated VLAN',
  ]);

  const removeTag = (tag: string) => {
    setActiveTags((prev) => prev.filter((t) => t !== tag));
    toast.info('Filter Tag Removed', `Tag "${tag}" was removed.`);
  };

  // Mock slot statuses for calendar days
  const getMockSlotStatus = (date: Date): CalendarSlotStatus => {
    const day = date.getDate();
    if (day % 7 === 0) return 'full';
    if (day % 3 === 0) return 'limited';
    if (day % 2 === 0) return 'available';
    return 'none';
  };

  // Sample table data
  const sampleReservations = [
    {
      id: 'res-801',
      resource: 'Executive Boardroom B',
      user: 'Sarah Jenkins',
      timeSlot: '09:00 AM - 10:30 AM',
      category: 'Workspace',
      status: 'confirmed',
    },
    {
      id: 'res-802',
      resource: 'GPU Cluster Node 04',
      user: 'DevOps Orchestrator',
      timeSlot: '11:00 AM - 01:00 PM',
      category: 'Compute',
      status: 'active',
    },
    {
      id: 'res-803',
      resource: 'Private Consultation Pod 2',
      user: 'Dr. Michael Chen',
      timeSlot: '02:00 PM - 03:00 PM',
      category: 'Consultation',
      status: 'pending',
    },
    {
      id: 'res-804',
      resource: 'Studio Lab Delta',
      user: 'Media Production',
      timeSlot: '03:30 PM - 05:00 PM',
      category: 'Workspace',
      status: 'locked',
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-10">
      {/* Design System Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 p-6 sm:p-10 text-white shadow-2xl border border-emerald-500/20">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ReservePulse Design System 1.0
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Frontend UI Primitives &amp; Design System
          </h2>
          <p className="text-emerald-100/80 text-sm sm:text-base leading-relaxed">
            A production-ready booking SaaS component system engineered with React, TypeScript, 
            Tailwind CSS, and emerald glassmorphic design tokens. Fully responsive and accessible.
          </p>

          {/* Quick Metrics */}
          <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t border-emerald-700/40 text-xs text-emerald-200">
            <span className="flex items-center gap-1.5">
              <strong className="text-white font-bold text-sm">11</strong> Primitives
            </span>
            <span className="text-emerald-500">•</span>
            <span className="flex items-center gap-1.5">
              <strong className="text-white font-bold text-sm">100%</strong> TypeScript Typed
            </span>
            <span className="text-emerald-500">•</span>
            <span className="flex items-center gap-1.5">
              <strong className="text-white font-bold text-sm">Tailwind CSS</strong> Theme Tokens
            </span>
            <span className="text-emerald-500">•</span>
            <span className="flex items-center gap-1.5">
              <strong className="text-white font-bold text-sm">Mobile &amp; Desktop</strong> Responsive
            </span>
          </div>
        </div>
      </div>

      {/* Showcase Filter Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-emerald-100 text-xs font-semibold scrollbar-none">
        {[
          { id: 'all', label: '🌟 All Primitives' },
          { id: 'buttons-badges', label: '🔘 Buttons & Badges' },
          { id: 'forms', label: '📝 Inputs & Selects' },
          { id: 'cards-modals', label: '🃏 Cards & Modals' },
          { id: 'calendar', label: '📅 Booking Calendar' },
          { id: 'table-empty', label: '📊 Table & Empty State' },
          { id: 'feedback', label: '🔔 Toasts & Loading' },
          { id: 'tokens', label: '🎨 Theme Tokens' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`
              px-4 py-2 rounded-xl transition-all duration-200 whitespace-nowrap cursor-pointer
              ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                  : 'bg-white/80 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 border border-slate-200/60'
              }
            `.trim()}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================== */}
      {/* 1. BUTTONS & BADGES SECTION */}
      {/* ========================================================== */}
      {(activeTab === 'all' || activeTab === 'buttons-badges') && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Button &amp; Badge Primitives
              </h3>
              <p className="text-xs text-slate-500">
                Action triggers and status metadata indicators with multiple variants, sizes and interactive states.
              </p>
            </div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setIsBtnLoading(!isBtnLoading)}
            >
              Toggle Loading State: {isBtnLoading ? 'ON' : 'OFF'}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Button Variants & Sizes Card */}
            <Card variant="glass">
              <CardHeader>
                <div>
                  <CardTitle>Button Variants &amp; Sizes</CardTitle>
                  <CardDescription>Hover, click, and inspect micro-animations</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Variants
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    <Button variant="primary" isLoading={isBtnLoading}>
                      Primary
                    </Button>
                    <Button variant="secondary" isLoading={isBtnLoading}>
                      Secondary
                    </Button>
                    <Button variant="outline" isLoading={isBtnLoading}>
                      Outline
                    </Button>
                    <Button variant="ghost" isLoading={isBtnLoading}>
                      Ghost
                    </Button>
                    <Button variant="danger" isLoading={isBtnLoading}>
                      Danger
                    </Button>
                    <Button variant="accent" isLoading={isBtnLoading}>
                      Accent
                    </Button>
                    <Button variant="link">
                      Text Link
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Size Scale (xs → xl)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="xs" variant="secondary">Size XS</Button>
                    <Button size="sm" variant="secondary">Size SM</Button>
                    <Button size="md" variant="primary">Size MD (Default)</Button>
                    <Button size="lg" variant="primary">Size LG</Button>
                    <Button size="xl" variant="accent">Size XL</Button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    With Icons &amp; Full Width
                  </label>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="primary"
                        leftIcon={
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                        }
                      >
                        New Reservation
                      </Button>
                      <Button
                        variant="secondary"
                        rightIcon={
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        }
                      >
                        View Calendar
                      </Button>
                      <Button variant="outline" disabled>
                        Disabled Button
                      </Button>
                    </div>

                    <Button variant="primary" fullWidth size="md">
                      Full Width Mobile CTA
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Badge Variants & Interactive Tags Card */}
            <Card variant="glass">
              <CardHeader>
                <div>
                  <CardTitle>Badge &amp; Status Indicators</CardTitle>
                  <CardDescription>Semantic statuses, pulsing dots, and removable filter chips</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Semantic Status Badges
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="emerald" dot pulseDot>
                      Confirmed (Active)
                    </Badge>
                    <Badge variant="blue" dot>
                      Scheduled
                    </Badge>
                    <Badge variant="amber" dot pulseDot>
                      Pending Lock
                    </Badge>
                    <Badge variant="rose" dot>
                      Cancelled
                    </Badge>
                    <Badge variant="purple" dot>
                      VIP Resource
                    </Badge>
                    <Badge variant="slate">
                      Draft
                    </Badge>
                    <Badge variant="outline">
                      Archived
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Badge Sizes (xs → lg)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge size="xs" variant="emerald" dot>XS Badge</Badge>
                    <Badge size="sm" variant="emerald" dot>SM Badge</Badge>
                    <Badge size="md" variant="emerald" dot>MD Badge</Badge>
                    <Badge size="lg" variant="purple" dot>LG Badge</Badge>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Interactive Removable Filter Tags (Click &times; to remove)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="slate"
                        size="md"
                        removable
                        onRemove={() => removeTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                    {activeTags.length === 0 && (
                      <Button
                        variant="link"
                        size="xs"
                        onClick={() =>
                          setActiveTags(['Instant Confirmation', 'High Priority', 'VIP Room', 'Dedicated VLAN'])
                        }
                      >
                        Reset Tags
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ========================================================== */}
      {/* 2. FORMS & INPUTS SECTION */}
      {/* ========================================================== */}
      {(activeTab === 'all' || activeTab === 'forms') && (
        <section className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Input &amp; Select Primitives
            </h3>
            <p className="text-xs text-slate-500">
              Form controls with accessible labels, error validations, icons, password toggles, and clearable inputs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Primitives */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Input Field Primitives</CardTitle>
                <CardDescription>Controlled and uncontrolled state controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Resource Name"
                  required
                  placeholder="e.g. Conference Suite 4"
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  clearable
                  onClear={() => setSampleText('')}
                  helperText="Clearable input with real-time text binding"
                />

                <Input
                  label="Search Resource Catalog"
                  placeholder="Search by name, capacity, or tag..."
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  }
                />

                <Input
                  label="Security Passkey / API Token"
                  type="password"
                  placeholder="Enter secret reservation code"
                  defaultValue="SuperSecretKey123"
                  helperText="Built-in show/hide password toggle"
                />

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">Error Validation State</span>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() =>
                        setSampleError(sampleError ? '' : 'This time slot is locked by another session.')
                      }
                    >
                      {sampleError ? 'Clear Error' : 'Trigger Validation Error'}
                    </Button>
                  </div>
                  <Input
                    label="Reservation Time Window"
                    placeholder="10:00 AM - 11:30 AM"
                    defaultValue="10:00 AM"
                    error={sampleError}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Select Primitives */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Select Dropdown Primitives</CardTitle>
                <CardDescription>Custom-styled selects with icons and validation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  label="Resource Category"
                  required
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  helperText="Select the physical or computational resource domain"
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  }
                  options={[
                    { value: 'compute', label: 'Compute & Cloud Nodes' },
                    { value: 'workspace', label: 'Meeting Rooms & Workspaces' },
                    { value: 'consultation', label: 'Expert Consultation Slots' },
                    { value: 'hardware', label: 'Hardware Bench Equipment' },
                  ]}
                />

                <Select
                  label="Booking Duration"
                  placeholder="Choose duration..."
                  defaultValue="60"
                  options={[
                    { value: '15', label: '15 Minutes (Express Sync)' },
                    { value: '30', label: '30 Minutes (Standard)' },
                    { value: '60', label: '1 Hour (Recommended)' },
                    { value: '120', label: '2 Hours (Extended)' },
                    { value: '240', label: 'Half Day (4 Hours)' },
                  ]}
                />

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Select
                    label="Input Size SM"
                    selectSize="sm"
                    options={[
                      { value: 'sm1', label: 'Compact 1' },
                      { value: 'sm2', label: 'Compact 2' },
                    ]}
                  />
                  <Select
                    label="Input Size LG"
                    selectSize="lg"
                    options={[
                      { value: 'lg1', label: 'Spacious 1' },
                      { value: 'lg2', label: 'Spacious 2' },
                    ]}
                  />
                </div>

                <Select
                  label="Disabled Select State"
                  disabled
                  defaultValue="restricted"
                  options={[{ value: 'restricted', label: 'Cluster Offline (Disabled)' }]}
                />
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ========================================================== */}
      {/* 3. CARDS & MODALS SECTION */}
      {/* ========================================================== */}
      {(activeTab === 'all' || activeTab === 'cards-modals') && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Card &amp; Modal Primitives
              </h3>
              <p className="text-xs text-slate-500">
                Surfaces, dialog overlays, compound headers, descriptions, footers, and backdrop blur.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              }
            >
              Open Interactive Modal
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card Variant: Glass */}
            <Card variant="glass">
              <CardHeader>
                <div>
                  <CardTitle>Glassmorphic Card</CardTitle>
                  <CardDescription>Default surface variant</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Frosted glass backdrop with specular white reflection and soft emerald drop shadow.
                </p>
              </CardContent>
              <CardFooter>
                <Badge variant="emerald" size="xs">variant=&quot;glass&quot;</Badge>
              </CardFooter>
            </Card>

            {/* Card Variant: Elevated */}
            <Card variant="elevated">
              <CardHeader>
                <div>
                  <CardTitle>Elevated Card</CardTitle>
                  <CardDescription>High contrast depth</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Solid white surface with multi-tier layered drop shadows for prominent focal sections.
                </p>
              </CardContent>
              <CardFooter>
                <Badge variant="blue" size="xs">variant=&quot;elevated&quot;</Badge>
              </CardFooter>
            </Card>

            {/* Card Variant: Outlined */}
            <Card variant="outlined">
              <CardHeader>
                <div>
                  <CardTitle>Outlined Card</CardTitle>
                  <CardDescription>Clean structural borders</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Subtle border styling with minimal shadow, ideal for dense dashboard grids.
                </p>
              </CardContent>
              <CardFooter>
                <Badge variant="slate" size="xs">variant=&quot;outlined&quot;</Badge>
              </CardFooter>
            </Card>

            {/* Card Variant: Interactive */}
            <Card
              variant="interactive"
              onClick={() => toast.info('Interactive Card Clicked', 'Hover lift & spring response triggered.')}
            >
              <CardHeader>
                <div>
                  <CardTitle>Interactive Card</CardTitle>
                  <CardDescription>Click to test animation</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Smooth hover lift, emerald border illumination, and active tactile scale response.
                </p>
              </CardContent>
              <CardFooter>
                <Badge variant="amber" size="xs">Clickable Card</Badge>
              </CardFooter>
            </Card>
          </div>

          {/* Interactive Modal Primitive Demo */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            size={modalSize}
            title="Confirm Reservation Booking"
            description="Acquires a high-concurrency reservation lock for the requested slot."
            footer={
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIsModalOpen(false);
                    toast.success('Reservation Confirmed!', 'Slot lock acquired successfully.');
                  }}
                >
                  Confirm &amp; Acquire Lock
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-950">Resource: </span>
                  <span className="text-emerald-800">Boardroom B (Main Campus)</span>
                </div>
                <Badge variant="emerald" size="xs" dot>Available</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input label="Guest / Team Name" placeholder="e.g. Acme Corp" defaultValue="Devin Booker" />
                <Select
                  label="Session Duration"
                  defaultValue="60"
                  options={[
                    { value: '30', label: '30 Minutes' },
                    { value: '60', label: '1 Hour' },
                    { value: '90', label: '1.5 Hours' },
                  ]}
                />
              </div>

              <Input label="Meeting Notes (Optional)" placeholder="Any special hardware or catering needs..." />

              <div className="pt-2">
                <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Test Modal Size Switching:
                </span>
                <div className="flex gap-2">
                  {(['sm', 'md', 'lg', 'xl'] as ModalSize[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setModalSize(s)}
                      className={`px-2.5 py-1 text-xs rounded-lg uppercase font-bold transition-colors cursor-pointer ${
                        modalSize === s
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Modal>
        </section>
      )}

      {/* ========================================================== */}
      {/* 4. CALENDAR PRIMITIVE SECTION */}
      {/* ========================================================== */}
      {(activeTab === 'all' || activeTab === 'calendar') && (
        <section className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Calendar Primitive
            </h3>
            <p className="text-xs text-slate-500">
              Interactive reservation calendar with month navigation, slot availability indicators, and date selection.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* The Calendar Widget */}
            <div className="lg:col-span-5 flex justify-center">
              <Calendar
                selectedDate={selectedDate}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  toast.info(
                    'Date Selected',
                    `Viewing reservation schedule for ${date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}`
                  );
                }}
                getDateStatus={getMockSlotStatus}
              />
            </div>

            {/* Selected Date Details Card */}
            <div className="lg:col-span-7">
              <Card variant="glass">
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <CardTitle>
                        Schedule for{' '}
                        {selectedDate
                          ? selectedDate.toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'Selected Date'}
                      </CardTitle>
                      <CardDescription>
                        Time slot allocation for the chosen date
                      </CardDescription>
                    </div>
                    <Badge variant="emerald" dot pulseDot>
                      Calendar Synced
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {[
                    { time: '09:00 - 10:00 AM', status: 'available', title: 'Open Resource Slot' },
                    { time: '10:30 - 11:30 AM', status: 'full', title: 'Executive Session (Locked)' },
                    { time: '01:00 - 02:00 PM', status: 'limited', title: '2 Seats Available' },
                    { time: '03:00 - 04:30 PM', status: 'available', title: 'Open Resource Slot' },
                  ].map((slot, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-white/70 hover:bg-emerald-50/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                          {slot.time}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">{slot.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {slot.status === 'available' && (
                          <Badge variant="emerald" size="xs">Available</Badge>
                        )}
                        {slot.status === 'limited' && (
                          <Badge variant="amber" size="xs">Limited</Badge>
                        )}
                        {slot.status === 'full' && (
                          <Badge variant="rose" size="xs">Reserved</Badge>
                        )}
                        <Button
                          size="xs"
                          variant={slot.status === 'available' ? 'primary' : 'outline'}
                          disabled={slot.status === 'full'}
                          onClick={() =>
                            toast.success('Slot Selected', `Slot at ${slot.time} is ready for booking.`)
                          }
                        >
                          {slot.status === 'full' ? 'Unavailable' : 'Book'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================== */}
      {/* 5. TABLE & EMPTY STATE SECTION */}
      {/* ========================================================== */}
      {(activeTab === 'all' || activeTab === 'table-empty') && (
        <section className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Table &amp; EmptyState Primitives
              </h3>
              <p className="text-xs text-slate-500">
                Responsive data tables with column sorting, hover rows, and graceful fallback empty states.
              </p>
            </div>

            {/* Table Controls */}
            <div className="flex items-center gap-2">
              <Button
                size="xs"
                variant="outline"
                onClick={() => setTableStriped(!tableStriped)}
              >
                Striped: {tableStriped ? 'ON' : 'OFF'}
              </Button>

              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                {(['compact', 'normal', 'spacious'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTableDensity(d)}
                    className={`px-2.5 py-1 rounded-md capitalize font-medium cursor-pointer transition-colors ${
                      tableDensity === d
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <Table density={tableDensity} striped={tableStriped}>
            <TableHeader>
              <TableRow>
                <TableHead
                  sortable
                  sortDirection={sortField === 'name' ? (sortAsc ? 'asc' : 'desc') : null}
                  onSort={() => {
                    setSortField('name');
                    setSortAsc(!sortAsc);
                  }}
                >
                  Resource Name
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Booked By</TableHead>
                <TableHead
                  sortable
                  sortDirection={sortField === 'slot' ? (sortAsc ? 'asc' : 'desc') : null}
                  onSort={() => {
                    setSortField('slot');
                    setSortAsc(!sortAsc);
                  }}
                >
                  Time Window
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleReservations.map((res) => (
                <TableRow key={res.id}>
                  <TableCell className="font-semibold text-slate-900">
                    {res.resource}
                  </TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium">
                      {res.category}
                    </span>
                  </TableCell>
                  <TableCell>{res.user}</TableCell>
                  <TableCell className="font-mono text-xs">{res.timeSlot}</TableCell>
                  <TableCell>
                    {res.status === 'confirmed' && (
                      <Badge variant="emerald" size="xs" dot>Confirmed</Badge>
                    )}
                    {res.status === 'active' && (
                      <Badge variant="blue" size="xs" dot pulseDot>Running</Badge>
                    )}
                    {res.status === 'pending' && (
                      <Badge variant="amber" size="xs" dot>Pending</Badge>
                    )}
                    {res.status === 'locked' && (
                      <Badge variant="purple" size="xs" dot>Locked</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => toast.info('Details', `Inspecting ${res.resource}`)}
                      >
                        Inspect
                      </Button>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => toast.success('Action', `Slot managed for ${res.id}`)}
                      >
                        Manage
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Empty State Showcase */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800">EmptyState Primitive Variations</h4>
                <p className="text-xs text-slate-500">Preset illustrations for booking states</p>
              </div>
              <div className="flex gap-1.5">
                {(['no-reservations', 'no-slots', 'no-results'] as EmptyStatePreset[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setEmptyPreset(p)}
                    className={`px-2.5 py-1 text-xs rounded-lg capitalize cursor-pointer transition-colors ${
                      emptyPreset === p
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <EmptyState
              preset={emptyPreset}
              variant="card"
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => toast.success('Action Triggered', 'Opening resource catalog...')}
                >
                  Explore Available Resources
                </Button>
              }
              secondaryAction={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info('Filters Reset', 'Search criteria cleared.')}
                >
                  Reset Filters
                </Button>
              }
            />
          </div>
        </section>
      )}

      {/* ========================================================== */}
      {/* 6. TOASTS & LOADING SECTION */}
      {/* ========================================================== */}
      {(activeTab === 'all' || activeTab === 'feedback') && (
        <section className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Toast &amp; Loading Primitives
            </h3>
            <p className="text-xs text-slate-500">
              Asynchronous user feedback, spinners, skeleton shimmers, overlays, and stacked toasts.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Toast Triggers Card */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Toast Notifications</CardTitle>
                <CardDescription>Click to spawn live floating feedback alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      toast.success(
                        'Reservation Confirmed!',
                        'Slot booked for Executive Suite B on Friday at 10:00 AM.'
                      )
                    }
                  >
                    Success Toast
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      toast.error(
                        'Resource Collision Detected',
                        'Another client acquired a concurrency lock on this slot.'
                      )
                    }
                  >
                    Error Toast
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      toast.warning(
                        'Lock Expiring in 2 Minutes',
                        'Complete checkout before the temporary lock is released.'
                      )
                    }
                  >
                    Warning Toast
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.info(
                        'New Timeslots Opened',
                        'Additional compute cluster capacity has been provisioned.'
                      )
                    }
                  >
                    Info Toast
                  </Button>
                </div>

                <div className="pt-2">
                  <Button
                    variant="accent"
                    size="sm"
                    fullWidth
                    onClick={() =>
                      toast.success('Actionable Notification', 'Click undo to restore previous state.', {
                        action: {
                          label: 'Undo Action',
                          onClick: () => toast.info('Undone', 'Action reverted.'),
                        },
                      })
                    }
                  >
                    Toast with Action Callback
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Spinners & Progress Bar */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Spinners &amp; Progress Indicators</CardTitle>
                <CardDescription>Scale tokens and indeterminate animations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Spinner Scale (xs → xl)
                  </label>
                  <div className="flex items-center gap-4">
                    <Spinner size="xs" color="emerald" />
                    <Spinner size="sm" color="emerald" />
                    <Spinner size="md" color="emerald" label="Syncing..." />
                    <Spinner size="lg" color="cyan" />
                    <Spinner size="xl" color="slate" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Progress Bar (Determinate)
                    </label>
                    <div className="flex gap-2">
                      {[25, 65, 100].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setProgressVal(v)}
                          className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                        >
                          {v}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <ProgressBar value={progressVal} showLabel color="emerald" />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Indeterminate Progress
                  </label>
                  <ProgressBar indeterminate color="emerald" />
                </div>
              </CardContent>
            </Card>

            {/* Skeleton Loaders Card */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Skeleton Loaders</CardTitle>
                <CardDescription>Fluid shimmer placeholding during network queries</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SkeletonCard />
                <div className="pt-2">
                  <SkeletonText lines={3} />
                </div>
              </CardContent>
            </Card>

            {/* Loading Overlay Demonstration */}
            <LoadingOverlay isLoading={isCardLoading} message="Acquiring Concurrency Lock...">
              <Card variant="glass" className="h-full">
                <CardHeader>
                  <CardTitle>LoadingOverlay Component</CardTitle>
                  <CardDescription>Blur overlay with centered spinner</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Wraps any component or form and prevents interaction while maintaining visual context during mutations.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setIsCardLoading(true);
                      setTimeout(() => setIsCardLoading(false), 2000);
                    }}
                  >
                    Simulate Async Operation (2s)
                  </Button>
                </CardContent>
              </Card>
            </LoadingOverlay>
          </div>
        </section>
      )}

      {/* ========================================================== */}
      {/* 7. THEME TOKENS & TYPOGRAPHY SECTION */}
      {/* ========================================================== */}
      {(activeTab === 'all' || activeTab === 'tokens') && (
        <section className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Theme Tokens &amp; Typography
            </h3>
            <p className="text-xs text-slate-500">
              Tokens defining colors, fonts, specular glass shadows, and radii for consistent brand harmony.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Color Tokens Swatches */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Brand Emerald Palette</CardTitle>
                <CardDescription>Primary palette for ReservePulse branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-mono">
                  {Object.entries(tokens.colors.brand).map(([weight, hex]) => (
                    <div key={weight} className="flex flex-col items-center">
                      <div
                        className="w-full h-10 rounded-lg shadow-xs border border-black/5 mb-1"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="font-bold text-slate-700">{weight}</span>
                      <span className="text-slate-400">{hex}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-700 block mb-2">
                    Semantic Status Accents
                  </span>
                  <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-mono">
                    <div className="flex flex-col items-center">
                      <div className="w-full h-8 rounded-lg bg-emerald-500 shadow-xs mb-1" />
                      <span className="font-semibold text-slate-700">Success</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-full h-8 rounded-lg bg-amber-500 shadow-xs mb-1" />
                      <span className="font-semibold text-slate-700">Warning</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-full h-8 rounded-lg bg-rose-500 shadow-xs mb-1" />
                      <span className="font-semibold text-slate-700">Danger</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-full h-8 rounded-lg bg-sky-500 shadow-xs mb-1" />
                      <span className="font-semibold text-slate-700">Info</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-full h-8 rounded-lg bg-purple-500 shadow-xs mb-1" />
                      <span className="font-semibold text-slate-700">Accent</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Typography Hierarchy */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Typography System</CardTitle>
                <CardDescription>Plus Jakarta Sans &amp; JetBrains Mono</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="border-b border-slate-100 pb-2">
                    <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      Display Title 2XL (24px)
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono">Plus Jakarta Sans / Bold 800</p>
                  </div>

                  <div className="border-b border-slate-100 pb-2">
                    <span className="text-lg font-bold text-slate-800 tracking-tight">
                      Section Heading LG (18px)
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono">Plus Jakarta Sans / Bold 700</p>
                  </div>

                  <div className="border-b border-slate-100 pb-2">
                    <span className="text-sm font-semibold text-slate-800">
                      Card / Form Label SM (14px)
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono">Plus Jakarta Sans / Semibold 600</p>
                  </div>

                  <div className="border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-600">
                      Body &amp; Subtitle Text XS (12px) - Designed for high legibility in dense booking tables and forms.
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono">Plus Jakarta Sans / Regular 400</p>
                  </div>

                  <div>
                    <span className="font-mono text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      2026-09-24T10:00:00Z | RES-801 | CAPACITY: 24
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">JetBrains Mono / Monospace</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
};
