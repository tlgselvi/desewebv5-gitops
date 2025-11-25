import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface KPICardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  description?: React.ReactNode
  loading?: boolean
  trend?: {
    value: number
    label: string
    direction: "up" | "down" | "neutral"
  }
  className?: string
  valueClassName?: string
}

export function KPICard({
  title,
  value,
  icon,
  description,
  loading,
  trend,
  className,
  valueClassName,
}: KPICardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold flex items-center", valueClassName)}>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            value
          )}
        </div>
        {(description || trend) && (
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  "font-medium",
                  trend.direction === "up" && "text-green-600 dark:text-green-400",
                  trend.direction === "down" && "text-red-600 dark:text-red-400",
                  trend.direction === "neutral" && "text-yellow-600 dark:text-yellow-400"
                )}
              >
                {trend.value > 0 ? "+" : ""}
                {trend.value}%
              </span>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

