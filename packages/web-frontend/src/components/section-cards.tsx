import { IconTrendingDown, IconTrendingUp, IconBrain, IconCode, IconDatabase, IconChartBar } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionCards() {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>AI Models Available</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            15+
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconBrain />
              Active
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Z.AI GLM-4.5 Air <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Primary model configured and ready
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Knowledge Base</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            0
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconDatabase />
              Ready
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            No documents uploaded yet <IconTrendingDown className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Upload files to start building knowledge
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>PMAC Control</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            Online
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconCode />
              Connected
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Controller ready for commands <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Real-time monitoring available</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>System Status</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            Healthy
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconChartBar />
              All OK
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            All services running <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">System performance optimal</div>
        </CardFooter>
      </Card>
    </div>
  )
}
