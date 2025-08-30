import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { IconSettings, IconBrain } from "@tabler/icons-react"
import Link from "next/link"
import { ModeToggle } from "./mode-toggle"
import { RiChatNewLine } from "react-icons/ri"

interface SiteHeaderProps {
  pageTitle?: string
  newChatButton?: {
    onClick: () => void
  }
}

export function SiteHeader({ pageTitle, statusBadge, newChatButton }: SiteHeaderProps) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex items-center gap-2">
          <IconBrain className="w-5 h-5 text-blue-600" />
          {pageTitle ? (
            <h1 className="text-base font-medium">{pageTitle}</h1>
          ) : (
            <h1 className="text-base font-medium">PMAC Assistant</h1>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {newChatButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={newChatButton.onClick}
            >
              <RiChatNewLine className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          )}
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <Link href="/settings">
              <IconSettings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
