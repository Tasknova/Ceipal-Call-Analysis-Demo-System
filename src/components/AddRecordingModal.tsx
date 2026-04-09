import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, FileAudio, FileText, Loader2, Upload } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface AddRecordingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordingAdded?: () => void;
}

const WEBHOOK_URL = "https://lfpsgpumofgdhpihzqgp.supabase.co/functions/v1/webhook-proxy";
const STORAGE_BUCKET = "call-recordings";

const validateAudioFile = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/m4a",
    "audio/ogg",
    "audio/webm",
    "audio/flac",
    "video/mp4",
    "video/webm",
  ];

  const allowedExtensions = [".mp3", ".wav", ".m4a", ".ogg", ".webm", ".flac", ".mp4"];

  const hasValidType = allowedTypes.includes(file.type);
  const hasValidExtension = allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

  if (!hasValidType && !hasValidExtension) {
    return {
      isValid: false,
      error: "Invalid file type. Please upload MP3, WAV, M4A, OGG, WEBM, FLAC, or MP4.",
    };
  }

  const maxSize = 100 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: "File size exceeds 100MB. Please upload a smaller file.",
    };
  }

  return { isValid: true };
};

const sendWebhookInBackground = async (webhookPayload: Record<string, unknown>) => {
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookPayload),
    });
  } catch (error) {
    console.warn("Webhook submission failed", error);
  }
};

export default function AddRecordingModal({ open, onOpenChange, onRecordingAdded }: AddRecordingModalProps) {
  const [inputMode, setInputMode] = useState<"audio" | "transcript">("audio");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [callDate, setCallDate] = useState<Date | undefined>(new Date());
  const [callTime, setCallTime] = useState<string>(format(new Date(), "HH:mm"));

  const { toast } = useToast();
  const { user } = useAuth();

  const resetForm = () => {
    setSelectedFile(null);
    setFileName("");
    setTranscript("");
    setCallDate(new Date());
    setCallTime(format(new Date(), "HH:mm"));
    setUploadProgress(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAudioFile(file);
    if (!validation.isValid) {
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    if (!fileName) {
      setFileName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in before adding a call.",
        variant: "destructive",
      });
      return;
    }

    if (inputMode === "audio" && (!selectedFile || !fileName.trim())) {
      toast({
        title: "Missing input",
        description: "Select a file and provide a recording name.",
        variant: "destructive",
      });
      return;
    }

    if (inputMode === "transcript" && (!transcript.trim() || !fileName.trim())) {
      toast({
        title: "Missing input",
        description: "Provide both transcript and recording name.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setUploadProgress(5);

    try {
      let storedFileUrl: string | null = null;
      let fileSize: number | null = null;

      if (inputMode === "audio" && selectedFile) {
        const ext = selectedFile.name.split(".").pop();
        const storagePath = `${user.id}/${Date.now()}_${fileName.trim()}.${ext}`;

        const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        setUploadProgress(45);

        const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
        storedFileUrl = urlData.publicUrl;
        fileSize = selectedFile.size;
      }

      let callDateTime: string | null = null;
      if (callDate && callTime) {
        const [hours, minutes] = callTime.split(":");
        const dateTime = new Date(callDate);
        dateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        callDateTime = dateTime.toISOString();
      }

      const { data: recording, error: recordingError } = await supabase
        .from("calls")
        .insert({
          user_id: user.id,
          file_name: fileName.trim(),
          file_size: fileSize,
          stored_file_url: storedFileUrl,
          transcript: inputMode === "transcript" ? transcript.trim() : null,
          call_date: callDateTime,
        })
        .select()
        .single();

      if (recordingError) {
        throw new Error(`Database error: ${recordingError.message}`);
      }

      setUploadProgress(75);

      const { data: analysis, error: analysisError } = await supabase
        .from("analysis")
        .insert({
          recording_id: recording.id,
          user_id: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (analysisError) {
        console.warn("Failed to create analysis record", analysisError);
      }

      sendWebhookInBackground({
        recording_id: recording.id,
        analysis_id: analysis?.id || null,
        recording_name: fileName.trim(),
        recording_url: inputMode === "audio" ? storedFileUrl : null,
        transcript: inputMode === "transcript" ? transcript.trim() : null,
      });

      setUploadProgress(100);

      toast({
        title: "Call added",
        description: "The call has been queued for analysis.",
      });

      resetForm();
      onOpenChange(false);
      onRecordingAdded?.();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unable to add call",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src="/Bharat-Petroleum-Logo-2.png" alt="BP mark" className="h-5 w-auto" />
            <Upload className="h-5 w-5" />
            Add Call
          </DialogTitle>
          <DialogDescription>
            Upload an audio/video file or paste a transcript for Bharat Petroleum call analysis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={inputMode} onValueChange={(value) => setInputMode(value as "audio" | "transcript")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="audio" className="flex items-center gap-2">
                <FileAudio className="h-4 w-4" />
                Upload Audio
              </TabsTrigger>
              <TabsTrigger value="transcript" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Paste Transcript
              </TabsTrigger>
            </TabsList>

            <TabsContent value="audio" className="space-y-2 pt-2">
              <Label htmlFor="audio-file">Audio/Video File</Label>
              <Input
                id="audio-file"
                type="file"
                accept="audio/*,video/mp4,video/webm,.mp3,.wav,.m4a,.ogg,.webm,.flac"
                onChange={handleFileChange}
                disabled={isLoading}
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </TabsContent>

            <TabsContent value="transcript" className="space-y-2 pt-2">
              <Label htmlFor="transcript">Transcript</Label>
              <Textarea
                id="transcript"
                className="min-h-[180px]"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste full transcript here"
                disabled={isLoading}
              />
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="file-name">Recording Name</Label>
            <Input
              id="file-name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g., BP Support Call - Region East"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Call Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !callDate && "text-muted-foreground")}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {callDate ? format(callDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={callDate} onSelect={setCallDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="call-time">Call Time</Label>
              <Input
                id="call-time"
                type="time"
                value={callTime}
                onChange={(e) => setCallTime(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary-hover">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Add Call
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
