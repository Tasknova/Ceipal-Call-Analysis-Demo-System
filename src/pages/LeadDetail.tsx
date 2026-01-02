import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, Lead, Recording, Analysis } from "@/lib/supabase";
import { ArrowLeft, User, Mail, Phone, FileText, Play, Clock, Activity, TrendingUp, Loader2, Calendar, PhoneCall, MessageSquare, ExternalLink, MapPin, Bell, Flame, Snowflake, Target, CheckCircle2 } from "lucide-react";

// Helper function to get description for specific leads
const getLeadDescription = (leadName: string, currentDescription?: string): string => {
  const name = leadName.toLowerCase();
  if (name.includes('rajpal') || name.includes('singh')) {
    return 'Interested in premium office space for expanding IT startup, budget-conscious';
  }
  if (name.includes('aarav') || name.includes('varma')) {
    return 'Looking for luxury villa in gated community with modern amenities';
  }
  if (name.includes('jack')) {
    return 'Seeking retail space in high-traffic commercial area for new business';
  }
  return currentDescription || 'Potential property buyer';
};

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [recordings, setRecordings] = useState<(Recording & { analyses?: Analysis })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeadAndRecordings = async () => {
      if (!id || !user) return;

      try {
        // Fetch lead details
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', id)
          .single();

        if (leadError) throw leadError;
        setLead(leadData);

        // Fetch recordings for this lead
        const { data: recordingsData, error: recordingsError } = await supabase
          .from('recordings')
          .select('*')
          .eq('lead_id', id)
          .order('created_at', { ascending: false });

        if (recordingsError) throw recordingsError;

        // Fetch analyses for these recordings
        if (recordingsData && recordingsData.length > 0) {
          const recordingIds = recordingsData.map(r => r.id);
          const { data: analysesData } = await supabase
            .from('analyses')
            .select('*')
            .in('recording_id', recordingIds);

          // Merge analyses with recordings
          const recordingsWithAnalyses = recordingsData.map(recording => ({
            ...recording,
            analyses: analysesData?.find(a => a.recording_id === recording.id)
          }));

          setRecordings(recordingsWithAnalyses);
        } else {
          setRecordings([]);
        }
      } catch (error) {
        console.error('Error fetching lead data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeadAndRecordings();
  }, [id, user]);

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="secondary">No Analysis</Badge>;
    
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>;
      case "processing":
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-700">Processing</Badge>;
      case "failed":
        return <Badge className="bg-rose-100 text-rose-700">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSentimentColor = (score?: number) => {
    if (!score) return "text-slate-600";
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-amber-600";
    return "text-rose-600";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Lead Not Found</h1>
          <Button onClick={() => navigate('/?view=dashboard&tab=leads')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
        </div>
      </div>
    );
  }

  const getLeadStatusBadge = (leadType?: string) => {
    if (!leadType) return null;
    
    const type = leadType.toLowerCase();
    if (type === 'hot') return (
      <Badge className="bg-rose-500 text-white flex items-center gap-1">
        <Flame className="h-3 w-3" />
        Hot Lead
      </Badge>
    );
    if (type === 'warm') return (
      <Badge className="bg-amber-500 text-white flex items-center gap-1">
        <Target className="h-3 w-3" />
        Warm Lead
      </Badge>
    );
    if (type === 'cold') return (
      <Badge className="bg-blue-500 text-white flex items-center gap-1">
        <Snowflake className="h-3 w-3" />
        Cold Lead
      </Badge>
    );
    if (type === 'closing') return (
      <Badge className="bg-green-500 text-white flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Closing
      </Badge>
    );
    return null;
  };

  // Calculate stats
  const totalCalls = recordings.length;
  const avgSentiment = recordings.length > 0 
    ? recordings.reduce((sum, r) => sum + (r.analyses?.sentiments_score || 0), 0) / recordings.length 
    : 0;
  const completedCalls = recordings.filter(r => r.analyses?.status?.toLowerCase() === 'completed').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Button 
              variant="outline" 
              onClick={() => navigate('/?view=dashboard&tab=leads')}
              className="border-slate-300 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Button>
            <div className="border-l border-border pl-6">
              <h1 className="text-xl font-semibold text-foreground tracking-wide">Lead Details</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        {/* Lead Profile Card */}
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-semibold text-slate-900">{lead.name}</h2>
                  {getLeadStatusBadge(lead.lead_type)}
                </div>
                {/* Project Name */}
                {lead.project && (
                  <div className="flex items-center gap-2 mt-2 mb-3">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {lead.project}
                    </Badge>
                  </div>
                )}
                {/* Lead Description */}
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{getLeadDescription(lead.name, lead.description)}</span>
                </div>
              </div>
            </div>

            {/* Contact Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6 py-4 border-t border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Phone className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-600">Phone Number</p>
                  <p className="text-sm font-medium text-slate-900">{lead.contact}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Mail className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-600">Email Address</p>
                  <p className="text-sm font-medium text-slate-900">{lead.email}</p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <PhoneCall className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-600">Total Calls</p>
                  <p className="text-lg font-semibold text-slate-900">{totalCalls}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-600">Avg Call Quality</p>
                  <p className={`text-lg font-semibold ${avgSentiment > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {avgSentiment > 0 ? `${(avgSentiment / 10).toFixed(1)}/10` : 'Not Contacted'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-600">Completed</p>
                  <p className="text-lg font-semibold text-blue-600">{completedCalls}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call History Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Call History</h3>
            <p className="text-sm text-slate-600 mt-1">All recordings associated with this lead</p>
          </div>
          <Button onClick={() => navigate('/?view=dashboard&tab=recordings')}>
            <PhoneCall className="h-4 w-4 mr-2" />
            Add Recording
          </Button>
        </div>

        {/* Call History Cards */}
        {recordings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PhoneCall className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Recordings Yet</h3>
              <p className="text-slate-600 mb-4">No call recordings have been associated with this lead.</p>
              <Button onClick={() => navigate('/?view=dashboard&tab=recordings')}>
                <PhoneCall className="h-4 w-4 mr-2" />
                Add Recording
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {recordings.map((recording) => {
              const analysis = recording.analyses;
              return (
                <Card 
                  key={recording.id}
                  className="hover:shadow-md transition-shadow duration-200 cursor-pointer"
                  onClick={() => {
                    if (analysis && analysis.status?.toLowerCase() === 'completed') {
                      navigate(`/analysis/${analysis.id}?from=lead&leadId=${id}`);
                    }
                  }}
                >
                  <CardContent className="p-6">
                    {/* Recording Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Play className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-slate-900">
                            {recording.file_name || 'Unnamed Recording'}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(recording.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric'
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(recording.created_at).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit'
                              })}
                            </span>
                            {recording.duration_seconds && (
                              <span>
                                • {Math.floor(recording.duration_seconds / 60)}:{(recording.duration_seconds % 60).toString().padStart(2, '0')} min
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(analysis?.status)}
                    </div>

                    {/* Analysis Metrics */}
                    {analysis && analysis.status?.toLowerCase() === 'completed' && (
                      <>
                        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-200">
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
                              <p className="text-xs text-slate-600 mb-1">Lead Type</p>
                              <p className="text-sm font-medium text-slate-900">
                                {analysis.lead_type}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Additional Details Section */}
                        <div className="space-y-4 pt-4 mt-4 border-t border-slate-200">
                          {/* Call Summary */}
                          {analysis.short_summary && (
                            <div className="bg-slate-50 p-4 rounded-lg">
                              <div className="flex items-start gap-2 mb-2">
                                <MessageSquare className="h-4 w-4 text-slate-600 mt-0.5 flex-shrink-0" />
                                <h5 className="text-sm font-semibold text-slate-900">Call Summary</h5>
                              </div>
                              <p className="text-sm text-slate-700 leading-relaxed ml-6">
                                {analysis.short_summary}
                              </p>
                            </div>
                          )}

                          {/* Recommended Next Steps */}
                          {analysis.next_steps && analysis.next_steps !== 'TBD' && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                              <div className="flex items-start gap-2 mb-2">
                                <ArrowLeft className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0 rotate-180" />
                                <h5 className="text-sm font-semibold text-blue-900">Recommended Next Steps</h5>
                              </div>
                              <p className="text-sm text-blue-800 leading-relaxed ml-6">
                                {analysis.next_steps}
                              </p>
                            </div>
                          )}

                          {/* Call Outcome */}
                          {analysis.call_outcome && (
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 flex-1">
                                <Activity className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm font-medium text-slate-700">Call Outcome:</span>
                                <span className="text-sm text-slate-900 font-semibold">{analysis.call_outcome}</span>
                              </div>
                            </div>
                          )}

                          {/* Objections Info */}
                          {(analysis.no_of_objections_detected !== undefined && analysis.no_of_objections_detected !== null) && (
                            <div className="flex items-center gap-6 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                                <span className="text-slate-600">Objections Detected:</span>
                                <span className="font-semibold text-slate-900">{analysis.no_of_objections_detected}</span>
                              </div>
                              {(analysis.no_of_objections_handeled !== undefined && analysis.no_of_objections_handeled !== null) && (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                  <span className="text-slate-600">Handled:</span>
                                  <span className="font-semibold text-slate-900">{analysis.no_of_objections_handeled}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* View Details Button */}
                    {analysis && analysis.status?.toLowerCase() === 'completed' && (
                      <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
                        <Button 
                          variant="default"
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/analysis/${analysis.id}?from=lead&leadId=${id}`);
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-2" />
                          View Full Analysis
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
