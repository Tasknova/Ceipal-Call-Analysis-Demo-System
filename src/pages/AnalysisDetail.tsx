import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, FileText, MessageSquare, Mic, TrendingUp, Users, Target, AlertTriangle, ChevronDown, ChevronRight, Activity, BarChart3, CheckCircle2, XCircle, Brain, UserCheck, ShieldCheck, Clock, Lightbulb, ArrowRight, Quote, ListChecks, AlertCircle, Play, Pause, Volume2, User as UserIcon, SkipForward, SkipBack, VolumeX, Volume1 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, Analysis, Recording, Lead } from "@/lib/supabase";

export default function AnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isAudioPlayerOpen, setIsAudioPlayerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Helper function to clean markdown formatting from text
  const cleanMarkdown = (text: string) => {
    return text.replace(/\*\*/g, '').trim();
  };

  useEffect(() => {
    const fetchAnalysisAndRecording = async () => {
      if (!id || !user) return;

      try {
        // Fetch analysis
        const { data: analysisData, error: analysisError } = await supabase
          .from('analyses')
          .select('*')
          .eq('id', id)
          .single();

        if (analysisError) throw analysisError;

        // Fetch recording
        const { data: recordingData, error: recordingError } = await supabase
          .from('recordings')
          .select('*')
          .eq('id', analysisData.recording_id)
          .single();

        if (recordingError) throw recordingError;

        // Fetch lead if associated
        if (recordingData.lead_id) {
          const { data: leadData } = await supabase
            .from('leads')
            .select('*')
            .eq('id', recordingData.lead_id)
            .single();
          
          if (leadData) setLead(leadData);
        }

        setAnalysis(analysisData);
        setRecording(recordingData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysisAndRecording();
  }, [id, user]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-amber-600";
    return "text-rose-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-emerald-50 border-emerald-200";
    if (score >= 60) return "bg-blue-50 border-blue-200";
    if (score >= 40) return "bg-amber-50 border-amber-200";
    return "bg-rose-50 border-rose-200";
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 8) return "text-emerald-600";
    if (score >= 6) return "text-blue-600";
    if (score >= 4) return "text-amber-600";
    return "text-rose-600";
  };

  const getConfidenceBgColor = (score: number) => {
    if (score >= 8) return "bg-emerald-50 border-emerald-200";
    if (score >= 6) return "bg-blue-50 border-blue-200";
    if (score >= 4) return "bg-amber-50 border-amber-200";
    return "bg-rose-50 border-rose-200";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-gradient-to-r from-emerald-500 to-emerald-600";
    if (score >= 60) return "bg-gradient-to-r from-blue-500 to-blue-600";
    if (score >= 40) return "bg-gradient-to-r from-amber-500 to-amber-600";
    return "bg-gradient-to-r from-rose-500 to-rose-600";
  };

  const openAudioPlayer = () => {
    if (!recording?.stored_file_url) return;
    
    if (!audioElement) {
      const audio = new Audio(recording.stored_file_url);
      
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });
      
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
      
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
      });
      
      audio.volume = volume;
      audio.playbackRate = playbackRate;
      setAudioElement(audio);
    }
    
    setIsAudioPlayerOpen(true);
  };

  const togglePlayPause = () => {
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioElement.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (value: number[]) => {
    if (!audioElement) return;
    const newTime = value[0];
    audioElement.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSkipForward = () => {
    if (!audioElement) return;
    audioElement.currentTime = Math.min(audioElement.currentTime + 10, duration);
  };

  const handleSkipBackward = () => {
    if (!audioElement) return;
    audioElement.currentTime = Math.max(audioElement.currentTime - 10, 0);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!audioElement) return;
    const newVolume = value[0];
    audioElement.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioElement) return;
    if (isMuted) {
      audioElement.volume = volume > 0 ? volume : 0.5;
      setVolume(volume > 0 ? volume : 0.5);
      setIsMuted(false);
    } else {
      audioElement.volume = 0;
      setIsMuted(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    if (!audioElement) return;
    audioElement.playbackRate = speed;
    setPlaybackRate(speed);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCloseAudioPlayer = () => {
    if (audioElement && isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    }
    setIsAudioPlayerOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent-blue mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (!analysis || !recording) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Analysis Not Found</h1>
          <p className="text-muted-foreground mt-2">The requested analysis could not be found.</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  const searchParams = new URLSearchParams(window.location.search);
                  const from = searchParams.get('from');
                  const leadId = searchParams.get('leadId');
                  
                  if (from === 'overview') {
                    navigate('/?view=dashboard&tab=overview');
                  } else if (from === 'lead' && leadId) {
                    navigate(`/lead/${leadId}`);
                  } else {
                    navigate('/?view=dashboard&tab=recordings');
                  }
                }}
                className="border-slate-300 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-8" />
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Call Analysis Report</h1>
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {recording.file_name || 'Recording'} • {new Date(analysis.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                {lead && (
                  <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                    <UserIcon className="h-3 w-3" />
                    Lead: <span className="font-medium text-slate-900">{lead.name}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {recording.stored_file_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openAudioPlayer}
                  className="border-slate-300 hover:bg-slate-50"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Open Audio Player
                </Button>
              )}
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-4 py-2">
                <Activity className="h-3 w-3 mr-1" />
                {analysis.status || 'Completed'}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Key Performance Indicators - Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sentiment Score */}
          <Card className={`relative overflow-hidden border-2 ${getScoreBgColor(analysis.sentiments_score || 0)} hover:shadow-xl transition-all duration-300`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <Activity className={`h-6 w-6 ${getScoreColor(analysis.sentiments_score || 0)}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Sentiment Score</p>
                    <p className={`text-4xl font-bold ${getScoreColor(analysis.sentiments_score || 0)}`}>
                      {analysis.sentiments_score || 0}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-full bg-white/50 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor(analysis.sentiments_score || 0)} transition-all duration-1000 ease-out shadow-sm`}
                  style={{ width: `${analysis.sentiments_score || 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Engagement Score */}
          <Card className={`relative overflow-hidden border-2 ${getScoreBgColor(analysis.engagement_score || 0)} hover:shadow-xl transition-all duration-300`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <Users className={`h-6 w-6 ${getScoreColor(analysis.engagement_score || 0)}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Engagement</p>
                    <p className={`text-4xl font-bold ${getScoreColor(analysis.engagement_score || 0)}`}>
                      {analysis.engagement_score || 0}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-full bg-white/50 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor(analysis.engagement_score || 0)} transition-all duration-1000 ease-out shadow-sm`}
                  style={{ width: `${analysis.engagement_score || 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Executive Confidence */}
          <Card className={`relative overflow-hidden border-2 ${getConfidenceBgColor(analysis.confidence_score_executive || 0)} hover:shadow-xl transition-all duration-300`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <ShieldCheck className={`h-6 w-6 ${getConfidenceColor(analysis.confidence_score_executive || 0)}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Exec Confidence</p>
                    <p className={`text-4xl font-bold ${getConfidenceColor(analysis.confidence_score_executive || 0)}`}>
                      {analysis.confidence_score_executive || 0}/10
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-full bg-white/50 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor(((analysis.confidence_score_executive || 0) / 10) * 100)} transition-all duration-1000 ease-out shadow-sm`}
                  style={{ width: `${((analysis.confidence_score_executive || 0) / 10) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Person Confidence */}
          <Card className={`relative overflow-hidden border-2 ${getConfidenceBgColor(analysis.confidence_score_person || 0)} hover:shadow-xl transition-all duration-300`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <UserCheck className={`h-6 w-6 ${getConfidenceColor(analysis.confidence_score_person || 0)}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Person Confidence</p>
                    <p className={`text-4xl font-bold ${getConfidenceColor(analysis.confidence_score_person || 0)}`}>
                      {analysis.confidence_score_person || 0}/10
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-full bg-white/50 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor(((analysis.confidence_score_person || 0) / 10) * 100)} transition-all duration-1000 ease-out shadow-sm`}
                  style={{ width: `${((analysis.confidence_score_person || 0) / 10) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Participants */}
          <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-50 rounded-xl">
                  <Users className="h-7 w-7 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Participants</p>
                  <p className="text-3xl font-bold text-slate-900">{analysis.participants?.count || 'N/A'}</p>
                  {analysis.participants?.names && (
                    <p className="text-xs text-slate-500 mt-1">{analysis.participants.names}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Objections */}
          <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-amber-50 rounded-xl">
                  <AlertTriangle className="h-7 w-7 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Objections</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      {analysis.no_of_objections_detected || 0} Detected
                    </Badge>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {analysis.no_of_objections_handeled || 0} Handled
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lead Type */}
          {analysis.lead_type && (
            <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-violet-50 rounded-xl">
                    <Target className="h-7 w-7 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Lead Type</p>
                    <p className="text-lg font-semibold text-slate-900">{analysis.lead_type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Analysis Content */}
        <div className="space-y-6">
          
          {/* Executive Summary */}
          {analysis.short_summary && (
            <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200 shadow-md">
              <CardHeader className="border-b border-slate-100 bg-white/50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Brain className="h-5 w-5 text-blue-600" />
                  </div>
                  Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-slate-700 leading-relaxed text-lg">
                  {analysis.short_summary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Call Outcome */}
          {analysis.call_outcome && (
            <Card className="bg-white border-slate-200 shadow-md">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  Call Outcome
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Badge className="bg-emerald-100 text-emerald-800 text-base px-4 py-2 mb-3">
                  {analysis.call_outcome}
                </Badge>
                {analysis.call_outcome_rationale && (
                  <p className="text-slate-700 leading-relaxed mt-3">
                    {analysis.call_outcome_rationale}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <Card className="bg-white border-slate-200 shadow-md">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <ArrowRight className="h-5 w-5 text-indigo-600" />
                </div>
                Recommended Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {analysis.next_steps_detailed ? (
                  analysis.next_steps_detailed.split(/\d+\)/).filter(Boolean).map((step: string, index: number) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
                      <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                        {index + 1}
                      </div>
                      <p className="text-slate-700 leading-relaxed flex-1 pt-1">{step.trim()}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-600">
                    {analysis.next_steps || 'No next steps defined'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Analysis Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sentiment Analysis */}
            {analysis.sentiments_explanation && (
              <Card className="bg-white border-slate-200 shadow-md">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    Sentiment Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-slate-700 leading-relaxed">
                    {analysis.sentiments_explanation}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Engagement Analysis */}
            {analysis.engagement_explanation && (
              <Card className="bg-white border-slate-200 shadow-md">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Activity className="h-5 w-5 text-purple-600" />
                    </div>
                    Engagement Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-slate-700 leading-relaxed">
                    {analysis.engagement_explanation}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Executive Confidence */}
            {analysis.confidence_explanation_executive && (
              <Card className="bg-white border-slate-200 shadow-md">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    </div>
                    Executive Confidence
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-slate-700 leading-relaxed">
                    {analysis.confidence_explanation_executive}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Person Confidence */}
            {analysis.confidence_explanation_person && (
              <Card className="bg-white border-slate-200 shadow-md">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 bg-cyan-100 rounded-lg">
                      <UserCheck className="h-5 w-5 text-cyan-600" />
                    </div>
                    Person Confidence
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-slate-700 leading-relaxed">
                    {analysis.confidence_explanation_person}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Improvements for Team */}
          <Card className="bg-white border-slate-200 shadow-md">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-amber-600" />
                </div>
                Team Improvement Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {analysis.improvements_for_team ? (
                  analysis.improvements_for_team.split(/\d+\)/).filter(Boolean).map((improvement: string, index: number) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex-shrink-0 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                        {index + 1}
                      </div>
                      <p className="text-slate-700 leading-relaxed flex-1 pt-1">{improvement.trim()}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-600">
                    {analysis.improvements || 'No improvements suggested'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Advanced Section Content */}
        <div className="space-y-6">
            
            {/* Evidence Quotes */}
            {analysis.evidence_quotes && (
              <Card className="bg-white border-slate-200 shadow-md">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Quote className="h-5 w-5 text-blue-600" />
                    </div>
                    Key Evidence Quotes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
                    <Quote className="h-8 w-8 text-blue-400 mb-3 opacity-50" />
                    <p className="text-slate-700 leading-relaxed text-lg italic">
                      "{analysis.evidence_quotes}"
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Objections Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Objections Detected */}
              <Card className="bg-white border-slate-200 shadow-md">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 bg-rose-100 rounded-lg">
                      <XCircle className="h-5 w-5 text-rose-600" />
                    </div>
                    Objections Detected
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {analysis.objections_detected ? (
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {analysis.objections_detected.replace(/\*\*/g, '')}
                    </p>
                  ) : (
                    <p className="text-slate-600">
                      {analysis.objections_handeled ? analysis.objections_handeled.replace(/\*\*/g, '') : 'No objections recorded'}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* How Objections Were Handled */}
              {analysis.objections_handling_details && (
                <Card className="bg-white border-slate-200 shadow-md">
                  <CardHeader className="border-b border-slate-100">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      Objection Handling
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {analysis.objections_handling_details.replace(/\*\*/g, '')}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Lead Type Explanation */}
            {analysis.lead_type_explanation && (
              <Card className="bg-white border-slate-200 shadow-md">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 bg-violet-100 rounded-lg">
                      <Target className="h-5 w-5 text-violet-600" />
                    </div>
                    Lead Type Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-slate-700 leading-relaxed">
                    {analysis.lead_type_explanation}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Call Transcript */}
            <Card className="bg-white border-slate-200 shadow-md">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Mic className="h-5 w-5 text-slate-600" />
                  </div>
                  Full Call Transcript
                </CardTitle>
                <CardDescription className="mt-2 text-slate-500">
                  Complete conversation recording
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ScrollArea className="h-[500px] w-full rounded-lg border border-slate-200 bg-slate-50 p-6">
                  <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-mono text-sm">
                    {recording.transcript || 'No transcript available for this recording.'}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

          </div>
      </div>

      {/* Audio Player Modal */}
      <Dialog open={isAudioPlayerOpen} onOpenChange={handleCloseAudioPlayer}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Audio Player
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* File Info */}
            <div className="text-center space-y-1">
              <p className="font-medium text-slate-900">{recording?.file_name || 'Audio Recording'}</p>
              {lead && (
                <p className="text-sm text-slate-600 flex items-center justify-center gap-1">
                  <UserIcon className="h-3 w-3" />
                  {lead.name}
                </p>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-600">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handleSkipBackward}
                className="h-10 w-10"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                size="icon"
                onClick={togglePlayPause}
                className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-0.5" />
                )}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={handleSkipForward}
                className="h-10 w-10"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="h-8 w-8 flex-shrink-0"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : volume < 0.5 ? (
                  <Volume1 className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="flex-1"
              />
            </div>

            {/* Playback Speed */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-slate-600">Speed:</span>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                <Button
                  key={speed}
                  variant={playbackRate === speed ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSpeedChange(speed)}
                  className="h-8 min-w-[60px]"
                >
                  {speed}x
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
