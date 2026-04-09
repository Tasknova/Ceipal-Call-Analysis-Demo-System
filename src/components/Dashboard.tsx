import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileText,
  Loader2,
  PanelRightOpen,
  Phone,
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAnalyses, useDashboardStats, useDeleteRecording, useRecordings } from "@/hooks/useSupabaseData";
import AddRecordingModal from "./AddRecordingModal";

type DashboardTab = "overview" | "calls" | "reports";
type AnalysisFilterStatus = "all" | "completed" | "processing" | "pending" | "failed";

const toNumber = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const toPercent = (value: number): string => `${Math.max(0, value).toFixed(0)}%`;

const toRatioPercent = (value: number, total: number): string => {
  if (!total) return "0%";
  return toPercent((value / total) * 100);
};

const getAnalysisBucket = (status: string | null | undefined): Exclude<AnalysisFilterStatus, "all"> => {
  const normalized = (status || "pending").toLowerCase();

  if (normalized === "completed" || normalized === "analyzed") return "completed";
  if (["processing", "in_progress", "analyzing", "queued", "transcribing", "transcribed"].includes(normalized)) return "processing";
  if (["failed", "error", "cancelled"].includes(normalized)) return "failed";
  return "pending";
};

const stripFileExtension = (value: string): string => value.replace(/\.[^/.]+$/, "");

const getTranscriptWordCount = (value: unknown): number => {
  if (typeof value !== "string") return 0;

  const normalized = value.trim();
  if (!normalized) return 0;

  return normalized.split(/\s+/).filter(Boolean).length;
};

const titleize = (value: string): string =>
  value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getCallDisplayName = (fileName: string | null | undefined, analysis: Analysis | null): string => {
  const callId = analysis?.call_overview?.call_id;
  if (typeof callId === "string" && callId.trim()) {
    return callId.trim();
  }

  const fallback = fileName?.trim() || "Unnamed recording";
  return stripFileExtension(fallback);
};

