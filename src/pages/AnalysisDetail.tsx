import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Activity, ArrowLeft, BarChart3, CheckCircle2, Clock, FileText, Headphones, Sparkles, TriangleAlert, Users } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Analysis, Recording, supabase } from "@/lib/supabase";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue | undefined };

type AnalysisSectionKey =
  | "call_overview"
  | "sla_and_efficiency"
  | "resolution_quality"
  | "script_adherence"
  | "compliance_and_process_risk"
  | "customer_experience"
  | "escalation_analysis"
  | "issue_classification"
  | "salesforce_tagging_integrity"
  | "agent_capability"
  | "repeat_contact_risk"
  | "business_and_cost_leakage"
  | "management_value"
  | "evidence"
  | "final_scoring";

type SectionTheme = {
  icon: React.ComponentType<{ className?: string }>;
  iconTone: string;
  cardTone: string;
  chipTone: string;
};

const ANALYSIS_SECTIONS: Array<{ key: AnalysisSectionKey; title: string; description: string }> = [
  { key: "call_overview", title: "Call Overview", description: "Primary call context and executive summary." },
  { key: "sla_and_efficiency", title: "SLA and Efficiency", description: "Handling, transfer, and delay indicators." },
  { key: "resolution_quality", title: "Resolution Quality", description: "Issue understanding and closure quality." },
  { key: "script_adherence", title: "Script Adherence", description: "Greeting, process flow, and closure adherence." },
  { key: "compliance_and_process_risk", title: "Compliance and Process Risk", description: "Risk signals and process failures." },
  { key: "customer_experience", title: "Customer Experience", description: "CX sentiment, effort, and empathy indicators." },
  { key: "escalation_analysis", title: "Escalation Analysis", description: "Escalation triggers, types, and quality." },
  { key: "issue_classification", title: "Issue Classification", description: "Primary and secondary issue tagging." },
  { key: "salesforce_tagging_integrity", title: "Salesforce Tagging Integrity", description: "Tag quality and reporting integrity checks." },
  { key: "agent_capability", title: "Agent Capability", description: "Communication, ownership, and coaching indicators." },
  { key: "repeat_contact_risk", title: "Repeat Contact Risk", description: "Likelihood and causes of repeated contact." },
  { key: "business_and_cost_leakage", title: "Business and Cost Leakage", description: "Risk, cost, and leakage signals." },
  { key: "management_value", title: "Management Value", description: "Leadership, governance, and action value." },
  { key: "evidence", title: "Evidence", description: "Positive and negative extracted evidence." },
  { key: "final_scoring", title: "Final Scoring", description: "Audit verdict and priority outcomes." },
];

