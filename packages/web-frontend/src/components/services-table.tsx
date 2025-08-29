"use client"

import * as React from "react"
import { IconCircleCheckFilled, IconLoader, IconAlertCircle } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ServiceData {
  id: number
  service: string
  status: string
  port: number
  health: string
  uptime: string
}

interface ServicesTableProps {
  data: ServiceData[]
}

export function ServicesTable({ data }: ServicesTableProps) {
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return <IconCircleCheckFilled className="w-4 h-4 text-green-500" />
      case 'stopped':
        return <IconAlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <IconLoader className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Running</Badge>
      case 'stopped':
        return <Badge variant="destructive">Stopped</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getHealthBadge = (health: string) => {
    switch (health.toLowerCase()) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Healthy</Badge>
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Warning</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">{health}</Badge>
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Status</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Port</TableHead>
            <TableHead>Health</TableHead>
            <TableHead>Uptime</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((service) => (
            <TableRow key={service.id}>
              <TableCell>
                {getStatusIcon(service.status)}
              </TableCell>
              <TableCell className="font-medium">{service.service}</TableCell>
              <TableCell className="text-muted-foreground">:{service.port}</TableCell>
              <TableCell>{getHealthBadge(service.health)}</TableCell>
              <TableCell className="text-muted-foreground">{service.uptime}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
