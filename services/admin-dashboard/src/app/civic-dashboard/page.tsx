import AdminDashboard from "@/components/civic/admin-dashboard";

export const metadata = {
  title: 'Authority Command Center | CivicPulse',
  description: 'AI-Powered queue management and civic resolution.',
};

export default function CivicDashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <AdminDashboard />
    </div>
  );
}