function OverviewStatCard({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "blue" | "green" | "amber" | "rose";
}) {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
  };

  const Icon = icon;

  return (
    <Card className="overflow-hidden border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <span className={`rounded-md border p-1.5 ${toneClasses[tone]}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const CALLS_PER_PAGE = 10;
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as DashboardTab) || "overview";
  const [selectedTab, setSelectedTab] = useState<DashboardTab>(initialTab);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [callsPage, setCallsPage] = useState(1);
  const [analysisStatusFilter, setAnalysisStatusFilter] = useState<AnalysisFilterStatus>("all");
  const [callSearch, setCallSearch] = useState("");
  const [isOverviewSheetOpen, setIsOverviewSheetOpen] = useState(false);
  const [overviewSheetCallName, setOverviewSheetCallName] = useState("");
  const [overviewSheetData, setOverviewSheetData] = useState<Record<string, unknown> | null>(null);

  const { data: dashboardData, isLoading, error } = useDashboardStats();
  const { data: recordings, isLoading: recordingsLoading } = useRecordings();
  const { data: analyses } = useAnalyses();
  const deleteRecording = useDeleteRecording();

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useAnalysisNotifications();

  const kpis = dashboardData?.kpiData;
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
      const statusBucket = getAnalysisBucket(analysis.status);
      totals[statusBucket] += 1;
    });

    return [
      { name: "Completed", value: totals.completed, fill: "hsl(var(--success))" },
      { name: "Processing", value: totals.processing, fill: "hsl(var(--primary))" },
      { name: "Failed", value: totals.failed, fill: "hsl(var(--destructive))" },
      { name: "Pending", value: totals.pending, fill: "hsl(var(--warning))" },
    ];
  }, [analyses]);

  const analysisStatusTotals = useMemo(() => {
    const getValue = (name: string) => analysisStatusData.find((item) => item.name === name)?.value || 0;

    const completed = getValue("Completed");
    const processing = getValue("Processing");
    const failed = getValue("Failed");
    const pending = getValue("Pending");

    return {
      completed,
      processing,
      failed,
      pending,
      total: completed + processing + failed + pending,
    };
  }, [analysisStatusData]);

  const reportGeneratedAt = useMemo(
    () =>
      new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  const overviewInsights = useMemo(() => {
    const allAnalyses = analyses || [];
    const completedAnalyses = allAnalyses.filter((item) => getAnalysisBucket(item.status) === "completed");

    const priorityCounts = {
      green: 0,
      amber: 0,
      red: 0,
      unknown: 0,
    };

    const riskSignals = {
      complianceRisk: 0,
      processFailure: 0,
      escalatedCalls: 0,
      repeatHighRisk: 0,
    };

    const issueMap = new Map<string, number>();
    const callOutcomeMap = new Map<string, number>();

    let qualitySum = 0;
    let cxSum = 0;
    let efficiencySum = 0;

    completedAnalyses.forEach((item) => {
      qualitySum += toNumber(item.final_scoring?.overall_call_quality_score);
      cxSum += toNumber(item.customer_experience?.cx_score);
      efficiencySum += toNumber(item.sla_and_efficiency?.handling_efficiency_score);

      const priority = String(item.final_scoring?.priority_flag || "unknown").toLowerCase();
      if (priority === "green") priorityCounts.green += 1;
      else if (priority === "amber" || priority === "yellow") priorityCounts.amber += 1;
      else if (priority === "red") priorityCounts.red += 1;
      else priorityCounts.unknown += 1;

      if (String(item.compliance_and_process_risk?.compliance_risk_present || "").toLowerCase() === "yes") {
        riskSignals.complianceRisk += 1;
      }
      if (String(item.compliance_and_process_risk?.process_failure_signal_present || "").toLowerCase() === "yes") {
        riskSignals.processFailure += 1;
      }
      if (String(item.escalation_analysis?.escalated || "").toLowerCase() === "yes") {
        riskSignals.escalatedCalls += 1;
      }
      if (String(item.repeat_contact_risk?.repeat_call_risk || "").toLowerCase() === "high") {
        riskSignals.repeatHighRisk += 1;
      }

      const issueCategory = String(item.issue_classification?.primary_issue_category || "Unspecified").trim();
      issueMap.set(issueCategory, (issueMap.get(issueCategory) || 0) + 1);

      const outcome = String(item.call_overview?.call_outcome || "Unknown").trim();
      callOutcomeMap.set(outcome, (callOutcomeMap.get(outcome) || 0) + 1);
    });

    const completedCount = completedAnalyses.length;
    const totalCount = allAnalyses.length;
    const completionRate = totalCount ? (completedCount / totalCount) * 100 : 0;

    const avgQuality = completedCount ? qualitySum / completedCount : 0;
    const avgCx = completedCount ? cxSum / completedCount : 0;
    const avgEfficiency = completedCount ? efficiencySum / completedCount : 0;

    const priorityFlagData = [
      { name: "Green", value: priorityCounts.green, fill: "#10B981" },
      { name: "Amber", value: priorityCounts.amber, fill: "#F59E0B" },
      { name: "Red", value: priorityCounts.red, fill: "#EF4444" },
      { name: "Unknown", value: priorityCounts.unknown, fill: "#94A3B8" },
    ];

    const topIssueData = Array.from(issueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));

    const callOutcomeData = Array.from(callOutcomeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));

    const insightBullets = [
      `Completion rate is ${toPercent(completionRate)} across ${totalCount} analysis records.`,
      `Average quality score is ${toPercent(avgQuality)} based on completed calls.`,
      `Top risk signals identified: ${riskSignals.processFailure + riskSignals.complianceRisk + riskSignals.repeatHighRisk}.`,
      `Escalation observed in ${riskSignals.escalatedCalls} completed calls.`,
    ];

    const issueBreakdown = Array.from(issueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        share: toRatioPercent(count, completedCount),
      }));

    const outcomeBreakdown = Array.from(callOutcomeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        share: toRatioPercent(value, completedCount),
      }));

    const reportMetrics = [
      {
        metric: "Compliance Risk Present",
        count: riskSignals.complianceRisk,
        share: toRatioPercent(riskSignals.complianceRisk, completedCount),
      },
      {
        metric: "Process Failure Signal",
        count: riskSignals.processFailure,
        share: toRatioPercent(riskSignals.processFailure, completedCount),
      },
      {
        metric: "Escalated Calls",
        count: riskSignals.escalatedCalls,
        share: toRatioPercent(riskSignals.escalatedCalls, completedCount),
      },
      {
        metric: "Repeat Call Risk = High",
        count: riskSignals.repeatHighRisk,
        share: toRatioPercent(riskSignals.repeatHighRisk, completedCount),
      },
    ];

    return {
      totalCount,
      completedCount,
      completionRate,
      avgQuality,
      avgCx,
      avgEfficiency,
      priorityFlagData,
      topIssueData,
      callOutcomeData,
      issueBreakdown,
      outcomeBreakdown,
      reportMetrics,
      riskSignals,
      insightBullets,
    };
  }, [analyses]);

  const analysisScoreTrendData = useMemo(() => {
    const normalized = (analyses || [])
      .filter((item) => getAnalysisBucket(item.status) === "completed")
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-10)
      .map((item, index) => ({
        call: `Call ${index + 1}`,
        quality: toNumber(item.final_scoring?.overall_call_quality_score),
        customerExperience: toNumber(item.customer_experience?.cx_score),
        efficiency: toNumber(item.sla_and_efficiency?.handling_efficiency_score),
      }));

    return normalized;
  }, [analyses]);

  const overviewSnapshot = useMemo(() => {
    const topPriority = [...overviewInsights.priorityFlagData].sort((a, b) => b.value - a.value)[0];
    const topIssue = overviewInsights.topIssueData[0];
    const topOutcome = overviewInsights.callOutcomeData[0];

    return {
      topPriorityLabel: topPriority?.name || "N/A",
      topPriorityCount: topPriority?.value || 0,
      topIssueLabel: topIssue?.name || "N/A",
      topIssueCount: topIssue?.count || 0,
      topOutcomeLabel: topOutcome?.name || "N/A",
      topOutcomeCount: topOutcome?.value || 0,
    };
  }, [overviewInsights]);

  const analysisByRecordingId = useMemo(() => {
    const map = new Map<string, Analysis>();
    (analyses || []).forEach((analysis) => {
      if (analysis.recording_id) {
        map.set(analysis.recording_id, analysis);
      }
    });
    return map;
  }, [analyses]);

  const filteredSortedRecordings = useMemo(() => {
    const statusOrder: Record<Exclude<AnalysisFilterStatus, "all">, number> = {
      completed: 0,
      processing: 1,
      pending: 2,
      failed: 3,
    };

    const term = callSearch.trim().toLowerCase();

    return [...(recordings || [])]
      .sort((a, b) => {
        const aAnalysis = analysisByRecordingId.get(a.id) || null;
        const bAnalysis = analysisByRecordingId.get(b.id) || null;
        const aStatus = getAnalysisBucket(aAnalysis?.status);
        const bStatus = getAnalysisBucket(bAnalysis?.status);

        if (statusOrder[aStatus] !== statusOrder[bStatus]) {
          return statusOrder[aStatus] - statusOrder[bStatus];
        }

        const aWordCount = getTranscriptWordCount(a.transcript);
        const bWordCount = getTranscriptWordCount(b.transcript);
        if (aWordCount !== bWordCount) {
          return bWordCount - aWordCount;
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .filter((recording) => {
        const analysis = analysisByRecordingId.get(recording.id) || null;
        const statusBucket = getAnalysisBucket(analysis?.status);

        if (analysisStatusFilter !== "all" && statusBucket !== analysisStatusFilter) {
          return false;
        }

        if (!term) {
          return true;
        }

        const name = getCallDisplayName(recording.file_name, analysis).toLowerCase();
        return name.includes(term);
      });
  }, [recordings, analysisByRecordingId, analysisStatusFilter, callSearch]);

  const totalCallsPages = Math.max(1, Math.ceil(filteredSortedRecordings.length / CALLS_PER_PAGE));
  const paginatedRecordings = useMemo(() => {
    const start = (callsPage - 1) * CALLS_PER_PAGE;
    const end = start + CALLS_PER_PAGE;
    return filteredSortedRecordings.slice(start, end);
  }, [filteredSortedRecordings, callsPage]);

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

  useEffect(() => {
    if (selectedTab === "calls") {
      setCallsPage(1);
    }
  }, [selectedTab, analysisStatusFilter, callSearch]);

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

  const openOverviewPanel = (recordingName: string, analysis: Analysis | null) => {
    if (!analysis || getAnalysisBucket(analysis.status) !== "completed") {
      toast({
        title: "Overview not ready",
        description: "Call overview is available only after analysis is completed.",
      });
      return;
    }

    const callOverview = (analysis.call_overview || {}) as Record<string, unknown>;
    setOverviewSheetCallName(recordingName);
    setOverviewSheetData(callOverview);
    setIsOverviewSheetOpen(true);
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
              <Card className="overflow-hidden border-0 bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-700 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-blue-100">Operations Snapshot</p>
                      <h2 className="mt-1 text-2xl font-semibold">Live Call Quality Intelligence</h2>
                      <p className="mt-2 text-sm text-blue-100">
                        Insights are generated from the current analysis table and refreshed in near real-time.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="border border-white/30 bg-white/15 text-white">
                        {overviewInsights.completedCount} Completed Analyses
                      </Badge>
                      <Badge className="border border-white/30 bg-white/15 text-white">
                        {toPercent(overviewInsights.completionRate)} Completion
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <OverviewStatCard
                  title="Total Calls"
                  value={String(kpis.totalCalls)}
                  subtitle="All calls currently in the system"
                  icon={Phone}
                  tone="blue"
                />
                <OverviewStatCard
                  title="Avg Sentiment"
                  value={toPercent(kpis.avgSentiment)}
                  subtitle="Customer sentiment across analyzed calls"
                  icon={TrendingUp}
                  tone="green"
                />
                <OverviewStatCard
                  title="Completion Rate"
                  value={toPercent(overviewInsights.completionRate)}
                  subtitle="Completed analyses out of all analysis rows"
                  icon={CheckCircle2}
                  tone="green"
                />
                <OverviewStatCard
                  title="Avg Quality"
                  value={toPercent(overviewInsights.avgQuality)}
                  subtitle="final_scoring.overall_call_quality_score"
                  icon={Activity}
                  tone="blue"
                />
                <OverviewStatCard
                  title="Avg CX"
                  value={toPercent(overviewInsights.avgCx)}
                  subtitle="customer_experience.cx_score"
                  icon={Waves}
                  tone="blue"
                />
                <OverviewStatCard
                  title="Avg Efficiency"
                  value={toPercent(overviewInsights.avgEfficiency)}
                  subtitle="sla_and_efficiency.handling_efficiency_score"
                  icon={BarChart3}
                  tone="amber"
                />
                <OverviewStatCard
                  title="Escalated Calls"
                  value={String(overviewInsights.riskSignals.escalatedCalls)}
                  subtitle="Calls with escalation_analysis.escalated = yes"
                  icon={AlertTriangle}
                  tone="rose"
                />
                <OverviewStatCard
                  title="High Repeat Risk"
                  value={String(overviewInsights.riskSignals.repeatHighRisk)}
                  subtitle="repeat_contact_risk.repeat_call_risk = high"
                  icon={RefreshCw}
                  tone="rose"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                  <CardHeader>
                    <CardTitle>Analysis Score Trend</CardTitle>
                    <CardDescription>Quality, customer experience, and efficiency across latest analyzed calls</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analysisScoreTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="call" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="quality" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="customerExperience" stroke="#0EA5E9" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="efficiency" stroke="#14B8A6" strokeWidth={3} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Analysis Status Mix</CardTitle>
                    <CardDescription>Distribution of analysis processing states</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={analysisStatusData} dataKey="value" nameKey="name" outerRadius={100} innerRadius={55}>
                          {analysisStatusData.map((entry, index) => (
                            <Cell key={`status-mix-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Actionable Insights</CardTitle>
                    <CardDescription>Auto-generated observations from analysis table</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {overviewInsights.insightBullets.map((insight, index) => (
                      <div key={`insight-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm text-slate-700">{insight}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Overview Snapshot</CardTitle>
                    <CardDescription>Most important distribution leaders from analyzed calls</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Top Priority Flag</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {overviewSnapshot.topPriorityLabel} ({overviewSnapshot.topPriorityCount} calls)
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Top Issue Category</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {overviewSnapshot.topIssueLabel} ({overviewSnapshot.topIssueCount} calls)
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Top Call Outcome</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {overviewSnapshot.topOutcomeLabel} ({overviewSnapshot.topOutcomeCount} calls)
                      </p>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <th className="px-3 py-2 font-medium">Risk Signal</th>
                            <th className="px-3 py-2 text-right font-medium">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t">
                            <td className="px-3 py-2 text-slate-700">Compliance Risk</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900">
                              {overviewInsights.riskSignals.complianceRisk}
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="px-3 py-2 text-slate-700">Process Failure</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900">
                              {overviewInsights.riskSignals.processFailure}
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="px-3 py-2 text-slate-700">Escalated Calls</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900">
                              {overviewInsights.riskSignals.escalatedCalls}
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="px-3 py-2 text-slate-700">High Repeat Risk</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900">
                              {overviewInsights.riskSignals.repeatHighRisk}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
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

              <Card>
                <CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-center">
                  <Input
                    value={callSearch}
                    onChange={(event) => setCallSearch(event.target.value)}
                    placeholder="Search by call name"
                  />

                  <Select
                    value={analysisStatusFilter}
                    onValueChange={(value) => setAnalysisStatusFilter(value as AnalysisFilterStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setCallSearch("");
                      setAnalysisStatusFilter("all");
                    }}
                    disabled={!callSearch && analysisStatusFilter === "all"}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>

              {recordingsLoading ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading calls...</p>
                  </CardContent>
                </Card>
              ) : !filteredSortedRecordings.length ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <p className="text-sm text-muted-foreground">No calls match the selected filters.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {paginatedRecordings.map((recording) => {
                    const analysis = analysisByRecordingId.get(recording.id) || null;
                    const ready = analysis?.status?.toLowerCase() === "completed";
                    const displayName = getCallDisplayName(recording.file_name, analysis);
                    const transcriptWordCount = getTranscriptWordCount(recording.transcript);

                    return (
                      <Card key={recording.id} className="border-border">
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{displayName}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {new Date(recording.created_at).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span>•</span>
                              <span>Transcript Words: {transcriptWordCount}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {getStatusBadge(analysis?.status)}
                            {ready ? (
                              <>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => handleRecordingClick(analysis)}
                                  title="Open Full Analysis"
                                  aria-label="Open Full Analysis"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => openOverviewPanel(displayName, analysis)}
                                  title="Open Overview Panel"
                                  aria-label="Open Overview Panel"
                                >
                                  <PanelRightOpen className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button size="sm" variant="outline" disabled>
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                Processing
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-600"
                              onClick={() => handleDeleteRecording(recording.id, displayName)}
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
                        -{Math.min(callsPage * CALLS_PER_PAGE, filteredSortedRecordings.length)} of {filteredSortedRecordings.length} calls
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
            <>
              <Card className="border border-slate-200 bg-white shadow-sm">
                <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-2xl text-slate-900">Call Analysis Report</CardTitle>
                    <CardDescription className="mt-1">
                      Professional summary of call analysis performance, issue trends, and outcome distribution.
                    </CardDescription>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Generated: {reportGeneratedAt}
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-3 font-medium">Executive Metric</th>
                          <th className="px-4 py-3 text-right font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="px-4 py-3 text-slate-700">Total Calls Uploaded</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{kpis.totalCalls}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-4 py-3 text-slate-700">Total Analysis Records</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{overviewInsights.totalCount}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-4 py-3 text-slate-700">Completed Analyses</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{overviewInsights.completedCount}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-4 py-3 text-slate-700">Completion Rate</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {toPercent(overviewInsights.completionRate)}
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-4 py-3 text-slate-700">Average Call Quality</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {toPercent(overviewInsights.avgQuality)}
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-4 py-3 text-slate-700">Average CX Score</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{toPercent(overviewInsights.avgCx)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-3 font-medium">Operational Snapshot</th>
                          <th className="px-4 py-3 text-right font-medium">Count</th>
                          <th className="px-4 py-3 text-right font-medium">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="px-4 py-3 text-slate-700">Completed</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{analysisStatusTotals.completed}</td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {toRatioPercent(analysisStatusTotals.completed, analysisStatusTotals.total)}
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-4 py-3 text-slate-700">Processing</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{analysisStatusTotals.processing}</td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {toRatioPercent(analysisStatusTotals.processing, analysisStatusTotals.total)}
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-4 py-3 text-slate-700">Pending</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{analysisStatusTotals.pending}</td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {toRatioPercent(analysisStatusTotals.pending, analysisStatusTotals.total)}
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-4 py-3 text-slate-700">Failed</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{analysisStatusTotals.failed}</td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {toRatioPercent(analysisStatusTotals.failed, analysisStatusTotals.total)}
                          </td>
                        </tr>
                        {overviewInsights.reportMetrics.map((metric) => (
                          <tr key={metric.metric} className="border-t">
                            <td className="px-4 py-3 text-slate-700">{metric.metric}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900">{metric.count}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{metric.share}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Priority Flag Distribution</CardTitle>
                    <CardDescription>Based on final_scoring.priority_flag</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={overviewInsights.priorityFlagData} dataKey="value" nameKey="name" outerRadius={90}>
                          {overviewInsights.priorityFlagData.map((entry, index) => (
                            <Cell key={`priority-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="xl:col-span-2">
                  <CardHeader>
                    <CardTitle>Top Issue Categories</CardTitle>
                    <CardDescription>Most frequent primary_issue_category values</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {overviewInsights.topIssueData.length ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={overviewInsights.topIssueData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={70} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground">No issue classification data available yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Call Outcome Distribution</CardTitle>
                    <CardDescription>Based on call_overview.call_outcome</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {overviewInsights.callOutcomeData.length ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={overviewInsights.callOutcomeData} dataKey="value" nameKey="name" outerRadius={90}>
                            {overviewInsights.callOutcomeData.map((entry, index) => (
                              <Cell
                                key={`outcome-${index}`}
                                fill={["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#14B8A6"][index % 6]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground">No call outcome data available yet.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Objection Pattern Report</CardTitle>
                    <CardDescription>Top objection themes from analyzed calls</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
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

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Issue Category Breakdown</CardTitle>
                    <CardDescription>Compact table view of issue category spread</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {overviewInsights.issueBreakdown.length ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                              <th className="py-2 pr-2 font-medium">Category</th>
                              <th className="py-2 px-2 font-medium">Calls</th>
                              <th className="py-2 pl-2 text-right font-medium">Share</th>
                            </tr>
                          </thead>
                          <tbody>
                            {overviewInsights.issueBreakdown.slice(0, 6).map((row) => (
                              <tr key={row.name} className="border-b last:border-0">
                                <td className="py-2 pr-2 text-foreground">{row.name}</td>
                                <td className="py-2 px-2 text-foreground">{row.count}</td>
                                <td className="py-2 pl-2 text-right text-muted-foreground">{row.share}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No issue data available yet.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Call Outcome Breakdown</CardTitle>
                    <CardDescription>Distribution by call_overview.call_outcome</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {overviewInsights.outcomeBreakdown.length ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                              <th className="py-2 pr-2 font-medium">Outcome</th>
                              <th className="py-2 px-2 font-medium">Calls</th>
                              <th className="py-2 pl-2 text-right font-medium">Share</th>
                            </tr>
                          </thead>
                          <tbody>
                            {overviewInsights.outcomeBreakdown.slice(0, 6).map((row) => (
                              <tr key={row.name} className="border-b last:border-0">
                                <td className="py-2 pr-2 text-foreground">{row.name}</td>
                                <td className="py-2 px-2 text-foreground">{row.value}</td>
                                <td className="py-2 pl-2 text-right text-muted-foreground">{row.share}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No call outcome data available yet.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Risk Signal Summary</CardTitle>
                    <CardDescription>Compact counts and shares across completed analyses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                            <th className="py-2 pr-2 font-medium">Metric</th>
                            <th className="py-2 px-2 font-medium">Count</th>
                            <th className="py-2 pl-2 text-right font-medium">Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overviewInsights.reportMetrics.map((metric) => (
                            <tr key={metric.metric} className="border-b last:border-0">
                              <td className="py-2 pr-2 text-foreground">{metric.metric}</td>
                              <td className="py-2 px-2 text-foreground">{metric.count}</td>
                              <td className="py-2 pl-2 text-right text-muted-foreground">{metric.share}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Executive Highlights</CardTitle>
                  <CardDescription>Key generated insights from the current analysis dataset</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {overviewInsights.insightBullets.map((insight, index) => (
                    <div key={`report-insight-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm leading-relaxed text-slate-700">{insight}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>

      <Sheet
        open={isOverviewSheetOpen}
        onOpenChange={(open) => {
          setIsOverviewSheetOpen(open);
          if (!open) {
            setOverviewSheetData(null);
            setOverviewSheetCallName("");
          }
        }}
      >
        <SheetContent side="right" className="w-[92vw] overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Call Overview</SheetTitle>
            <SheetDescription>{overviewSheetCallName || "Selected call"}</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {overviewSheetData && Object.keys(overviewSheetData).length ? (
              Object.entries(overviewSheetData).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titleize(key)}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">
                    {value === null || value === undefined || value === ""
                      ? "Not available"
                      : Array.isArray(value)
                        ? value.join(", ")
                        : typeof value === "object"
                          ? JSON.stringify(value, null, 2)
                          : String(value)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No call overview data available.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AddRecordingModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} onRecordingAdded={handleRecordingAdded} />
    </div>
  );
}
