import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function useAnalysisNotifications() {
  const { toast } = useToast();
  const { user } = useAuth();
  const previousStatusesRef = useRef<Map<string, string>>(new Map());
  
  // Query to check for all analyses with their current status
  const { data: analyses } = useQuery({
    queryKey: ['analysis_statuses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('analyses')
        .select(`
          id,
          status,
          sentiments_score,
          engagement_score,
          recording_id,
          recordings (
            file_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 3000, // Check every 3 seconds for faster updates
    refetchIntervalInBackground: true, // Continue polling even when tab is not focused
    enabled: !!user
  });

  useEffect(() => {
    if (!analyses) return;

    analyses.forEach(analysis => {
      const currentStatus = analysis.status || 'unknown';
      const previousStatus = previousStatusesRef.current.get(analysis.id);
      
      // Only show notification when status changes to 'completed' and has score data
      if (
        currentStatus === 'completed' && 
        previousStatus !== 'completed' && 
        analysis.sentiments_score !== null
      ) {
        const fileName = analysis.recordings?.file_name || 'Recording';
        const sentimentScore = (analysis.sentiments_score || 0).toFixed(0);
        const engagementScore = (analysis.engagement_score || 0).toFixed(0);
        
        // Get emojis based on scores
        const getSentimentEmoji = (score: number) => {
          if (score >= 80) return "😊";
          if (score >= 60) return "😐";
          return "😔";
        };
        
        const getEngagementEmoji = (score: number) => {
          if (score >= 80) return "🔥";
          if (score >= 60) return "👍";
          return "👎";
        };

        toast({
          title: "🎉 Analysis Complete!",
          description: `${fileName} - Sentiment: ${getSentimentEmoji(analysis.sentiments_score || 0)} ${sentimentScore}%, Engagement: ${getEngagementEmoji(analysis.engagement_score || 0)} ${engagementScore}%`,
          duration: 6000,
        });
      }
      
      // Update the status tracking
      previousStatusesRef.current.set(analysis.id, currentStatus);
    });
  }, [analyses, toast]);

  return {
    analyses: analyses || [],
    completedAnalyses: analyses?.filter(a => a.status === 'completed') || []
  };
}
