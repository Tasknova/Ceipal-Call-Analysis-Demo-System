import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Upload, Play, Download, MoreHorizontal, TrendingUp, TrendingDown, Users, Phone, Star, AlertTriangle, Trash2, BarChart3, Loader2, User, UserPlus, FolderOpen, FileSpreadsheet, RefreshCw, Smile, Meh, Frown, Flame, ThumbsUp, ThumbsDown, Zap, HelpCircle, AlertCircle, Clock, Brain } from "lucide-react";
import { useDashboardStats, useRecordings, useAnalyses, useDeleteRecording, useLeads } from "@/hooks/useSupabaseData";
import AddRecordingModal from "./AddRecordingModal";
import AllLeadsPage from "./AllLeadsPage";
import LeadGroupsPage from "./LeadGroupsPage";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAnalysisNotifications } from "@/hooks/useAnalysisNotifications";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Analysis } from "@/lib/supabase";

interface DashboardProps {
  onShowProfile?: () => void;
  onShowBrain?: () => void;
}

export default function Dashboard({ onShowProfile, onShowBrain }: DashboardProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { data: dashboardData, isLoading, error } = useDashboardStats();
  const { data: recordings, isLoading: recordingsLoading } = useRecordings();
  const { data: analyses } = useAnalyses();
  const { data: leads } = useLeads();
  const deleteRecording = useDeleteRecording();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Calculate lead counts from leads table
  const totalLeads = leads?.length || 0;
  const hotLeads = leads?.filter(l => l.lead_type?.toLowerCase() === 'hot').length || 0;
  const warmLeads = leads?.filter(l => l.lead_type?.toLowerCase() === 'warm').length || 0;
  const coldLeads = leads?.filter(l => l.lead_type?.toLowerCase() === 'cold').length || 0;
  
  // Enable analysis notifications for real-time status updates
  useAnalysisNotifications();

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    setSearchParams({ tab, view: 'dashboard' }, { replace: true });
  };

  const getSentimentColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-accent-blue";
    return "text-warning";
  };

  const getSentimentIcon = (score: number) => {
    if (score >= 80) return <Smile className="h-4 w-4" />;
    if (score >= 60) return <Meh className="h-4 w-4" />;
    return <Frown className="h-4 w-4" />;
  };

  const getEngagementIcon = (score: number) => {
    if (score >= 80) return <Flame className="h-4 w-4" />;
    if (score >= 60) return <ThumbsUp className="h-4 w-4" />;
    return <ThumbsDown className="h-4 w-4" />;
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 8) return <Zap className="h-4 w-4" />;
    if (score >= 6) return <ThumbsUp className="h-4 w-4" />;
    if (score >= 4) return <HelpCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 8) return "text-success";
    if (score >= 6) return "text-accent-blue";
    if (score >= 4) return "text-warning";
    return "text-destructive";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
      case "analyzed":
        return <Badge className="bg-success-light text-success">Completed</Badge>;
      case "processing":
      case "in_progress":
      case "analyzing":
        return (
          <Badge className="bg-accent-blue-light text-accent-blue flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case "transcribing":
      case "transcribed":
        return (
          <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Transcribing
          </Badge>
        );
      case "queued":
      case "pending":
      case "uploaded":
        return (
          <Badge className="bg-accent-blue-light text-accent-blue flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Queued
          </Badge>
        );
      case "failed":
      case "error":
        return <Badge className="bg-destructive-light text-destructive">Failed</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-700">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading || !dashboardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent-blue mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-warning mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">Error loading dashboard</p>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Phone className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No data available</p>
          <p className="text-muted-foreground">Upload some recordings to see your dashboard</p>
        </div>
      </div>
    );
  }

  const { kpiData, sentimentData, trendData, engagementData, objectionData, recentCalls, last10CallsSentiment, last10CallsConfidence, last10CallsObjections } = dashboardData;

  const handleRecordingAdded = () => {
    // Invalidate and refetch all queries to refresh the dashboard
    queryClient.invalidateQueries({ queryKey: ['recordings'] });
    queryClient.invalidateQueries({ queryKey: ['analyses'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
  };

  const handleDeleteRecording = async (recordingId: string, fileName: string) => {
    if (window.confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      try {
        await deleteRecording.mutateAsync(recordingId);
        toast({
          title: "Success",
          description: `"${fileName}" has been deleted successfully.`,
        });
      } catch (error) {
        console.error('Delete failed:', error);
        toast({
          title: "Error",
          description: `Failed to delete "${fileName}". Please try again.`,
          variant: "destructive",
        });
      }
    }
  };

  const handleRecordingClick = (analysis: Analysis | null, recording: any, recordingName: string, source: 'overview' | 'recordings' = 'recordings') => {
    if (analysis && analysis.status?.toLowerCase() === 'completed') {
      navigate(`/analysis/${analysis.id}?from=${source}`);
    } else {
      toast({
        title: "No Analysis Available",
        description: "This recording hasn't been analyzed yet or the analysis is still pending.",
        variant: "default",
      });
    }
  };

  const handleRetryRecording = async (recording: any, analysis: any) => {
    const WEBHOOK_URL = "https://n8nautomation.site/webhook/ad2aa239-7a2f-467d-a95a-a66a2ca43537";
    const { supabase } = await import('@/lib/supabase');
    
    try {
      // Update status to processing IMMEDIATELY before sending webhook
      if (analysis?.id) {
        await supabase
          .from('analyses')
          .update({ status: 'processing' })
          .eq('id', analysis.id);
      }

      // Invalidate queries immediately to reflect the status change
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
      queryClient.invalidateQueries({ queryKey: ['analyses'] });

      toast({
        title: "Retrying Analysis",
        description: "Sending recording for reprocessing...",
      });

      const webhookPayload = {
        recording_id: recording.id,
        analysis_id: analysis?.id || null,
        recording_name: recording.file_name || 'Unnamed Recording',
        recording_url: recording.stored_file_url
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (response.ok) {
        toast({
          title: "Retry Successful",
          description: "Your recording has been queued for reprocessing.",
        });
      } else {
        throw new Error(`Webhook returned ${response.status}`);
      }
    } catch (error) {
      console.error('Retry failed:', error);
      
      // Revert status back to failed if webhook fails
      if (analysis?.id) {
        await supabase
          .from('analyses')
          .update({ status: 'failed' })
          .eq('id', analysis.id);
        
        queryClient.invalidateQueries({ queryKey: ['recordings'] });
        queryClient.invalidateQueries({ queryKey: ['analyses'] });
      }
      
      toast({
        title: "Retry Failed",
        description: "Failed to send recording for reprocessing. Please try again.",
        variant: "destructive",
      });
    }
  };



  return (
    <div className="min-h-screen bg-background">
      {/* Header - Clean Modern */}
      <header className="border-b border-border bg-card px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity duration-300" onClick={() => navigate('/')}>
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <div className="border-l border-border pl-6">
              <h1 className="text-xl font-semibold text-primary tracking-wide">Ceipal Voice Intelligence</h1>
              <p className="text-xs text-muted-foreground">AI Powered. People Driven.</p>
            </div>
          </div>
          <Button 
            variant="ghost"
            onClick={() => window.location.href = '/'}
            className="text-muted-foreground hover:text-foreground hover:bg-gray-50 font-medium transition-all"
          >
            Logout
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Elegant Minimal */}
        <aside className="w-72 border-r border-border bg-card px-6 py-8">
          <nav className="space-y-2">
              <Button 
                variant="ghost"
                className={`w-full justify-start font-medium text-sm transition-all ${selectedTab === "overview" ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "text-muted-foreground hover:text-foreground hover:bg-gray-50"}`}
                onClick={() => handleTabChange("overview")}
              >
                <TrendingUp className="h-4 w-4 mr-3" />
                Overview
              </Button>
              <Button 
                variant="ghost"
                className={`w-full justify-start font-medium text-sm transition-all ${selectedTab === "recordings" ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "text-muted-foreground hover:text-foreground hover:bg-gray-50"}`}
                onClick={() => handleTabChange("recordings")}
              >
                <Phone className="h-4 w-4 mr-3" />
                Call History
              </Button>
              
              {/* Leads Section */}
              <Button 
                variant="ghost"
                className={`w-full justify-start font-medium text-sm transition-all ${selectedTab === "leads" ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "text-muted-foreground hover:text-foreground hover:bg-gray-50"}`}
                onClick={() => handleTabChange("leads")}
              >
                <UserPlus className="h-4 w-4 mr-3" />
                Leads
              </Button>
              
              {/* Brain Section */}
              <Button 
                variant="ghost"
                className="w-full justify-start font-medium text-sm transition-all text-muted-foreground hover:text-foreground hover:bg-gray-50"
                onClick={onShowBrain}
              >
                <Brain className="h-4 w-4 mr-3" />
                Company Brain
              </Button>
          </nav>
        </aside>

        {/* Main Content - Spacious Layout */}
        <main className="flex-1 p-10 bg-background">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsContent value="overview" className="space-y-8">
              {/* First Row - Main KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border border-border hover:shadow-md transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Calls</CardTitle>
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Phone className="h-5 w-5 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold tracking-tight text-gray-900">{kpiData.totalCalls}</div>
                    <p className="text-xs text-gray-500 mt-1">
                      Total recorded calls
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">High Performing</CardTitle>
                    <div className="p-2 rounded-lg bg-emerald-100">
                      <Star className="h-5 w-5 text-emerald-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-emerald-600">
                      {kpiData.highPerformingCalls || 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Calls with 80%+ sentiment & 75%+ engagement
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Avg Sentiment</CardTitle>
                    <div className="p-2 rounded-lg bg-emerald-100">
                      <Star className="h-5 w-5 text-emerald-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-emerald-600">
                      {kpiData.avgSentiment.toFixed(0)}%
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Average call sentiment score
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Avg Engagement</CardTitle>
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {kpiData.avgEngagement.toFixed(0)}%
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Average engagement level
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Second Row - Lead Distribution Chart and Objection Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lead Distribution Pie Chart - Spans 2 rows on left */}
                <Card className="lg:row-span-2 hover:shadow-md transition-all duration-300">
                  <CardHeader>
                    <CardTitle>Lead Distribution</CardTitle>
                    <CardDescription>Distribution by lead type</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center h-[320px] px-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Hot Leads', value: hotLeads, color: '#ef4444' },
                            { name: 'Warm Leads', value: warmLeads, color: '#f59e0b' },
                            { name: 'Cold Leads', value: coldLeads, color: '#3b82f6' },
                            { name: 'Closing', value: leads?.filter(l => l.lead_type?.toLowerCase() === 'closing').length || 0, color: '#10b981' }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={85}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            { name: 'Hot Leads', value: hotLeads, color: '#ef4444' },
                            { name: 'Warm Leads', value: warmLeads, color: '#f59e0b' },
                            { name: 'Cold Leads', value: coldLeads, color: '#3b82f6' },
                            { name: 'Closing', value: leads?.filter(l => l.lead_type?.toLowerCase() === 'closing').length || 0, color: '#10b981' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend 
                          verticalAlign="bottom" 
                          height={40}
                          wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                          formatter={(value, entry: any) => {
                            const percentage = totalLeads > 0 ? ((entry.payload.value / totalLeads) * 100).toFixed(0) : 0;
                            return `${value} (${percentage}%)`;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Objections Detected - Square */}
                <Card className="hover:shadow-md transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Objections Detected</CardTitle>
                    <div className="p-2 rounded-lg bg-rose-100">
                      <AlertTriangle className="h-5 w-5 text-rose-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col justify-center h-[120px]">
                    <div className="text-4xl font-bold text-rose-600">{kpiData.totalObjectionsRaised}</div>
                    <p className="text-xs text-gray-500 mt-2">
                      Total objections raised
                    </p>
                  </CardContent>
                </Card>

                {/* Objections Handled - Square */}
                <Card className="hover:shadow-md transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Objections Handled</CardTitle>
                    <div className="p-2 rounded-lg bg-amber-100">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col justify-center h-[120px]">
                    <div className="text-4xl font-bold text-amber-600">{kpiData.totalObjectionsTackled}</div>
                    <p className="text-xs text-gray-500 mt-2">
                      Successfully addressed
                    </p>
                  </CardContent>
                </Card>

                {/* Objection Success - Rectangle spanning 2 columns */}
                <Card className="lg:col-span-2 hover:shadow-md transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Objection Success Rate</CardTitle>
                    <div className="p-2 rounded-lg bg-emerald-100">
                      <ThumbsUp className="h-5 w-5 text-emerald-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between h-[120px]">
                    <div>
                      <div className="text-4xl font-bold text-emerald-600">
                        {kpiData.objectionSuccessRate.toFixed(0)}%
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {kpiData.totalObjectionsTackled}/{kpiData.totalObjectionsRaised} objections successfully handled
                      </p>
                    </div>
                    <div className="h-20 w-20 rounded-full border-8 border-emerald-200 flex items-center justify-center">
                      <span className="text-2xl font-bold text-emerald-600">{kpiData.objectionSuccessRate.toFixed(0)}%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Last 10 Calls Analysis Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Last 10 Calls - Sentiment & Engagement Trend</CardTitle>
                    <CardDescription>Sentiment and engagement progression over recent calls</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={last10CallsSentiment}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="call" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          formatter={(value, name) => [`${value}%`, name === 'sentiment' ? 'Sentiment' : 'Engagement']}
                          labelFormatter={(label) => {
                            const item = last10CallsSentiment.find(d => d.call === label);
                            return item ? `${item.callName} (${item.date})` : label;
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="sentiment" 
                          name="Sentiment"
                          stroke="hsl(var(--success))" 
                          strokeWidth={3}
                          dot={{ fill: 'hsl(var(--success))', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: 'hsl(var(--success))', strokeWidth: 2 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="engagement" 
                          name="Engagement"
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Call Analyses</CardTitle>
                    <CardDescription>Click on any call to view detailed analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recordings?.slice(0, 5).map((recording) => {
                        const analysis = analyses?.find(a => a.recording_id === recording.id);
                        const hasAnalysis = analysis && analysis.status?.toLowerCase() === 'completed';
                        
                        return (
                          <div 
                            key={recording.id} 
                            className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                              hasAnalysis ? 'cursor-pointer hover:bg-slate-50 hover:border-amber-300' : 'opacity-60'
                            }`}
                            onClick={() => hasAnalysis && handleRecordingClick(analysis, recording, recording.file_name || 'Unnamed Recording', 'overview')}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`p-2 rounded-lg ${hasAnalysis ? 'bg-amber-100' : 'bg-gray-100'}`}>
                                <Play className={`h-4 w-4 ${hasAnalysis ? 'text-amber-600' : 'text-gray-400'}`} />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-sm text-slate-900">
                                  {recording.file_name?.replace('.mp3', '').replace('.wav', '').replace('.m4a', '') || 'Unnamed Recording'}
                                </h4>
                                <p className="text-xs text-slate-500">
                                  {new Date(recording.created_at).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                            {hasAnalysis ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                View Analysis
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">
                                {analysis?.status === 'processing' ? 'Processing...' : 'Pending'}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="recordings" className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Call History</h2>
                  <p className="text-sm text-slate-600 mt-1">Complete history of your call recordings and analyses</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['recordings'] });
                      queryClient.invalidateQueries({ queryKey: ['analyses'] });
                      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
                      toast({
                        title: "Refreshing...",
                        description: "Updating call analysis status",
                      });
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button onClick={() => setIsAddModalOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Add Call
                  </Button>
                </div>
              </div>

              {recordingsLoading ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue mx-auto mb-4"></div>
                      <p className="text-slate-600">Loading recordings...</p>
                    </div>
                  </CardContent>
                </Card>
              ) : !recordings || recordings.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No recordings yet</h3>
                    <p className="text-muted-foreground mb-4">Upload your first recording to get started</p>
                    <Button onClick={() => setIsAddModalOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Add Recording
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {recordings.map((recording) => {
                    const analysis = analyses?.find(a => a.recording_id === recording.id);
                    const hasDetailedAnalysis = analysis && analysis.status?.toLowerCase() === 'completed';
                    
                    // Get lead status badge
                    const getLeadStatusBadge = () => {
                      if (!analysis?.lead_type) return null;
                      const status = analysis.lead_type.toLowerCase();
                      if (status.includes('hot')) return <Badge className="bg-rose-500 text-white">Hot Lead</Badge>;
                      if (status.includes('warm')) return <Badge className="bg-amber-500 text-white">Warm Lead</Badge>;
                      if (status.includes('cold')) return <Badge className="bg-blue-500 text-white">Cold Lead</Badge>;
                      return null;
                    };

                    return (
                      <Card 
                        key={recording.id}
                        className={`hover:shadow-md transition-shadow duration-200 ${
                          hasDetailedAnalysis ? 'cursor-pointer' : ''
                        }`}
                        onClick={() => hasDetailedAnalysis && handleRecordingClick(analysis, recording, recording.file_name || 'Unnamed Recording')}
                      >
                        <CardContent className="p-6">
                          {/* Recording Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="p-3 bg-blue-100 rounded-lg">
                                <Phone className="h-6 w-6 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <h4 className="text-lg font-semibold text-slate-900">
                                    {recording.file_name || 'Unnamed Recording'}
                                  </h4>
                                  {getLeadStatusBadge()}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                                  {recording.leads ? (
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span className="font-medium">{recording.leads.name}</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-slate-400">
                                      <User className="h-3 w-3" />
                                      No lead assigned
                                    </span>
                                  )}
                                  {recording.call_date && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {new Date(recording.call_date).toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric', 
                                          year: 'numeric'
                                        })}
                                      </span>
                                      <span>
                                        {new Date(recording.call_date).toLocaleTimeString('en-US', { 
                                          hour: '2-digit', 
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    </>
                                  )}
                                  {recording.duration_seconds && (
                                    <>
                                      <span>•</span>
                                      <span>
                                        {Math.floor(recording.duration_seconds / 60)}:{(recording.duration_seconds % 60).toString().padStart(2, '0')} min
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            {getStatusBadge(analysis?.status || 'pending')}
                          </div>

                          {/* Analysis Metrics */}
                          {hasDetailedAnalysis && (
                            <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-200 mb-4">
                              {analysis.sentiments_score !== null && analysis.sentiments_score !== undefined && (
                                <div className="text-center">
                                  <p className="text-xs text-slate-600 mb-1">Sentiment</p>
                                  <p className={`text-xl font-semibold ${getSentimentColor(analysis.sentiments_score)}`}>
                                    {analysis.sentiments_score}%
                                  </p>
                                </div>
                              )}
                              {analysis.engagement_score !== null && analysis.engagement_score !== undefined && (
                                <div className="text-center">
                                  <p className="text-xs text-slate-600 mb-1">Engagement</p>
                                  <p className={`text-xl font-semibold ${getSentimentColor(analysis.engagement_score)}`}>
                                    {analysis.engagement_score}%
                                  </p>
                                </div>
                              )}
                              {analysis.confidence_score_executive !== null && analysis.confidence_score_executive !== undefined && (
                                <div className="text-center">
                                  <p className="text-xs text-slate-600 mb-1">Confidence</p>
                                  <p className="text-xl font-semibold text-blue-600">
                                    {analysis.confidence_score_executive}/10
                                  </p>
                                </div>
                              )}
                              {analysis.lead_type && (
                                <div className="text-center">
                                  <p className="text-xs text-slate-600 mb-1">Call Type</p>
                                  <p className="text-sm font-medium text-slate-900">
                                    {analysis.lead_type}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-4 border-t border-slate-200" onClick={(e) => e.stopPropagation()}>
                            {hasDetailedAnalysis ? (
                              <Button 
                                size="sm"
                                variant="default"
                                className="bg-amber-500 hover:bg-amber-600 text-xs rounded-md"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRecordingClick(analysis, recording, recording.file_name || 'Unnamed Recording');
                                }}
                              >
                                <Play className="h-3.5 w-3.5 mr-1.5" />
                                View Analysis
                              </Button>
                            ) : (
                              <Button 
                                size="sm"
                                variant="outline"
                                className="text-xs rounded-md"
                                disabled
                              >
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                Processing
                              </Button>
                            )}
                            
                            {(analysis?.status === 'failed' || analysis?.status === 'error') && (
                              <Button 
                                size="sm"
                                variant="outline" 
                                className="text-blue-600 hover:bg-blue-50 border-blue-200 text-xs rounded-md"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetryRecording(recording, analysis);
                                }}
                              >
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                Retry
                              </Button>
                            )}
                            
                            <Button 
                              size="sm"
                              variant="outline"
                              className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs rounded-md"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRecording(recording.id, recording.file_name || 'Unnamed Recording');
                              }}
                              disabled={deleteRecording.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Leads Tab */}
            <TabsContent value="leads" className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-3xl font-bold text-foreground">Lead Management</h1>
                </div>
                <Tabs defaultValue="all-leads" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <TabsList>
                      <TabsTrigger value="all-leads" className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        All Leads
                      </TabsTrigger>
                      <TabsTrigger value="lead-groups" className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        Groups
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="all-leads" className="pt-4">
                    <AllLeadsPage />
                  </TabsContent>
                  
                  <TabsContent value="lead-groups" className="pt-4">
                    <LeadGroupsPage />
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      {/* Add Recording Modal */}
      <AddRecordingModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onRecordingAdded={handleRecordingAdded}
      />
    </div>
  );
}