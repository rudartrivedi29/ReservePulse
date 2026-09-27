import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookingWizard } from '../components/booking';
import { Button, Badge, Card, CardContent } from '../components/ui';
import { Sparkles, ArrowLeft } from 'lucide-react';

export const BookPage: React.FC = () => {
  const { serviceId } = useParams<{ serviceId?: string }>();
  const navigate = useNavigate();
  const [isWizardOpen, setIsWizardOpen] = useState(true);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 font-sans space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back
        </Button>
        <Badge variant="blue">ReservePulse Concierge</Badge>
      </div>

      <Card className="text-center p-8 border-dashed border-2 border-indigo-200 bg-indigo-50/40">
        <CardContent className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Customer Reservation Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            Book compute slices, private consultation suites, and broadcast studios with live concurrency locks and instant verification.
          </p>
          <div>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsWizardOpen(true)}
            >
              Open Booking Flow &rarr;
            </Button>
          </div>
        </CardContent>
      </Card>

      <BookingWizard
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          navigate(-1);
        }}
        preSelectedServiceId={serviceId}
        onBookingSuccess={() => {
          setIsWizardOpen(false);
          navigate('/customer/bookings');
        }}
      />
    </div>
  );
};
