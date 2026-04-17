export const dynamic = 'force-dynamic';
import { Suspense } from "react"
import { getCivicDashboard, ComplaintDashboardItem } from "@/app/actions/get-civic-dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/civic/StatusBadge"
import { AlertCircle, Clock, MapPin, TrendingUp, Users, CheckCircle, Search } from "lucide-react"

// --- Helper Functions ---
function getPriorityVariant(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 76) return "critical"
  if (score >= 56) return "high"
  if (score >= 31) return "medium"
  return "low"
}

function timeSince(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24))
  if (diffDays === 0) return "Today"
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
}

function getSlaWarning(item: ComplaintDashboardItem) {
  if (item.status === "resolved" || item.status === "closed") return null
  if (item.sla_breach_risk === "breached") return <AlertCircle className="inline h-4 w-4 text-red-500" />
  if (item.sla_breach_risk === "high") return <Clock className="inline h-4 w-4 text-yellow-500" />
  return null
}

// --- Server Component ---
export default async function CivicDashboardPage() {
  // Fetch from the Intelligence Engine
  const { data: issues, error } = await getCivicDashboard({ status: "filed" }) // Adjust filter as needed

  if (error || !issues) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700 font-medium">Critical System Error: {error || "Cannot reach database"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- Calculate Metrics ---
  const activeCount = issues.length
  const criticalCount = issues.filter(i => i.priority_score >= 76).length
  const overdueCount = issues.filter(i => i.sla_breach_risk === "breached").length
  const avgResolution = "4.8 days" // Placeholder for ideation UI

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Authority Operation Center</h1>
        <p className="text-muted-foreground mt-1 text-lg">Intelligent queue managed by AI Priority Engine</p>
      </div>

      {/* --- Top Metrics Row --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Complaints</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Live in system</p>
          </CardContent>
        </Card>

        <Card className={criticalCount > 0 ? "border-red-200 bg-red-50/30" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Priority</CardTitle>
            <AlertCircle className={`h-5 w-5 ${criticalCount > 0 ? "text-red-500" : "text-gray-400"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${criticalCount > 0 ? "text-red-600" : ""}`}>{criticalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate action</p>
          </CardContent>
        </Card>

        <Card className={overdueCount > 0 ? "border-orange-200 bg-orange-50/30" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue SLA</CardTitle>
            <Clock className={`h-5 w-5 ${overdueCount > 0 ? "text-orange-500" : "text-gray-400"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${overdueCount > 0 ? "text-orange-600" : ""}`}>{overdueCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Automatically escalating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgResolution}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all zones</p>
          </CardContent>
        </Card>
      </div>

      {/* --- Live Ticket Table --- */}
      <Card>
        <CardHeader>
          <CardTitle>Live AI Priority Queue</CardTitle>
          <CardDescription>
            Sorted exclusively by algorithmic Priority Score. Do not deviate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px]">Priority</TableHead>
                  <TableHead>Complaint Details</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Community</TableHead>
                  <TableHead>Filed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                      No active complaints found. The city runs perfectly.
                    </TableCell>
                  </TableRow>
                ) : (
                  issues.map((issue) => (
                    <TableRow key={issue.id} className={issue.priority_score >= 76 ? "bg-red-50/10" : ""}>
                      
                      {/* Priority Badge */}
                      <TableCell>
                        <StatusBadge variant={getPriorityVariant(issue.priority_score)}>
                          {getPriorityVariant(issue.priority_score).toUpperCase()}
                        </StatusBadge>
                      </TableCell>
                      
                      {/* Details */}
                      <TableCell>
                        <div className="font-medium text-sm text-blue-600">#{issue.id.split("-")[0].toUpperCase()}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={issue.description}>
                          {issue.description || "Auto-detected issue"}
                        </div>
                      </TableCell>
                      
                      {/* Category */}
                      <TableCell>
                        <div className="font-medium">{issue.category.substring(0, 15)}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> Zone {issue.zone_id}
                        </div>
                      </TableCell>
                      
                      {/* Community Count */}
                      <TableCell className="text-center">
                        <div className="inline-flex items-center justify-center bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                          <Users className="mr-1 h-3 w-3" />
                          {issue.report_count}
                        </div>
                      </TableCell>
                      
                      {/* Filed Age */}
                      <TableCell>
                        <div className="text-sm flex items-center gap-1">
                          {timeSince(issue.created_at)}
                          {getSlaWarning(issue)}
                        </div>
                        {issue.sla_breach_risk === "breached" && (
                          <div className="text-[10px] text-red-500 font-medium uppercase tracking-wider">Overdue</div>
                        )}
                      </TableCell>
                      
                      {/* System Status */}
                      <TableCell>
                        <div className="text-sm font-medium capitalize">{issue.status.replace("_", " ")}</div>
                      </TableCell>
                      
                      {/* Absolute Score */}
                      <TableCell className="text-right">
                        <div className="text-lg font-bold font-mono">
                          {issue.priority_score.toFixed(0)}
                        </div>
                      </TableCell>
                      
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
