"use client"

import * as React from "react"
import {
  IconDashboard,
  IconBrain,
  IconDatabase,
  IconChartBar,
  IconSettings,
  IconSearch,
  IconUsers,
  IconCode,
  IconMessage,
  IconFileText,
  IconInnerShadowTop,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"

const data = {
  user: {
    name: "PMAC User",
    email: "user@pmac.local",
    avatar: "/avatars/default.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: IconDashboard,
    },
    {
      title: "Chat",
      url: "/chat",
      icon: IconMessage,
    },
    {
      title: "Knowledge Base",
      url: "/knowledge",
      icon: IconBrain,
    },
    {
      title: "PMAC Control",
      url: "/pmac-control",
      icon: IconCode,
    },
    {
      title: "Data Collection",
      url: "/data-collection",
      icon: IconDatabase,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: IconChartBar,
    },
    {
      title: "MCP Server",
      url: "/mcp",
      icon: IconUsers,
    },
  ],
  navClouds: [
    {
      title: "Documents",
      icon: IconFileText,
      isActive: false,
      url: "#",
      items: [
        {
          title: "Upload Files",
          url: "/knowledge",
        },
        {
          title: "Search Files",
          url: "/search",
        },
      ],
    },
    {
      title: "AI Models",
      icon: IconBrain,
      url: "#",
      items: [
        {
          title: "Configure AI",
          url: "/settings",
        },
        {
          title: "Test Connection",
          url: "/settings",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
    {
      title: "Search",
      url: "/search",
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: "Knowledge Base",
      url: "/knowledge",
      icon: IconBrain,
    },
    {
      name: "Reports",
      url: "/analytics",
      icon: IconChartBar,
    },
    {
      name: "PMAC Code",
      url: "/pmac-control",
      icon: IconCode,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">PMAC Assistant</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
