"use client";

import * as React from "react";
import {
  Building2,
  Home,
  Upload,
  HelpCircle,
  Ticket,
  BarChart3,
  FileText,
  Globe,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { getCityNameBySlug } from "@/lib/cities";

// SCIRP+ Admin Navigation
const navData = {
  navMain: [
    {
      title: "Command Center",
      url: "/",
      icon: Home,
      isActive: true,
    },
    {
      title: "SLA Escalations",
      url: "/dashboard/escalations",
      icon: Ticket,
    },
    {
      title: "Knowledge Base",
      url: "/dashboard/uploads",
      icon: Upload,
    },
    {
      title: "Knowledge Gaps",
      url: "/dashboard/knowledge-gaps",
      icon: HelpCircle,
    },
    {
      title: "Chatbot Analytics",
      url: "/dashboard/analytics",
      icon: BarChart3,
    },
    {
      title: "Govt Documents",
      url: "/dashboard/uploads",
      icon: FileText,
    },
    {
      title: "Web Scraper",
      url: "/dashboard/uploads?tab=website",
      icon: Globe,
    },
  ],
};

type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  city_slug: string;    // Replaces college_id
  role: string;
};

export function AppSidebar({
  profile,
  ...props
}: React.ComponentProps<typeof Sidebar> & { profile: UserProfile | null }) {
  const cityName = getCityNameBySlug(profile?.city_slug || "");

  const user = {
    name: profile?.full_name || "Government Officer",
    email: profile?.email || "officer@gov.in",
  };

  const teams = [
    {
      name: cityName,
      logo: Building2,
      plan: profile?.role === "commissioner"
        ? "Commissioner"
        : profile?.role === "admin"
        ? "Admin"
        : "Field Officer",
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navData.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground border-t">
          <Building2 className="h-5 w-5 text-blue-500" />
          <span className="font-semibold text-blue-600">SCIRP+</span>
        </div>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
