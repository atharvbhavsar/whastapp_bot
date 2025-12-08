import { Suspense } from "react";
import { getRecentChats } from "@/app/actions/get-recent-chats";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Phone, User, Bot } from "lucide-react";

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInMinutes < 1) return "just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return date.toLocaleDateString();
}

function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

async function AnalyticsContent() {
  const { messages, total, error } = await getRecentChats();

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-600">Error loading chats: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const userMessages = messages.filter((m) => m.role === "user").length;
  const assistantMessages = messages.filter(
    (m) => m.role === "assistant"
  ).length;
  const voiceMessages = messages.filter((m) => m.is_voice).length;
  const uniqueConversations = new Set(messages.map((m) => m.conversation_id))
    .size;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Messages
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueConversations}</div>
            <p className="text-xs text-muted-foreground">Unique sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Messages</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userMessages}</div>
            <p className="text-xs text-muted-foreground">From students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Voice Messages
            </CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{voiceMessages}</div>
            <p className="text-xs text-muted-foreground">Voice interactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Chats Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Chats</CardTitle>
          <CardDescription>
            Messages from the last 24 hours (showing latest {messages.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>
              Chat logs are encrypted and securely stored
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Time</TableHead>
                <TableHead className="w-20">Role</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-28">Type</TableHead>
                <TableHead className="w-48">User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No messages in the last 24 hours
                  </TableCell>
                </TableRow>
              ) : (
                messages.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell className="font-mono text-xs">
                      {formatTimeAgo(message.created_at)}
                    </TableCell>
                    <TableCell>
                      {message.role === "user" ? (
                        <Badge variant="secondary" className="gap-1">
                          <User className="h-3 w-3" />
                          User
                        </Badge>
                      ) : message.role === "assistant" ? (
                        <Badge variant="default" className="gap-1">
                          <Bot className="h-3 w-3" />
                          AI
                        </Badge>
                      ) : (
                        <Badge variant="outline">System</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm">
                        {truncateText(message.content, 150)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {message.is_voice ? (
                        <Badge variant="secondary" className="gap-1">
                          <Phone className="h-3 w-3" />
                          Voice
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Text
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {message.user_email || "N/A"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          View recent chat activity and conversation logs
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}
