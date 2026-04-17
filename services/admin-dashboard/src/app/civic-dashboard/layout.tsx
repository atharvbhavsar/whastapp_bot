import Link from "next/link";
import { MessageCircle, ListChecks, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function CivicDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center">
              <span className="text-xl font-bold tracking-tight text-blue-600">
                Civic Authority
              </span>
              
              <nav className="hidden md:ml-10 md:flex md:space-x-8">
                <Link
                  href="/civic-dashboard"
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 data-[state=active]:border-blue-500 data-[state=active]:text-gray-900"
                >
                  <ListChecks className="mr-2 h-4 w-4" />
                  Priority Queue
                </Link>
                <Link
                  href="/civic-dashboard/logs"
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 data-[state=active]:border-blue-500 data-[state=active]:text-gray-900"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp Logs
                </Link>
              </nav>
            </div>
            {/* Account Utilities */}
            {user && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 font-medium">
                  {user.user_metadata?.full_name?.split(' ')[0] || user.email}
                </span>
                <form action={async () => {
                  "use server";
                  const supabaseServer = await createClient();
                  await supabaseServer.auth.signOut();
                }}>
                  <button type="submit" className="flex items-center text-sm font-medium text-red-600 hover:text-red-700">
                    <LogOut className="h-4 w-4 mr-1" />
                    Logout
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
