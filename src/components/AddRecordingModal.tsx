import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, Lead, LeadGroup } from "@/lib/supabase";
import { Loader2, Upload, FileAudio, FileText, Search, Plus, User } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import AddLeadModal from "./AddLeadModal";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddRecordingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordingAdded?: () => void;
}

const WEBHOOK_URL = "https://n8nautomation.site/webhook/ad2aa239-7a2f-467d-a95a-a66a2ca43537";

// Function to send webhook in background without blocking UI
const sendWebhookInBackground = async (webhookPayload: any) => {
  try {
    console.log('🔄 Attempting webhook call...');
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    console.log('✅ Webhook response status:', webhookResponse.status);
    console.log('✅ Webhook response headers:', Object.fromEntries(webhookResponse.headers.entries()));
    
    if (webhookResponse.ok) {
      const responseText = await webhookResponse.text();
      console.log('✅ Webhook response body:', responseText);
      console.log('🎉 Webhook call successful!');
    } else {
      console.warn(`⚠️ Webhook returned ${webhookResponse.status}: ${webhookResponse.statusText}`);
    }
    
  } catch (corsError) {
    console.warn('❌ CORS error, trying no-cors mode:', corsError);
    
    // Second attempt: No-CORS mode
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });
      
      console.log('✅ Webhook request sent via no-cors mode');
      
    } catch (noCorsError) {
      console.error('❌ Both webhook attempts failed:', noCorsError);
      
      // Third attempt: Using XMLHttpRequest as fallback
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', WEBHOOK_URL, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(webhookPayload));
        console.log('✅ Webhook sent via XMLHttpRequest fallback');
      } catch (xhrError) {
        console.error('❌ All webhook attempts failed:', xhrError);
      }
    }
  }
};

// File validation
const validateAudioFile = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 
    'audio/ogg', 'audio/webm', 'audio/flac', 'video/mp4', 'video/webm'
  ];
  
  const allowedExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.flac', '.mp4'];
  
  // Check file type
  const hasValidType = allowedTypes.includes(file.type);
  const hasValidExtension = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  
  if (!hasValidType && !hasValidExtension) {
    return {
      isValid: false,
      error: "Invalid file type. Please upload an audio file (MP3, WAV, M4A, OGG, WEBM, FLAC) or video file (MP4, WEBM)."
    };
  }

  // Check file size (max 100MB)
  const maxSize = 100 * 1024 * 1024; // 100MB in bytes
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: "File size exceeds 100MB. Please upload a smaller file."
    };
  }

  return { isValid: true };
};

const checkUniqueFileName = async (fileName: string, userId: string): Promise<{ isUnique: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('recordings')
      .select('id')
      .eq('file_name', fileName.trim())
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        isUnique: false,
        error: "A recording with this name already exists. Please choose a different name."
      };
    }

    return { isUnique: true };
  } catch (error) {
    console.error('Error checking file name uniqueness:', error);
    return {
      isUnique: false,
      error: "Unable to verify file name uniqueness. Please try again."
    };
  }
};