const SECTION_THEME: Record<AnalysisSectionKey, SectionTheme> = {
  call_overview: {
    icon: FileText,
    iconTone: "border-blue-200 bg-blue-50 text-blue-700",
    cardTone: "border-blue-100 bg-blue-50/40",
    chipTone: "border-blue-200 bg-blue-50 text-blue-700",
  },
  sla_and_efficiency: {
    icon: Activity,
    iconTone: "border-cyan-200 bg-cyan-50 text-cyan-700",
    cardTone: "border-cyan-100 bg-cyan-50/40",
    chipTone: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  resolution_quality: {
    icon: CheckCircle2,
    iconTone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    cardTone: "border-emerald-100 bg-emerald-50/40",
    chipTone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  script_adherence: {
    icon: BarChart3,
    iconTone: "border-indigo-200 bg-indigo-50 text-indigo-700",
    cardTone: "border-indigo-100 bg-indigo-50/40",
    chipTone: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  compliance_and_process_risk: {
    icon: TriangleAlert,
    iconTone: "border-rose-200 bg-rose-50 text-rose-700",
    cardTone: "border-rose-100 bg-rose-50/40",
    chipTone: "border-rose-200 bg-rose-50 text-rose-700",
  },
  customer_experience: {
    icon: Users,
    iconTone: "border-amber-200 bg-amber-50 text-amber-700",
    cardTone: "border-amber-100 bg-amber-50/40",
    chipTone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  escalation_analysis: {
    icon: TriangleAlert,
    iconTone: "border-orange-200 bg-orange-50 text-orange-700",
    cardTone: "border-orange-100 bg-orange-50/40",
    chipTone: "border-orange-200 bg-orange-50 text-orange-700",
  },
  issue_classification: {
    icon: FileText,
    iconTone: "border-violet-200 bg-violet-50 text-violet-700",
    cardTone: "border-violet-100 bg-violet-50/40",
    chipTone: "border-violet-200 bg-violet-50 text-violet-700",
  },
  salesforce_tagging_integrity: {
    icon: BarChart3,
    iconTone: "border-sky-200 bg-sky-50 text-sky-700",
    cardTone: "border-sky-100 bg-sky-50/40",
    chipTone: "border-sky-200 bg-sky-50 text-sky-700",
  },
  agent_capability: {
    icon: Users,
    iconTone: "border-teal-200 bg-teal-50 text-teal-700",
    cardTone: "border-teal-100 bg-teal-50/40",
    chipTone: "border-teal-200 bg-teal-50 text-teal-700",
  },
  repeat_contact_risk: {
    icon: Activity,
    iconTone: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    cardTone: "border-fuchsia-100 bg-fuchsia-50/40",
    chipTone: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  },
  business_and_cost_leakage: {
    icon: BarChart3,
    iconTone: "border-yellow-200 bg-yellow-50 text-yellow-700",
    cardTone: "border-yellow-100 bg-yellow-50/40",
    chipTone: "border-yellow-200 bg-yellow-50 text-yellow-700",
  },
  management_value: {
    icon: Sparkles,
    iconTone: "border-lime-200 bg-lime-50 text-lime-700",
    cardTone: "border-lime-100 bg-lime-50/40",
    chipTone: "border-lime-200 bg-lime-50 text-lime-700",
  },
  evidence: {
    icon: FileText,
    iconTone: "border-slate-200 bg-slate-50 text-slate-700",
    cardTone: "border-slate-200 bg-slate-50/60",
    chipTone: "border-slate-200 bg-slate-50 text-slate-700",
  },
  final_scoring: {
    icon: CheckCircle2,
    iconTone: "border-green-200 bg-green-50 text-green-700",
    cardTone: "border-green-100 bg-green-50/40",
    chipTone: "border-green-200 bg-green-50 text-green-700",
  },
};

const isObject = (value: unknown): value is Record<string, JsonValue | undefined> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const toNumber = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
};

const titleize = (value: string): string => {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const shortValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "N/A";
  const text = typeof value === "string" ? value : String(value);
  return text.length > 48 ? `${text.slice(0, 48)}...` : text;
};

const getSectionHighlights = (value: Record<string, JsonValue | undefined> | null | undefined): string[] => {
  if (!isObject(value)) return [];

  const highlights: string[] = [];
  for (const [key, fieldValue] of Object.entries(value)) {
    if (fieldValue === null || fieldValue === undefined || fieldValue === "") continue;

    if (typeof fieldValue === "string" || typeof fieldValue === "number" || typeof fieldValue === "boolean") {
      highlights.push(`${titleize(key)}: ${shortValue(fieldValue)}`);
    } else if (Array.isArray(fieldValue) && fieldValue.length) {
      highlights.push(`${titleize(key)}: ${shortValue(fieldValue[0])}`);
    }

    if (highlights.length >= 3) break;
  }

  return highlights;
};

const statusTone = (status?: string) => {
  const normalized = (status || "pending").toLowerCase();

  if (["completed", "analyzed"].includes(normalized)) {
    return "bg-green-100 text-green-700 border-green-200";
  }

  if (["processing", "in_progress", "analyzing", "queued", "transcribing", "transcribed"].includes(normalized)) {
    return "bg-blue-100 text-blue-700 border-blue-200";
  }

  if (["failed", "error", "cancelled"].includes(normalized)) {
    return "bg-rose-100 text-rose-700 border-rose-200";
  }

  return "bg-amber-100 text-amber-700 border-amber-200";
};

const statusLabel = (status?: string): string => {
  const normalized = (status || "pending").toLowerCase();
  if (normalized === "completed" || normalized === "analyzed") return "Completed";
  if (["processing", "in_progress", "analyzing", "queued", "transcribing", "transcribed"].includes(normalized)) return "Processing";
  if (["failed", "error", "cancelled"].includes(normalized)) return "Failed";
  return "Pending";
};

const stripFileExtension = (value: string): string => value.replace(/\.[^/.]+$/, "");

const getCallDisplayName = (analysis: Analysis, recording: Recording | null): string => {
  const callId = analysis.call_overview?.call_id;
  if (typeof callId === "string" && callId.trim()) {
    return callId.trim();
  }

  const fallback = recording?.file_name?.trim() || "Recording";
  return stripFileExtension(fallback);
};

const scoreTone = (score: number) => {
  if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 60) return "text-blue-700 bg-blue-50 border-blue-200";
  if (score >= 40) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-rose-700 bg-rose-50 border-rose-200";
};

function ValueRenderer({ value, depth = 0 }: { value: JsonValue | undefined; depth?: number }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">Not available</span>;
  }

  if (typeof value === "boolean") {
    return <span>{value ? "Yes" : "No"}</span>;
  }

  if (typeof value === "number") {
    return <span>{Number.isInteger(value) ? value : value.toFixed(2)}</span>;
  }

  if (typeof value === "string") {
    return <span className="whitespace-pre-wrap break-words">{value}</span>;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return <span className="text-muted-foreground">None</span>;
    }

    const allPrimitive = value.every((item) => !isObject(item) && !Array.isArray(item));
    if (allPrimitive) {
      return (
        <div className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <Badge key={`${String(item)}-${index}`} variant="outline">
              {String(item)}
            </Badge>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={`array-item-${index}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <ValueRenderer value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (isObject(value)) {
    return <ObjectGrid data={value} depth={depth + 1} />;
  }

  return <span className="text-muted-foreground">Not available</span>;
}

function ObjectGrid({ data, depth = 0 }: { data: Record<string, JsonValue | undefined>; depth?: number }) {
  const entries = Object.entries(data);

  if (!entries.length) {
    return <span className="text-muted-foreground">Not available</span>;
  }

  return (
    <div className={depth === 0 ? "grid gap-3 md:grid-cols-2" : "space-y-2"}>
      {entries.map(([key, value]) => (
        <div
          key={`${key}-${depth}`}
          className={`rounded-xl border p-3 transition-colors ${
            depth > 0 ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white shadow-sm hover:border-blue-200"
          }`}
        >
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{titleize(key)}</p>
          <div className="text-sm text-slate-700">
            <ValueRenderer value={value} depth={depth} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  score,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  score: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const tone = scoreTone(score);

  return (
    <Card className="overflow-hidden border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <span className={`rounded-md border p-1.5 ${tone}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <Progress value={clampPercent(score)} className="h-2" />
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export default function AnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !user) return;

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const { data: analysisData, error: analysisError } = await supabase
          .from("analysis")
          .select("*")
          .eq("id", id)
          .single();

        if (analysisError) {
          throw analysisError;
        }

        setAnalysis(analysisData as Analysis);

        if (analysisData?.recording_id) {
          const { data: recordingData, error: recordingError } = await supabase
            .from("calls")
            .select("*")
            .eq("id", analysisData.recording_id)
            .single();

          if (recordingError) {
            throw recordingError;
          }

          setRecording(recordingData as Recording);
        } else {
          setRecording(null);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load analysis";
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const keyMetrics = useMemo(() => {
    const overallScore = toNumber(analysis?.final_scoring?.overall_call_quality_score);
    const cxScore = toNumber(analysis?.customer_experience?.cx_score);
    const handlingScore = toNumber(analysis?.sla_and_efficiency?.handling_efficiency_score);
    const capabilityScore = toNumber(analysis?.agent_capability?.agent_capability_score);

    return {
      overallScore,
      cxScore,
      handlingScore,
      capabilityScore,
    };
  }, [analysis]);

  const filledSections = useMemo(() => {
    if (!analysis) return [];

    return ANALYSIS_SECTIONS.map((section) => {
      const rawData = analysis[section.key] as Record<string, JsonValue | undefined> | null | undefined;
      let data = rawData;

      if (section.key === "call_overview" && isObject(rawData)) {
        const { call_id: _callId, ...rest } = rawData;
        data = rest;
      }

      const hasData = isObject(data) && Object.keys(data).length > 0;
      const fieldCount = isObject(data) ? Object.keys(data).length : 0;
      const highlights = getSectionHighlights(data);

      return {
        ...section,
        data,
        hasData,
        fieldCount,
        highlights,
      };
    });
  }, [analysis]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-4 text-muted-foreground">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Analysis Not Found</CardTitle>
            <CardDescription>{errorMessage || "The requested analysis could not be loaded."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/?view=dashboard&tab=calls")}>Return to Calls</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const executiveSummary = analysis.call_overview?.short_executive_summary as string | undefined;
  const finalVerdict = analysis.final_scoring?.final_audit_verdict as string | undefined;
  const outcome = analysis.call_overview?.call_outcome as string | undefined;
  const confidence = analysis.call_overview?.analysis_confidence as number | string | undefined;
  const displayName = getCallDisplayName(analysis, recording);
  const priorityFlag = String(analysis.final_scoring?.priority_flag || "unknown");
  const completedSectionCount = filledSections.filter((section) => section.hasData).length;
  const coveragePercent = Math.round((completedSectionCount / filledSections.length) * 100);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.08),_transparent_45%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.08),_transparent_45%)] bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/?view=dashboard&tab=calls")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-8" />
            <img src="/Bharat-Petroleum-Logo-2.png" alt="BP logo" className="h-10 w-auto" />
            <div>
              <h1 className="text-xl font-semibold text-primary">Call Analysis Report</h1>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {displayName} • {new Date(analysis.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={statusTone(analysis.status)}>
            <Activity className="mr-1 h-3 w-3" />
            {statusLabel(analysis.status)}
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <Card className="overflow-hidden border-0 bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-700 text-white shadow-lg">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-100">Analysis Snapshot</p>
                <h2 className="text-2xl font-semibold">{displayName}</h2>
                <p className="max-w-3xl text-sm text-blue-100">
                  {executiveSummary || "Analysis generated successfully. Review section-wise insights for audit, risk, and operational actions."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="border border-white/30 bg-white/15 text-white">{statusLabel(analysis.status)}</Badge>
                <Badge className="border border-white/30 bg-white/15 text-white">Priority: {priorityFlag}</Badge>
                <Badge className="border border-white/30 bg-white/15 text-white">Coverage: {coveragePercent}%</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-md border border-white/20 bg-white/10 p-3">
                <p className="text-blue-100">Call Outcome</p>
                <p className="mt-1 font-semibold text-white">{outcome || "Not available"}</p>
              </div>
              <div className="rounded-md border border-white/20 bg-white/10 p-3">
                <p className="text-blue-100">Analysis Confidence</p>
                <p className="mt-1 font-semibold text-white">{confidence !== undefined && confidence !== null ? String(confidence) : "Not available"}</p>
              </div>
              <div className="rounded-md border border-white/20 bg-white/10 p-3">
                <p className="text-blue-100">Sections Available</p>
                <p className="mt-1 font-semibold text-white">{completedSectionCount} / {filledSections.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Overall Quality"
            value={`${keyMetrics.overallScore.toFixed(0)}%`}
            subtitle="final_scoring.overall_call_quality_score"
            score={keyMetrics.overallScore}
            icon={BarChart3}
          />
          <MetricCard
            title="Customer Experience"
            value={`${keyMetrics.cxScore.toFixed(0)}%`}
            subtitle="customer_experience.cx_score"
            score={keyMetrics.cxScore}
            icon={Users}
          />
          <MetricCard
            title="Handling Efficiency"
            value={`${keyMetrics.handlingScore.toFixed(0)}%`}
            subtitle="sla_and_efficiency.handling_efficiency_score"
            score={keyMetrics.handlingScore}
            icon={Activity}
          />
          <MetricCard
            title="Agent Capability"
            value={`${keyMetrics.capabilityScore.toFixed(0)}%`}
            subtitle="agent_capability.agent_capability_score"
            score={keyMetrics.capabilityScore}
            icon={CheckCircle2}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Executive Summary
              </CardTitle>
              <CardDescription>Primary interpretation from call_overview and final_scoring</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="whitespace-pre-wrap leading-relaxed">{executiveSummary || "No executive summary available."}</p>
              </div>
              {finalVerdict ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Final Audit Verdict</p>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed">{finalVerdict}</p>
                </div>
              ) : null}
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-blue-800">
                <p className="text-xs font-semibold uppercase tracking-wide">Recommendation</p>
                <p className="mt-1">
                  Review all sections marked with low scores and high-risk flags first, then prioritize follow-up actions using the management and escalation insights.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5" />
                Recording and Transcript
              </CardTitle>
              <CardDescription>Audio preview and transcript from calls table</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recording?.stored_file_url ? <audio controls src={recording.stored_file_url} className="w-full" /> : null}

              <div className="rounded-md border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-2">
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <FileText className="h-4 w-4" />
                    Transcript
                  </p>
                </div>
                <ScrollArea className="h-[280px] px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{recording?.transcript || "No transcript available."}</p>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        {analysis.status?.toLowerCase() !== "completed" && analysis.status?.toLowerCase() !== "analyzed" ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-center gap-3 py-6 text-sm text-amber-800">
              <TriangleAlert className="h-5 w-5" />
              Analysis is not completed yet. Detailed JSON sections will appear once status becomes completed.
            </CardContent>
          </Card>
        ) : null}

        <Card className="overflow-hidden border shadow-sm">
          <CardHeader>
            <CardTitle>Detailed Analysis Sections</CardTitle>
            <CardDescription>Expand each section to inspect structured fields from the analysis table.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion
              type="multiple"
              defaultValue={filledSections.filter((section) => section.hasData).slice(0, 3).map((section) => section.key)}
              className="grid grid-cols-1 gap-4 xl:grid-cols-2"
            >
              {filledSections.map((section) => {
                const theme = SECTION_THEME[section.key];
                const Icon = theme.icon;

                return (
                  <AccordionItem
                    key={section.key}
                    value={section.key}
                    className={`rounded-2xl border shadow-sm transition-all duration-200 hover:shadow-md ${theme.cardTone}`}
                  >
                    <AccordionTrigger className="gap-3 px-4 py-4 hover:no-underline">
                      <div className="flex w-full flex-1 items-start gap-3 text-left">
                        <span className={`mt-0.5 rounded-lg border p-2 ${theme.iconTone}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">{section.title}</p>
                            <Badge variant={section.hasData ? "default" : "outline"}>
                              {section.hasData ? `${section.fieldCount} Fields` : "No Data"}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{section.description}</p>
                          {section.highlights.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {section.highlights.map((highlight, index) => (
                                <span
                                  key={`${section.key}-highlight-${index}`}
                                  className={`rounded-full border px-2 py-1 text-[11px] ${theme.chipTone}`}
                                >
                                  {highlight}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {section.hasData && isObject(section.data) ? (
                        <ObjectGrid data={section.data} />
                      ) : (
                        <p className="text-sm text-muted-foreground">No data available for this section.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
