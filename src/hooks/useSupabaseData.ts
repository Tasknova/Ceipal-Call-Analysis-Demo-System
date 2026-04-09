import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { Analysis, Recording, supabase } from "@/lib/supabase";

const toNumber = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const labelToScore = (value: unknown): number => {
  const label = String(value || "").toLowerCase();
  if (label === "positive") return 85;
  if (label === "neutral") return 60;
  if (label === "negative") return 35;
  return 0;
};

const confidenceToScore = (value: unknown): number => {
  const label = String(value || "").toLowerCase();
  if (label === "strong") return 9;
  if (label === "average") return 6;
  if (label === "weak") return 3;
  return 0;
};

export function useRecordings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("calls-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "calls",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["recordings", user.id] });
          queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["recordings", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.from("calls").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Recording[];
    },
    enabled: !!user,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });
}

export function useAnalyses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("analysis-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "analysis",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["analyses", user.id] });
          queryClient.invalidateQueries({ queryKey: ["recordings", user.id] });
          queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["analyses", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("analysis")
        .select(
          `
            *,
            calls (
              file_name,
              duration_seconds,
              created_at
            )
          `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (Analysis & { calls: Recording })[];
    },
    enabled: !!user,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });
}

export function useDashboardStats() {
  const { data: recordings } = useRecordings();
  const { data: analyses } = useAnalyses();

  return useQuery({
    queryKey: ["dashboard_stats", recordings, analyses],
    queryFn: () => {
      if (!recordings || !analyses) return null;

      const normalized = analyses.map((analysis) => {
        const qualityScore = toNumber(analysis.final_scoring?.overall_call_quality_score);
        const cxScore = toNumber(analysis.customer_experience?.cx_score) || labelToScore(analysis.customer_experience?.closing_customer_sentiment);
        const efficiencyScore = toNumber(analysis.sla_and_efficiency?.handling_efficiency_score);
        const resolutionScore = toNumber(analysis.resolution_quality?.resolution_quality_score);
        const capabilityScore = toNumber(analysis.agent_capability?.agent_capability_score);
        const engagementScore =
          (efficiencyScore + resolutionScore + capabilityScore) /
          [efficiencyScore, resolutionScore, capabilityScore].filter((v) => v > 0).length ||
          0;

        const confidenceExecutive = confidenceToScore(analysis.agent_capability?.confidence_level);
        const confidencePerson = confidenceToScore(analysis.agent_capability?.communication_clarity);
        const processFailure = String(analysis.compliance_and_process_risk?.process_failure_signal_present || "").toLowerCase() === "yes";
        const escalation = String(analysis.escalation_analysis?.escalated || "").toLowerCase() === "yes";
        const repeatRisk = String(analysis.repeat_contact_risk?.repeat_call_risk || "").toLowerCase();

        return {
          ...analysis,
          qualityScore,
          sentimentScore: cxScore,
          engagementScore,
          confidenceExecutive,
          confidencePerson,
          objectionsRaised: processFailure || escalation || repeatRisk === "high" ? 1 : 0,
          objectionsHandled: qualityScore >= 70 ? 1 : 0,
        };
      });

      const totalCalls = recordings.length;
      const avgSentiment = normalized.reduce((sum, a) => sum + a.sentimentScore, 0) / (normalized.length || 1);
      const avgEngagement = normalized.reduce((sum, a) => sum + a.engagementScore, 0) / (normalized.length || 1);
      const avgConfidenceExecutive = normalized.reduce((sum, a) => sum + a.confidenceExecutive, 0) / (normalized.length || 1);
      const avgConfidencePerson = normalized.reduce((sum, a) => sum + a.confidencePerson, 0) / (normalized.length || 1);

      const totalObjectionsRaised = normalized.reduce((sum, a) => sum + a.objectionsRaised, 0);
      const totalObjectionsTackled = normalized.reduce((sum, a) => sum + a.objectionsHandled, 0);
      const objectionSuccessRate = totalObjectionsRaised > 0 ? (totalObjectionsTackled / totalObjectionsRaised) * 100 : 0;

      const highPerformingCalls = normalized.filter((a) => a.qualityScore >= 80).length;
      const callsWithNextSteps = normalized.filter(
        (a) => String(a.call_overview?.call_summary?.call_outcome || "").trim().length > 0
      ).length;

      const sentimentData = [
        { name: "Perfect", value: normalized.filter((a) => a.sentimentScore >= 90).length, color: "#10B981" },
        { name: "Excellent", value: normalized.filter((a) => a.sentimentScore >= 80 && a.sentimentScore < 90).length, color: "#059669" },
        { name: "Good", value: normalized.filter((a) => a.sentimentScore >= 70 && a.sentimentScore < 80).length, color: "hsl(var(--accent-blue))" },
        { name: "Neutral", value: normalized.filter((a) => a.sentimentScore >= 50 && a.sentimentScore < 70).length, color: "#F59E0B" },
        { name: "Negative", value: normalized.filter((a) => a.sentimentScore < 50).length, color: "#EF4444" },
      ];

      const trendData = normalized.slice(-7).map((a) => ({
        date: new Date(a.created_at).toLocaleDateString("en-US", { weekday: "short" }),
        sentiment: Math.round(a.sentimentScore),
        engagement: Math.round(a.engagementScore),
      }));

      const engagementData = [
        { level: "Perfect", count: normalized.filter((a) => a.engagementScore >= 90).length, fill: "#10B981" },
        { level: "Excellent", count: normalized.filter((a) => a.engagementScore >= 80 && a.engagementScore < 90).length, fill: "#059669" },
        { level: "Good", count: normalized.filter((a) => a.engagementScore >= 70 && a.engagementScore < 80).length, fill: "hsl(var(--accent-blue))" },
        { level: "Neutral", count: normalized.filter((a) => a.engagementScore >= 50 && a.engagementScore < 70).length, fill: "#F59E0B" },
        { level: "Negative", count: normalized.filter((a) => a.engagementScore < 50).length, fill: "#EF4444" },
      ];

      const objectionData = [
        { category: "Escalation", count: normalized.filter((a) => String(a.escalation_analysis?.escalated || "").toLowerCase() === "yes").length },
        { category: "Compliance", count: normalized.filter((a) => String(a.compliance_and_process_risk?.compliance_risk_present || "").toLowerCase() === "yes").length },
        { category: "Process Failure", count: normalized.filter((a) => String(a.compliance_and_process_risk?.process_failure_signal_present || "").toLowerCase() === "yes").length },
        { category: "Repeat Risk", count: normalized.filter((a) => ["medium", "high"].includes(String(a.repeat_contact_risk?.repeat_call_risk || "").toLowerCase())).length },
        { category: "Customer Effort", count: normalized.filter((a) => ["medium", "high"].includes(String(a.customer_experience?.customer_effort_risk || "").toLowerCase())).length },
      ];

      const last10CallsSentiment = normalized.slice(0, 10).reverse().map((analysis, index) => ({
        call: `Call ${index + 1}`,
        callName: analysis.calls?.file_name?.replace(".mp3", "") || `Call ${index + 1}`,
        sentiment: Math.round(analysis.sentimentScore),
        engagement: Math.round(analysis.engagementScore),
        date: new Date(analysis.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }));

      const last10CallsConfidence = normalized.slice(0, 10).reverse().map((analysis, index) => ({
        call: `Call ${index + 1}`,
        callName: analysis.calls?.file_name?.replace(".mp3", "").substring(0, 8) || `Call ${index + 1}`,
        executive: analysis.confidenceExecutive,
        person: analysis.confidencePerson,
        date: new Date(analysis.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }));

      const last10CallsObjections = normalized.slice(0, 10).reverse().map((analysis, index) => ({
        call: `Call ${index + 1}`,
        callName: analysis.calls?.file_name?.replace(".mp3", "").substring(0, 8) || `Call ${index + 1}`,
        raised: analysis.objectionsRaised,
        tackled: analysis.objectionsHandled,
        date: new Date(analysis.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }));

      const recentCalls = normalized.slice(0, 4).map((analysis, index) => ({
        id: analysis.id,
        name: analysis.calls?.file_name?.replace(".mp3", "") || `Call ${index + 1}`,
        date: new Date(analysis.created_at).toLocaleDateString(),
        duration: analysis.calls?.duration_seconds
          ? `${Math.floor(analysis.calls.duration_seconds / 60)}:${(analysis.calls.duration_seconds % 60)
              .toString()
              .padStart(2, "0")}`
          : "N/A",
        sentiment: Math.round(analysis.sentimentScore),
        engagement: Math.round(analysis.engagementScore),
        confidenceExecutive: analysis.confidenceExecutive,
        confidencePerson: analysis.confidencePerson,
        status: analysis.status || "unknown",
        objections: analysis.objectionsRaised > 0 ? "Detected" : "None",
        nextSteps: String(analysis.call_overview?.call_summary?.call_outcome || "TBD"),
        improvements: String(analysis.management_value?.leadership_visibility_value || "N/A"),
        callOutcome: String(analysis.call_overview?.call_summary?.call_outcome || "Unknown"),
      }));

      return {
        kpiData: {
          totalCalls,
          avgSentiment,
          avgEngagement,
          avgConfidenceExecutive,
          avgConfidencePerson,
          objectionsHandled: totalObjectionsTackled,
          highPerformingCalls,
          callsWithNextSteps,
          totalObjectionsRaised,
          totalObjectionsTackled,
          objectionSuccessRate,
          hotLeads: 0,
          warmLeads: 0,
          coldLeads: 0,
        },
        sentimentData,
        trendData,
        engagementData,
        objectionData,
        last10CallsSentiment,
        last10CallsConfidence,
        last10CallsObjections,
        recentCalls,
      };
    },
    enabled: !!recordings && !!analyses,
  });
}

export function useDeleteRecording() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (recordingId: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error: analysisError } = await supabase.from("analysis").delete().eq("recording_id", recordingId);
      if (analysisError) {
        console.error("Error deleting analyses:", analysisError);
      }

      const { error } = await supabase.from("calls").delete().eq("id", recordingId);
      if (error) throw error;
      return recordingId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recordings"] });
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
    },
    onError: (error) => {
      console.error("Failed to delete recording:", error);
    },
  });
}