export default function AddRecordingModal({ open, onOpenChange, onRecordingAdded }: AddRecordingModalProps) {
  const [inputMode, setInputMode] = useState<"audio" | "transcript">("audio");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]); // Store all leads
  const [leadGroups, setLeadGroups] = useState<LeadGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [groupSearchOpen, setGroupSearchOpen] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [callDate, setCallDate] = useState<Date | undefined>(new Date());
  const [callTime, setCallTime] = useState<string>(format(new Date(), "HH:mm"));
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch leads on component mount and when add lead modal closes
  useEffect(() => {
    if (open && user) {
      fetchLeadGroups();
      fetchLeads();
    }
  }, [open, user]);

  // Refetch leads when AddLeadModal closes
  useEffect(() => {
    if (!isAddLeadModalOpen && open && user) {
      fetchLeads();
    }
  }, [isAddLeadModalOpen, open, user]);

  // Filter leads when group selection changes
  useEffect(() => {
    if (selectedGroup) {
      const filteredLeads = allLeads.filter(lead => lead.group_id === selectedGroup);
      setLeads(filteredLeads);
    } else {
      setLeads(allLeads);
    }
  }, [selectedGroup, allLeads]);

  const fetchLeadGroups = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('lead_groups')
        .select('*')
        .order('group_name', { ascending: true });

      if (error) throw error;
      console.log('Fetched lead groups:', data);
      setLeadGroups(data || []);
    } catch (error) {
      console.error('Error fetching lead groups:', error);
    }
  };

  const fetchLeads = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching leads for user:', user.id);
      // Fetch all leads (remove user_id filter to show all leads for now)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching leads:', error);
        throw error;
      }
      
      console.log('Fetched leads:', data);
      setAllLeads(data || []);
      setLeads(data || []); // Initially show all leads
      
      if (!data || data.length === 0) {
        console.warn('No leads found');
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Warning",
        description: "Could not load leads list. You can still upload the recording.",
        variant: "default",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateAudioFile(file);
    if (!validation.isValid) {
      toast({
        title: "Invalid File",
        description: validation.error,
        variant: "destructive",
      });
      e.target.value = ''; // Reset input
      return;
    }

    setSelectedFile(file);
    
    // Auto-populate file name if not already set
    if (!fileName) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setFileName(nameWithoutExt);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add recordings",
        variant: "destructive",
      });
      return;
    }
    
    // Validate based on input mode
    if (inputMode === "audio") {
      if (!selectedFile || !fileName.trim()) {
        toast({
          title: "Error",
          description: "Please select a file and provide a name",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!transcript.trim() || !fileName.trim()) {
        toast({
          title: "Error",
          description: "Please provide both a transcript and a recording name",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      // Step 1: Check if file name is unique
      const uniqueCheck = await checkUniqueFileName(fileName.trim(), user.id);
      if (!uniqueCheck.isUnique) {
        toast({
          title: "Duplicate Name",
          description: uniqueCheck.error,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      let fileUrl: string | null = null;
      let fileSize: number | null = null;

      // Step 2: Upload file to Supabase Storage (only if audio mode)
      if (inputMode === "audio" && selectedFile) {
        toast({
          title: "Uploading File",
          description: "Uploading your recording to secure storage...",
        });

        const fileExtension = selectedFile.name.split('.').pop();
        const storagePath = `${user.id}/${Date.now()}_${fileName.trim()}.${fileExtension}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('recordings')
          .upload(storagePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Upload error: ${uploadError.message}`);
        }

        setUploadProgress(50);

        // Get public URL (for webhook)
        const { data: urlData } = supabase.storage
          .from('recordings')
          .getPublicUrl(storagePath);

        fileUrl = urlData.publicUrl;
        fileSize = selectedFile.size;
      } else {
        setUploadProgress(50);
      }

      // Step 3: Insert recording into database
      // Combine date and time for call_date
      let callDateTime: string | null = null;
      if (callDate && callTime) {
        const [hours, minutes] = callTime.split(':');
        const dateTime = new Date(callDate);
        dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        callDateTime = dateTime.toISOString();
      }

      const { data: recording, error: dbError } = await supabase
        .from('recordings')
        .insert({
          user_id: user.id,
          lead_id: selectedLead,
          file_name: fileName.trim(),
          file_size: fileSize,
          stored_file_url: fileUrl,
          transcript: inputMode === "transcript" ? transcript.trim() : null,
          call_date: callDateTime
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      setUploadProgress(75);

      // Step 4: Create corresponding analysis record
      const { data: analysis, error: analysisError } = await supabase
        .from('analyses')
        .insert({
          recording_id: recording.id,
          user_id: user.id,
          status: 'pending',
          sentiments_score: null,
          engagement_score: null,
          confidence_score_executive: null,
          confidence_score_person: null,
          participants: null,
          lead_type: null,
          objections_handeled: null,
          no_of_objections_detected: null,
          no_of_objections_handeled: null,
          next_steps: null,
          improvements: null,
          call_outcome: null,
          short_summary: null,
          lead_type_explanation: null,
          sentiments_explanation: null,
          engagement_explanation: null,
          confidence_explanation_executive: null,
          confidence_explanation_person: null,
          objections_detected: null,
          objections_handling_details: null,
          next_steps_detailed: null,
          improvements_for_team: null,
          call_outcome_rationale: null,
          evidence_quotes: null
        })
        .select()
        .single();

      if (analysisError) {
        console.warn('Failed to create analysis record:', analysisError);
      }

      setUploadProgress(90);

      // Step 5: Send to webhook for processing
      const webhookPayload = {
        recording_id: recording.id,
        analysis_id: analysis?.id || null,
        recording_name: fileName.trim(),
        recording_url: inputMode === "audio" ? fileUrl : null,
        transcript: inputMode === "transcript" ? transcript.trim() : null
      };

      console.log('🚀 Sending webhook POST request to:', WEBHOOK_URL);
      console.log('📦 Webhook payload:', webhookPayload);

      // Send webhook in background
      sendWebhookInBackground(webhookPayload);

      setUploadProgress(100);

      // Reset form and close modal
      setSelectedFile(null);
      setFileName("");
      setTranscript("");
      setSelectedLead(null);
      setCallDate(new Date());
      setCallTime(format(new Date(), "HH:mm"));
      setUploadProgress(0);
      onOpenChange(false);
      
      // Trigger refresh of recordings list
      if (onRecordingAdded) {
        onRecordingAdded();
      }

      // Show success message
      toast({
        title: inputMode === "audio" ? "Recording Uploaded Successfully!" : "Transcript Added Successfully!",
        description: inputMode === "audio" 
          ? "Your recording has been uploaded and queued for analysis."
          : "Your transcript has been saved and queued for analysis.",
      });

    } catch (error) {
      console.error('Error adding recording:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add recording",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setFileName("");
    setTranscript("");
    setSelectedLead(null);
    setSelectedGroup(null);
    setCallDate(new Date());
    setCallTime(format(new Date(), "HH:mm"));
    setUploadProgress(0);
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">C</span>
            </div>
            <Upload className="h-5 w-5" />
            Add New Call
          </DialogTitle>
          <DialogDescription>
            Upload an audio/video file or paste a transcript for analysis by <span className="font-semibold text-primary">Ceipal</span> AI.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pb-4">
          <Tabs value={inputMode} onValueChange={(value) => setInputMode(value as "audio" | "transcript")} className="w-full">
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
            
            <TabsContent value="audio" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="audio-file">Audio/Video File *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="audio-file"
                    type="file"
                    accept="audio/*,video/mp4,video/webm,.mp3,.wav,.m4a,.ogg,.webm,.flac"
                    onChange={handleFileChange}
                    disabled={isLoading}
                    required={inputMode === "audio"}
                    className="cursor-pointer"
                  />
                  {selectedFile && (
                    <FileAudio className="h-5 w-5 text-green-600 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported formats: MP3, WAV, M4A, OGG, WEBM, FLAC, MP4. Max size: 100MB.
                </p>
                {selectedFile && (
                  <p className="text-xs text-green-600 font-medium">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="transcript" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="transcript">Transcript *</Label>
                <Textarea
                  id="transcript"
                  placeholder="Paste your call transcript here..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  disabled={isLoading}
                  required={inputMode === "transcript"}
                  className="min-h-[200px] resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  Paste the complete transcript of your call for AI analysis.
                </p>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="space-y-2">
            <Label htmlFor="file-name">Recording Name *</Label>
            <Input
              id="file-name"
              type="text"
              placeholder="e.g., Sales Call - John Doe"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">
              Choose a unique, descriptive name for this recording.
            </p>
          </div>

          {/* Lead Group Selection */}
          <div className="space-y-2">
            <Label htmlFor="group-select">Lead Group (Optional)</Label>
            <Popover open={groupSearchOpen} onOpenChange={setGroupSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={groupSearchOpen}
                  className="w-full justify-between"
                  disabled={isLoading}
                >
                  {selectedGroup
                    ? leadGroups.find((group) => group.id === selectedGroup)?.group_name
                    : "All groups"}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search groups..." />
                  <CommandList>
                    <CommandEmpty>No group found.</CommandEmpty>
                    <CommandGroup heading="Lead Groups">
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setSelectedGroup(null);
                          setGroupSearchOpen(false);
                          setSelectedLead(null); // Clear lead selection when changing group
                        }}
                      >
                        <span className="font-medium">All Groups</span>
                      </CommandItem>
                      {leadGroups.map((group) => (
                        <CommandItem
                          key={group.id}
                          value={group.group_name}
                          onSelect={() => {
                            setSelectedGroup(group.id);
                            setGroupSearchOpen(false);
                            setSelectedLead(null); // Clear lead selection when changing group
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{group.group_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {allLeads.filter(l => l.group_id === group.id).length} leads
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Filter leads by group or select from all leads.
            </p>
          </div>

          {/* Lead Selection */}
          <div className="space-y-2">
            <Label htmlFor="lead-select">Associated Lead (Optional)</Label>
            <Popover open={leadSearchOpen} onOpenChange={setLeadSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={leadSearchOpen}
                  className="w-full justify-between"
                  disabled={isLoading}
                >
                  {selectedLead
                    ? leads.find((lead) => lead.id === selectedLead)?.name
                    : "Select a lead..."}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search leads..." 
                    value={leadSearchQuery}
                    onValueChange={setLeadSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No lead found.</CommandEmpty>
                    <CommandGroup heading="Leads">
                      {leads.map((lead) => (
                        <CommandItem
                          key={lead.id}
                          value={lead.name}
                          onSelect={() => {
                            setSelectedLead(lead.id);
                            setLeadSearchOpen(false);
                          }}
                        >
                          <User className="mr-2 h-4 w-4" />
                          <div className="flex flex-col">
                            <span className="font-medium">{lead.name}</span>
                            <span className="text-xs text-muted-foreground">{lead.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setLeadSearchOpen(false);
                          setIsAddLeadModalOpen(true);
                        }}
                        className="text-accent-blue"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Lead
                      </CommandItem>
                      {selectedLead && (
                        <CommandItem
                          onSelect={() => {
                            setSelectedLead(null);
                            setLeadSearchOpen(false);
                          }}
                          className="text-muted-foreground"
                        >
                          Clear Selection
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Associate this recording with a lead for better organization.
            </p>
          </div>

          {/* Call Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="call-date">Call Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !callDate && "text-muted-foreground"
                    )}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {callDate ? format(callDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={callDate}
                    onSelect={setCallDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                When did this call take place?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="call-time">Call Time</Label>
              <Input
                id="call-time"
                type="time"
                value={callTime}
                onChange={(e) => setCallTime(e.target.value)}
                disabled={isLoading}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Time of the call
              </p>
            </div>
          </div>

          {isLoading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Add Recording
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Add Lead Modal - Rendered outside main dialog to avoid z-index issues */}
    <AddLeadModal 
      isOpen={isAddLeadModalOpen}
      onClose={() => setIsAddLeadModalOpen(false)}
      onLeadAdded={(leadId) => {
        setSelectedLead(leadId);
        fetchLeads(); // Refresh leads list
      }}
    />
    </>
  );
}
