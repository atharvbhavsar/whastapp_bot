"use client";

import * as React from "react";
import { Bot, Building, Home, Upload, TicketCheck } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { colleges } from "@/lib/colleges";

// Navigation data
const navData = {
  navMain: [
    {
      title: "Home",
      url: "/dashboard",
      icon: Home,
      isActive: true,
      items: [
        {
          title: "Overview",
          url: "/dashboard",
        },
        {
          title: "Analytics",
          url: "#",
        },
      ],
    },
    {
      title: "Content",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Uploads",
          url: "/dashboard/uploads",
        },
      ],
    },
    {
      title: "Support",
      url: "#",
      icon: TicketCheck,
      items: [
        {
          title: "Escalations",
          url: "/dashboard/escalations",
        },
      ],
    },
  ],
  quickstarts: [
    {
      name: "Upload Documents",
      url: "/dashboard/uploads",
      icon: Upload,
    },
  ],
};

type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  college_id: string;
  role: string;
};

export function AppSidebar({
  profile,
  ...props
}: React.ComponentProps<typeof Sidebar> & { profile: UserProfile | null }) {
  // Get college name from slug
  const college = colleges.find((c) => c.slug === profile?.college_id);
  const collegeName = college?.name || "Unknown College";

  const user = {
    name: profile?.full_name || "Admin User",
    email: profile?.email || "admin@college.edu",
  };

  const teams = [
    {
      name: collegeName,
      logo: Building,
      plan: profile?.role === "admin" ? "Admin" : "Volunteer",
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navData.navMain} />
        <NavProjects projects={navData.quickstarts} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
