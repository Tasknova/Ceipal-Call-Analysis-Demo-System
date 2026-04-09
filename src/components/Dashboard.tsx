import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  BarChart3,
  Loader2,
  Phone,
  Play,
  RefreshCw,
  Trash2,
  TrendingUp,
  Upload,
  Waves,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useAnalysisNotifications } from "@/hooks/useAnalysisNotifications";
import { Analysis } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalyses, useDashboardStats, useDeleteRecording, useRecordings } from "@/hooks/useSupabaseData";
import AddRecordingModal from "./AddRecordingModal";

type DashboardTab = "overview" | "calls" | "reports";

export default function Dashboard() {
  const CALLS_PER_PAGE = 10;
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as DashboardTab) || "overview";
  const [selectedTab, setSelectedTab] = useState<DashboardTab>(initialTab);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [callsPage, setCallsPage] = useState(1);

  const { data: dashboardData, isLoading, error } = useDashboardStats();
  const { data: recordings, isLoading: recordingsLoading } = useRecordings();
  const { data: analyses } = useAnalyses();
  const deleteRecording = useDeleteRecording();

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useAnalysisNotifications();

  const kpis = dashboardData?.kpiData;
  const last10CallsSentiment = dashboardData?.last10CallsSentiment || [];
  const objectionData = dashboardData?.objectionData || [];

  const sentimentDistribution = useMemo(
    () =>
      (dashboardData?.sentimentData || []).map((item) => ({
        ...item,
        fill: item.color,
      })),
    [dashboardData?.sentimentData]
  );

  const analysisStatusData = useMemo(() => {
    const totals = {
      completed: 0,
      processing: 0,
      failed: 0,
      pending: 0,
    };

    (analyses || []).forEach((analysis) => {
      const status = (analysis.status || "pending").toLowerCase();
      if (status === "completed" || status === "analyzed") totals.completed += 1;
      else if (["processing", "in_progress", "analyzing", "queued", "transcribing", "transcribed"].includes(status)) totals.processing += 1;
      else if (["failed", "error", "cancelled"].includes(status)) totals.failed += 1;
      else totals.pending += 1;
    });

    return [
      { name: "Completed", value: totals.completed, fill: "hsl(var(--success))" },
      { name: "Processing", value: totals.processing, fill: "hsl(var(--primary))" },
      { name: "Failed", value: totals.failed, fill: "hsl(var(--destructive))" },
      { name: "Pending", value: totals.pending, fill: "hsl(var(--warning))" },
    ];
  }, [analyses]);

  const totalCallsPages = Math.max(1, Math.ceil((recordings || []).length / CALLS_PER_PAGE));
  const paginatedRecordings = useMemo(() => {
    const start = (callsPage - 1) * CALLS_PER_PAGE;
    const end = start + CALLS_PER_PAGE;
    return (recordings || []).slice(start, end);
  }, [recordings, callsPage]);

  useEffect(() => {
    if (callsPage > totalCallsPages) {
      setCallsPage(totalCallsPages);
    }
  }, [callsPage, totalCallsPages]);

  useEffect(() => {
    if (selectedTab !== "calls") {
      setCallsPage(1);
    }
  }, [selectedTab]);

  const handleTabChange = (tab: DashboardTab) => {
    setSelectedTab(tab);
    setSearchParams({ tab, view: "dashboard" }, { replace: true });
  };

  const handleRecordingAdded = () => {
    queryClient.invalidateQueries({ queryKey: ["recordings"] });
    queryClient.invalidateQueries({ queryKey: ["analyses"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
  };

  const handleRecordingClick = (analysis: Analysis | null) => {
    if (analysis && analysis.status?.toLowerCase() === "completed") {
      navigate(`/analysis/${analysis.id}`);
      return;
    }

    toast({
      title: "Analysis not ready",
      description: "This call is still processing.",
    });
  };

  const handleDeleteRecording = async (recordingId: string, fileName: string) => {
    if (!window.confirm(`Delete \"${fileName}\"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteRecording.mutateAsync(recordingId);
      toast({
        title: "Deleted",
        description: `${fileName} was removed successfully.`,
      });
    } catch {
      toast({
        title: "Delete failed",
        description: "Could not delete this call.",
        variant: "destructive",
      });
    }
  };

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["recordings"] });
    queryClient.invalidateQueries({ queryKey: ["analyses"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
    toast({ title: "Refreshing", description: "Updating call and analysis data." });
  };

  const getStatusBadge = (status: string | null | undefined) => {
    const normalized = (status || "pending").toLowerCase();

    if (["completed", "analyzed"].includes(normalized)) {
      return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
    }
    if (["processing", "in_progress", "analyzing", "queued", "transcribing", "transcribed"].includes(normalized)) {
      return (
        <Badge className="flex items-center gap-1 bg-blue-100 text-blue-700">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    }
    if (["failed", "error", "cancelled"].includes(normalized)) {
      return <Badge className="bg-rose-100 text-rose-700">Failed</Badge>;
    }

    return <Badge variant="outline">Pending</Badge>;
  };

  if (isLoading || !dashboardData || !kpis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-4 text-muted-foreground">Loading Bharat Petroleum dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Unable to load dashboard</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-background to-amber-50/50">
      <header className="border-b border-border bg-white/90 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/Bharat-Petroleum-logo.png" alt="Bharat Petroleum" className="h-12 w-auto" />
            <div className="border-l border-border pl-4">
              <h1 className="text-lg font-semibold text-primary">Bharat Petroleum Call Intelligence</h1>
              <p className="text-xs text-muted-foreground">Overview, Calls, and Reports</p>
            </div>
          </div>
          <img src="/Bharat-Petroleum-Logo-2.png" alt="Bharat Petroleum secondary logo" className="h-10 w-auto" />
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-8">
        <aside className="w-64 rounded-xl border border-border bg-white p-4 shadow-sm">
          <nav className="space-y-2">
            <Button
              variant="ghost"
              onClick={() => handleTabChange("overview")}
              className={`w-full justify-start ${selectedTab === "overview" ? "bg-accent-blue-light text-primary" : "text-muted-foreground"}`}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Overview
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleTabChange("calls")}
              className={`w-full justify-start ${selectedTab === "calls" ? "bg-accent-blue-light text-primary" : "text-muted-foreground"}`}
            >
              <Phone className="mr-2 h-4 w-4" />
              Calls
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleTabChange("reports")}
              className={`w-full justify-start ${selectedTab === "reports" ? "bg-accent-blue-light text-primary" : "text-muted-foreground"}`}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Reports
            </Button>
          </nav>
        </aside>

        <main className="flex-1 space-y-6">
          {selectedTab === "overview" && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Calls</CardDescription>
                    <CardTitle>{kpis.totalCalls}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Avg Sentiment</CardDescription>
                    <CardTitle>{kpis.avgSentiment.toFixed(0)}%</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Avg Engagement</CardDescription>
                    <CardTitle>{kpis.avgEngagement.toFixed(0)}%</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>High Performing Calls</CardDescription>
                    <CardTitle>{kpis.highPerformingCalls || 0}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Call Trend</CardTitle>
                    <CardDescription>Last 10 calls sentiment and engagement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={last10CallsSentiment}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="call" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="sentiment" stroke="hsl(var(--primary))" strokeWidth={3} />
                        <Line type="monotone" dataKey="engagement" stroke="hsl(var(--accent-blue))" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Calls</CardTitle>
                    <CardDescription>Open completed call analyses</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(recordings || []).slice(0, 6).map((recording) => {
                      const analysis = analyses?.find((a) => a.recording_id === recording.id) || null;
                      const ready = analysis?.status?.toLowerCase() === "completed";

                      return (
                        <div
                          key={recording.id}
                          className={`flex items-center justify-between rounded-lg border p-3 ${ready ? "cursor-pointer hover:border-primary" : "opacity-70"}`}
                          onClick={() => ready && handleRecordingClick(analysis)}
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{recording.file_name || "Unnamed recording"}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(recording.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          {ready ? <Badge className="bg-accent-blue-light text-primary">View</Badge> : getStatusBadge(analysis?.status)}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {selectedTab === "calls" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-primary">Calls</h2>
                  <p className="text-sm text-muted-foreground">Manage call uploads and analysis status</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={refreshData}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button onClick={() => setIsAddModalOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary-hover">
                    <Upload className="mr-2 h-4 w-4" />
                    Add Call
                  </Button>
                </div>
              </div>

              {recordingsLoading ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading calls...</p>
                  </CardContent>
                </Card>
              ) : !(recordings || []).length ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <p className="text-sm text-muted-foreground">No calls uploaded yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {paginatedRecordings.map((recording) => {
                    const analysis = analyses?.find((a) => a.recording_id === recording.id) || null;
                    const ready = analysis?.status?.toLowerCase() === "completed";

                    return (
                      <Card key={recording.id} className="border-border">
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{recording.file_name || "Unnamed recording"}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(recording.created_at).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {getStatusBadge(analysis?.status)}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => ready && handleRecordingClick(analysis)}
                              disabled={!ready}
                            >
                              <Play className="mr-1 h-3.5 w-3.5" />
                              Analysis
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-600"
                              onClick={() => handleDeleteRecording(recording.id, recording.file_name || "Unnamed recording")}
                              disabled={deleteRecording.isPending}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  <Card className="border-border">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <p className="text-sm text-muted-foreground">
                        Page {callsPage} of {totalCallsPages} • Showing {(callsPage - 1) * CALLS_PER_PAGE + 1}
                        -{Math.min(callsPage * CALLS_PER_PAGE, (recordings || []).length)} of {(recordings || []).length} calls
                      </p>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={callsPage === 1}
                          onClick={() => setCallsPage((prev) => Math.max(1, prev - 1))}
                        >
                          Previous
                        </Button>

                        {Array.from({ length: totalCallsPages }, (_, index) => index + 1)
                          .filter((page) => {
                            if (totalCallsPages <= 7) return true;
                            if (page === 1 || page === totalCallsPages) return true;
                            return Math.abs(page - callsPage) <= 1;
                          })
                          .map((page, index, arr) => (
                            <div key={page} className="flex items-center gap-2">
                              {index > 0 && page - arr[index - 1] > 1 ? <span className="text-muted-foreground">...</span> : null}
                              <Button
                                variant={page === callsPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCallsPage(page)}
                              >
                                {page}
                              </Button>
                            </div>
                          ))}

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={callsPage === totalCallsPages}
                          onClick={() => setCallsPage((prev) => Math.min(totalCallsPages, prev + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}

          {selectedTab === "reports" && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Sentiment Distribution</CardTitle>
                  <CardDescription>Call quality mix across sentiment bands</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={sentimentDistribution} dataKey="value" nameKey="name" outerRadius={100}>
                        {sentimentDistribution.map((entry, index) => (
                          <Cell key={`sentiment-cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Analysis Status</CardTitle>
                  <CardDescription>Processing health across all calls</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analysisStatusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {analysisStatusData.map((entry, index) => (
                          <Cell key={`status-cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>Objection Pattern Report</CardTitle>
                  <CardDescription>Top objection themes from analyzed calls</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={objectionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      <AddRecordingModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} onRecordingAdded={handleRecordingAdded} />
    </div>
  );
}
