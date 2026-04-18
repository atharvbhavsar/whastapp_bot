import OfficerPortal from "@/components/officer/officer-portal";

export const metadata = {
  title: 'Officer Portal | CivicPulse',
  description: 'Manage and resolve civic tasks in the field.',
};

export default function OfficerPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold font-serif text-xl">
              C
            </div>
            <span className="font-serif font-bold text-xl tracking-tight text-primary">CivicPulse</span>
          </div>
        </div>
      </header>

      <main className="flex flex-col items-center pt-8">
        <OfficerPortal />
      </main>
    </div>
  );
}
