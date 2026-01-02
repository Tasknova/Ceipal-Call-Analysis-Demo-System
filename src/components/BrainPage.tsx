import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, CompanyBrain, BrainDocument, DocumentGroup } from "@/lib/supabase";
import { 
  Brain, 
  Save, 
  Edit, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Film, 
  Music, 
  X, 
  Plus,
  Trash2,
  Loader2,
  Building2,
  Target,
  Users,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Move
} from "lucide-react";

interface BrainPageProps {
  onBack: () => void;
}

export default function BrainPage({ onBack }: BrainPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("form");
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    business: true,
    products: true,
    team: true
  });

  // Form data
  const [formData, setFormData] = useState<Partial<CompanyBrain>>({
    company_name: "CEIPAL",
    company_tagline: "Intelligent Talent Cloud for Recruiting and Workforce Management",
    company_description: "CEIPAL is a cloud-native AI-powered talent platform that helps enterprises and staffing agencies automate recruiting, applicant tracking, candidate sourcing, vendor management, and workforce operations. The platform unifies ATS, CRM, VMS, and workforce tools into a single system, enabling faster hiring, improved talent engagement, deeper analytics, and better operational visibility.",
    industry: "HR Tech | SaaS | Talent Management | Recruitment Software",
    founded_year: 2015,
    company_size: "500–1000 employees",
    headquarters_location: "New Jersey, USA",
    website_url: "https://www.ceipal.com",
    contact_email: "contact@ceipal.com",
    contact_phone: "+1 (844) 234-2455",
    mission_statement: "To transform hiring and workforce management with intelligent automation, enabling organizations to build better talent experiences and achieve operational excellence.",
    vision_statement: "To be the world's most trusted platform for talent acquisition and workforce orchestration, powered by data and AI.",
    core_values: ["Innovation", "Customer Success", "Integrity", "Collaboration", "Continuous Learning"],
    unique_selling_points: ["AI-powered talent matching and ranking", "Unified ATS + VMS platform", "End-to-end workforce automation", "Real-time analytics and reporting"],
    target_audience: "Staffing firms, enterprise HR teams, MSPs, talent acquisition leaders, operations managers",
    products_services: {},
    pricing_model: "Subscription (SaaS)",
    key_features: ["AI candidate matching and ranking", "Applicant tracking system (ATS)", "Vendor management system (VMS)", "Workforce management tools", "Recruitment CRM", "Real-time analytics and dashboards", "Resume parsing and job board integrations", "Compliance and credentialing"],
    founder_info: "CEIPAL was founded by industry veterans with deep experience in recruiting, staffing technology, and enterprise software.",
    leadership_team: {},
    team_size_details: "Cross-functional teams in product, engineering, sales, support, and customer success; global operations across multiple regions.",
    additional_context: "",
    custom_fields: {}
  });

  // Document management
  const [documents, setDocuments] = useState<BrainDocument[]>([]);
  const [documentGroups, setDocumentGroups] = useState<DocumentGroup[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Upload form fields
  const [uploadFormData, setUploadFormData] = useState({
    description: "",
    tags: "",
    category: "",
    documentGroupId: ""
  });
  
  // Group management
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");
  const [editingGroup, setEditingGroup] = useState<DocumentGroup | null>(null);
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);
  const [documentsTabView, setDocumentsTabView] = useState("files");
  
  // Move document
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [documentToMove, setDocumentToMove] = useState<BrainDocument | null>(null);
  const [moveToGroupId, setMoveToGroupId] = useState("");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");

  // Temporary arrays for editing
  const [coreValueInput, setCoreValueInput] = useState("");
  const [uspInput, setUspInput] = useState("");
  const [keyFeatureInput, setKeyFeatureInput] = useState("");

  useEffect(() => {
    if (user) {
      loadBrainData();
      loadDocuments();
      loadDocumentGroups();
    }
  }, [user]);

  const loadBrainData = async () => {
    try {
      const { data, error } = await supabase
        .from('company_brain')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setFormData(data);
        setIsEditing(false);
      } else {
        setIsEditing(true); // First time, enable editing
      }
    } catch (error) {
      console.error('Error loading brain data:', error);
      toast({
        title: "Error",
        description: "Failed to load company information",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('brain_documents')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadDocumentGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('document_groups')
        .select('*')
        .eq('user_id', user?.id)
        .order('group_name');

      if (error) throw error;
      setDocumentGroups(data || []);
    } catch (error) {
      console.error('Error loading document groups:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: existingData } = await supabase
        .from('company_brain')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (existingData) {
        // Update existing
        const { error } = await supabase
          .from('company_brain')
          .update(formData)
          .eq('user_id', user?.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('company_brain')
          .insert([{ ...formData, user_id: user?.id }]);

        if (error) throw error;
      }

      setIsEditing(false);
      toast({
        title: "Success",
        description: "Company information saved successfully"
      });
      loadBrainData();
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: "Error",
        description: "Failed to save company information",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadDialogOpen(true);
    }
    event.target.value = ''; // Reset input
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadDialogOpen(true);
    }
  };

  const handleUploadConfirm = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `${user?.id}/${Date.now()}-${selectedFile.name}`;
      const filePath = `${fileName}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('brain-documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('brain-documents')
        .getPublicUrl(filePath);

      // Determine file type
      let fileType = 'other';
      if (selectedFile.type.startsWith('image/')) fileType = 'image';
      else if (selectedFile.type.startsWith('video/')) fileType = 'video';
      else if (selectedFile.type.startsWith('audio/')) fileType = 'audio';
      else if (selectedFile.type.includes('pdf')) fileType = 'pdf';
      else if (selectedFile.type.includes('document') || selectedFile.type.includes('word')) fileType = 'document';

      // Parse tags from comma-separated string
      const tagsArray = uploadFormData.tags
        ? uploadFormData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];

      // Save to database with new fields
      const { error: dbError } = await supabase
        .from('brain_documents')
        .insert([{
          user_id: user?.id,
          file_name: selectedFile.name,
          file_type: fileType,
          file_size: selectedFile.size,
          storage_path: filePath,
          storage_url: urlData.publicUrl,
          mime_type: selectedFile.type,
          description: uploadFormData.description || null,
          tags: tagsArray.length > 0 ? tagsArray : null,
          category: uploadFormData.category || null,
          document_group_id: uploadFormData.documentGroupId || null,
          status: 'uploaded'
        }]);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Document uploaded successfully"
      });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadFormData({
        description: "",
        tags: "",
        category: "",
        documentGroupId: ""
      });
      loadDocuments();
    } catch (error) {
      console.error('Error uploading:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast({
        title: "Error",
        description: "Please provide a group name",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('document_groups')
        .insert([{
          user_id: user?.id,
          group_name: newGroupName.trim(),
          description: newGroupDescription.trim() || null
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group created successfully"
      });
      setIsGroupDialogOpen(false);
      setNewGroupName("");
      setNewGroupDescription("");
      loadDocumentGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive"
      });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Delete this group? Documents in this group will not be deleted.')) return;

    try {
      const { error } = await supabase
        .from('document_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group deleted successfully"
      });
      setSelectedGroupFilter("all");
      loadDocumentGroups();
      loadDocuments();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive"
      });
    }
  };

  const handleEditGroup = async () => {
    if (!editingGroup || !editingGroup.group_name.trim()) {
      toast({
        title: "Error",
        description: "Please provide a group name",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('document_groups')
        .update({
          group_name: editingGroup.group_name.trim(),
          description: editingGroup.description?.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingGroup.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group updated successfully"
      });
      setIsEditGroupDialogOpen(false);
      setEditingGroup(null);
      loadDocumentGroups();
    } catch (error) {
      console.error('Error updating group:', error);
      toast({
        title: "Error",
        description: "Failed to update group",
        variant: "destructive"
      });
    }
  };

  const handleMoveDocument = async () => {
    if (!documentToMove) return;

    try {
      const { error } = await supabase
        .from('brain_documents')
        .update({ document_group_id: moveToGroupId || null })
        .eq('id', documentToMove.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document moved successfully"
      });
      setIsMoveDialogOpen(false);
      setDocumentToMove(null);
      setMoveToGroupId("");
      setGroupSearchQuery("");
      loadDocuments();
    } catch (error) {
      console.error('Error moving document:', error);
      toast({
        title: "Error",
        description: "Failed to move document",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDocument = async (doc: BrainDocument) => {
    if (!confirm(`Delete ${doc.file_name}?`)) return;

    try {
      // Delete from storage
      await supabase.storage
        .from('brain-documents')
        .remove([doc.storage_path]);

      // Delete from database
      const { error } = await supabase
        .from('brain_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document deleted successfully"
      });
      loadDocuments();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive"
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image': return <ImageIcon className="h-5 w-5" />;
      case 'video': return <Film className="h-5 w-5" />;
      case 'audio': return <Music className="h-5 w-5" />;
      case 'pdf': return <FileText className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const addArrayItem = (field: 'core_values' | 'unique_selling_points' | 'key_features', value: string) => {
    if (!value.trim()) return;
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), value.trim()]
    }));
    if (field === 'core_values') setCoreValueInput("");
    if (field === 'unique_selling_points') setUspInput("");
    if (field === 'key_features') setKeyFeatureInput("");
  };

  const removeArrayItem = (field: 'core_values' | 'unique_selling_points' | 'key_features', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index)
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40 backdrop-blur-lg bg-card/95">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                ← Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Company Brain</h1>
                  <p className="text-sm text-muted-foreground">AI Knowledge Base</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button onClick={() => { setIsEditing(false); loadBrainData(); }} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-100px)]">
        <div className="max-w-7xl mx-auto px-8 py-8">
          
          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="form">
                <Building2 className="h-4 w-4 mr-2" />
                Form
              </TabsTrigger>
              <TabsTrigger value="context">
                <FileText className="h-4 w-4 mr-2" />
                Additional Context
              </TabsTrigger>
              <TabsTrigger value="documents">
                <Upload className="h-4 w-4 mr-2" />
                Documents ({documents.length})
              </TabsTrigger>
            </TabsList>

            {/* Form Tab */}
            <TabsContent value="form" className="space-y-6">
              
              {/* Basic Information */}
              <Card>
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('basic')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-accent-blue" />
                  <div>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Company details and contact information</CardDescription>
                  </div>
                </div>
                {expandedSections.basic ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>
            {expandedSections.basic && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Company Name *</Label>
                    <Input
                      value={formData.company_name || ""}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div>
                    <Label>Tagline</Label>
                    <Input
                      value={formData.company_tagline || ""}
                      onChange={(e) => setFormData({ ...formData, company_tagline: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Your company tagline"
                    />
                  </div>
                </div>

                <div>
                  <Label>Company Description</Label>
                  <Textarea
                    value={formData.company_description || ""}
                    onChange={(e) => setFormData({ ...formData, company_description: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Describe your company..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Industry</Label>
                    <Input
                      value={formData.industry || ""}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      disabled={!isEditing}
                      placeholder="e.g., Technology"
                    />
                  </div>
                  <div>
                    <Label>Founded Year</Label>
                    <Input
                      type="number"
                      value={formData.founded_year || ""}
                      onChange={(e) => setFormData({ ...formData, founded_year: parseInt(e.target.value) })}
                      disabled={!isEditing}
                      placeholder="e.g., 2020"
                    />
                  </div>
                  <div>
                    <Label>Company Size</Label>
                    <Input
                      value={formData.company_size || ""}
                      onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                      disabled={!isEditing}
                      placeholder="e.g., 50-100 employees"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Headquarters Location</Label>
                    <Input
                      value={formData.headquarters_location || ""}
                      onChange={(e) => setFormData({ ...formData, headquarters_location: e.target.value })}
                      disabled={!isEditing}
                      placeholder="City, Country"
                    />
                  </div>
                  <div>
                    <Label>Website URL</Label>
                    <Input
                      value={formData.website_url || ""}
                      onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                      disabled={!isEditing}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={formData.contact_email || ""}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      disabled={!isEditing}
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input
                      value={formData.contact_phone || ""}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      disabled={!isEditing}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('business')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-green-600" />
                  <div>
                    <CardTitle>Business Information</CardTitle>
                    <CardDescription>Mission, vision, and values</CardDescription>
                  </div>
                </div>
                {expandedSections.business ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>
            {expandedSections.business && (
              <CardContent className="space-y-4">
                <div>
                  <Label>Mission Statement</Label>
                  <Textarea
                    value={formData.mission_statement || ""}
                    onChange={(e) => setFormData({ ...formData, mission_statement: e.target.value })}
                    disabled={!isEditing}
                    placeholder="What is your company's mission?"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Vision Statement</Label>
                  <Textarea
                    value={formData.vision_statement || ""}
                    onChange={(e) => setFormData({ ...formData, vision_statement: e.target.value })}
                    disabled={!isEditing}
                    placeholder="What is your company's vision?"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Core Values</Label>
                  {isEditing && (
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={coreValueInput}
                        onChange={(e) => setCoreValueInput(e.target.value)}
                        placeholder="Add a core value"
                        onKeyPress={(e) => e.key === 'Enter' && addArrayItem('core_values', coreValueInput)}
                      />
                      <Button onClick={() => addArrayItem('core_values', coreValueInput)} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {formData.core_values?.map((value, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {value}
                        {isEditing && (
                          <X
                            className="h-3 w-3 ml-2 cursor-pointer"
                            onClick={() => removeArrayItem('core_values', index)}
                          />
                        )}
                      </Badge>
                    ))}
                    {!formData.core_values?.length && !isEditing && (
                      <span className="text-sm text-muted-foreground">No core values added</span>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Unique Selling Points</Label>
                  {isEditing && (
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={uspInput}
                        onChange={(e) => setUspInput(e.target.value)}
                        placeholder="Add a USP"
                        onKeyPress={(e) => e.key === 'Enter' && addArrayItem('unique_selling_points', uspInput)}
                      />
                      <Button onClick={() => addArrayItem('unique_selling_points', uspInput)} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {formData.unique_selling_points?.map((usp, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {usp}
                        {isEditing && (
                          <X
                            className="h-3 w-3 ml-2 cursor-pointer"
                            onClick={() => removeArrayItem('unique_selling_points', index)}
                          />
                        )}
                      </Badge>
                    ))}
                    {!formData.unique_selling_points?.length && !isEditing && (
                      <span className="text-sm text-muted-foreground">No USPs added</span>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Target Audience</Label>
                  <Textarea
                    value={formData.target_audience || ""}
                    onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Describe your target audience..."
                    rows={3}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Products & Services */}
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('products')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-yellow-600" />
                  <div>
                    <CardTitle>Products & Services</CardTitle>
                    <CardDescription>What you offer</CardDescription>
                  </div>
                </div>
                {expandedSections.products ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>
            {expandedSections.products && (
              <CardContent className="space-y-4">
                <div>
                  <Label>Pricing Model</Label>
                  <Input
                    value={formData.pricing_model || ""}
                    onChange={(e) => setFormData({ ...formData, pricing_model: e.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g., Subscription, One-time, Freemium"
                  />
                </div>

                <div>
                  <Label>Key Features</Label>
                  {isEditing && (
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={keyFeatureInput}
                        onChange={(e) => setKeyFeatureInput(e.target.value)}
                        placeholder="Add a key feature"
                        onKeyPress={(e) => e.key === 'Enter' && addArrayItem('key_features', keyFeatureInput)}
                      />
                      <Button onClick={() => addArrayItem('key_features', keyFeatureInput)} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {formData.key_features?.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {feature}
                        {isEditing && (
                          <X
                            className="h-3 w-3 ml-2 cursor-pointer"
                            onClick={() => removeArrayItem('key_features', index)}
                          />
                        )}
                      </Badge>
                    ))}
                    {!formData.key_features?.length && !isEditing && (
                      <span className="text-sm text-muted-foreground">No features added</span>
                    )}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Team Information */}
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('team')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <CardTitle>Team Information</CardTitle>
                    <CardDescription>Leadership and team details</CardDescription>
                  </div>
                </div>
                {expandedSections.team ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>
            {expandedSections.team && (
              <CardContent className="space-y-4">
                <div>
                  <Label>Founder Information</Label>
                  <Textarea
                    value={formData.founder_info || ""}
                    onChange={(e) => setFormData({ ...formData, founder_info: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Information about founder(s)..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Team Size Details</Label>
                  <Textarea
                    value={formData.team_size_details || ""}
                    onChange={(e) => setFormData({ ...formData, team_size_details: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Details about team structure and size..."
                    rows={3}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* End of Team Information */}
            </TabsContent>

            {/* Additional Context Tab */}
            <TabsContent value="context">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <div>
                      <CardTitle>Additional Context</CardTitle>
                      <CardDescription>Extra information for AI training</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Extra Information for AI</Label>
                    <Textarea
                      value={formData.additional_context || ""}
                      onChange={(e) => setFormData({ ...formData, additional_context: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Add any additional information that would help the AI understand your business better...&#10;&#10;Examples:&#10;- Company history and milestones&#10;- Key partnerships or collaborations&#10;- Unique processes or methodologies&#10;- Industry-specific terminology&#10;- Common customer questions and answers&#10;- Brand voice and communication style"
                      rows={20}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      This information will be used to train the AI bot to better answer questions about your company. The more detailed and specific you are, the better the AI will perform.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Upload className="h-5 w-5 text-green-600" />
                    <div>
                      <CardTitle>Documents & Groups</CardTitle>
                      <CardDescription>Manage files and organize with groups</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Nested Tabs for Files and Groups */}
                  <Tabs value={documentsTabView} onValueChange={setDocumentsTabView}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="files">
                        <FileText className="h-4 w-4 mr-2" />
                        Files
                      </TabsTrigger>
                      <TabsTrigger value="groups">
                        <Users className="h-4 w-4 mr-2" />
                        Groups
                      </TabsTrigger>
                    </TabsList>

                    {/* Files Tab */}
                    <TabsContent value="files" className="space-y-4">
                    {/* Group Management */}
                    <div className="flex items-center gap-2">
                      <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Filter by group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Documents</SelectItem>
                          {documentGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.group_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => setIsGroupDialogOpen(true)}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Group
                      </Button>
                      {selectedGroupFilter !== "all" && (
                        <Button
                          onClick={() => handleDeleteGroup(selectedGroupFilter)}
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    
                    <div 
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragging 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <Input
                        id="file-upload"
                        type="file"
                        onChange={handleFileSelect}
                        disabled={isUploading}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.ogg,.mp4,.webm,.mov,.doc,.docx,.txt"
                      />
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center gap-2">
                          {isUploading ? (
                            <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
                          ) : (
                            <Upload className={`h-12 w-12 ${
                              isDragging ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                          )}
                          <p className={`text-lg font-medium ${
                            isDragging ? 'text-primary' : ''
                          }`}>
                            {isUploading ? "Uploading..." : isDragging ? "Drop file here" : "Click or drag to upload files"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            PDF, Images, Audio, Video (Max 50MB per file)
                          </p>
                        </div>
                      </Label>
                    </div>

                    {documents.length > 0 && (
                      <div className="space-y-2">
                        <Separator />
                        <div className="grid grid-cols-1 gap-2">
                          {documents
                            .filter(doc => selectedGroupFilter === "all" || doc.document_group_id === selectedGroupFilter)
                            .map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-start justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-start gap-3 flex-1">
                                {getFileIcon(doc.file_type)}
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{doc.file_name}</p>
                                  {doc.description && (
                                    <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <p className="text-xs text-muted-foreground">
                                      {(doc.file_size! / 1024 / 1024).toFixed(2)} MB • {doc.file_type}
                                    </p>
                                    {doc.category && (
                                      <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                                    )}
                                    {doc.tags && doc.tags.map((tag, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={doc.status === 'uploaded' ? 'secondary' : 'outline'}>
                                  {doc.status}
                                </Badge>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => window.open(doc.storage_url, '_blank')}>
                                      <FileText className="h-4 w-4 mr-2" />
                                      View
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      setDocumentToMove(doc);
                                      setMoveToGroupId(doc.document_group_id || "");
                                      setIsMoveDialogOpen(true);
                                    }}>
                                      <Move className="h-4 w-4 mr-2" />
                                      Move
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteDocument(doc)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    </TabsContent>

                    {/* Groups Tab */}
                    <TabsContent value="groups" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          Manage document groups to organize your files
                        </p>
                        <Button
                          onClick={() => setIsGroupDialogOpen(true)}
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Group
                        </Button>
                      </div>

                      {documentGroups.length === 0 ? (
                        <div className="border-2 border-dashed rounded-lg p-8 text-center">
                          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-lg font-medium mb-2">No groups yet</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Create groups to organize your documents
                          </p>
                          <Button
                            onClick={() => setIsGroupDialogOpen(true)}
                            variant="outline"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Group
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {documentGroups.map((group) => {
                            const groupDocCount = documents.filter(d => d.document_group_id === group.id).length;
                            return (
                              <Card key={group.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <CardTitle className="text-base">{group.group_name}</CardTitle>
                                      {group.description && (
                                        <CardDescription className="text-xs mt-1">
                                          {group.description}
                                        </CardDescription>
                                      )}
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => {
                                          setEditingGroup(group);
                                          setIsEditGroupDialogOpen(true);
                                        }}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => handleDeleteGroup(group.id)}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">
                                      {groupDocCount} {groupDocCount === 1 ? 'document' : 'documents'}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedGroupFilter(group.id);
                                        setDocumentsTabView("files");
                                      }}
                                    >
                                      View Files
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Upload Dialog */}
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Add document details and metadata
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {selectedFile && (
                  <div className="bg-muted p-3 rounded-lg space-y-1">
                    <p className="text-sm font-medium">File: {selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="doc-desc">Description (Optional)</Label>
                  <Textarea
                    id="doc-desc"
                    value={uploadFormData.description}
                    onChange={(e) => setUploadFormData({...uploadFormData, description: e.target.value})}
                    placeholder="Describe this document..."
                    disabled={isUploading}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-tags">Tags (Optional)</Label>
                  <Input
                    id="doc-tags"
                    value={uploadFormData.tags}
                    onChange={(e) => setUploadFormData({...uploadFormData, tags: e.target.value})}
                    placeholder="sales, training, onboarding (comma-separated)"
                    disabled={isUploading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-category">Category (Optional)</Label>
                  <Select 
                    value={uploadFormData.category} 
                    onValueChange={(value) => setUploadFormData({...uploadFormData, category: value})}
                    disabled={isUploading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-group">Group (Optional)</Label>
                  <Select 
                    value={uploadFormData.documentGroupId} 
                    onValueChange={(value) => setUploadFormData({...uploadFormData, documentGroupId: value})}
                    disabled={isUploading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Group</SelectItem>
                      {documentGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.group_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadDialogOpen(false);
                    setSelectedFile(null);
                    setUploadFormData({ description: "", tags: "", category: "", documentGroupId: "" });
                  }}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button onClick={handleUploadConfirm} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Group Dialog */}
          <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Document Group</DialogTitle>
                <DialogDescription>
                  Organize your documents into groups
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="group-name">Group Name</Label>
                  <Input
                    id="group-name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter group name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group-desc">Description (Optional)</Label>
                  <Textarea
                    id="group-desc"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Describe this group..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsGroupDialogOpen(false);
                    setNewGroupName("");
                    setNewGroupDescription("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Group Dialog */}
          <Dialog open={isEditGroupDialogOpen} onOpenChange={setIsEditGroupDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Document Group</DialogTitle>
                <DialogDescription>
                  Update group name and description
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-group-name">Group Name</Label>
                  <Input
                    id="edit-group-name"
                    value={editingGroup?.group_name || ""}
                    onChange={(e) => setEditingGroup(editingGroup ? {...editingGroup, group_name: e.target.value} : null)}
                    placeholder="Enter group name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-group-desc">Description (Optional)</Label>
                  <Textarea
                    id="edit-group-desc"
                    value={editingGroup?.description || ""}
                    onChange={(e) => setEditingGroup(editingGroup ? {...editingGroup, description: e.target.value} : null)}
                    placeholder="Describe this group..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditGroupDialogOpen(false);
                    setEditingGroup(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleEditGroup} disabled={!editingGroup?.group_name.trim()}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Move Document Dialog */}
          <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Move Document</DialogTitle>
                <DialogDescription>
                  Move "{documentToMove?.file_name}" to a different group
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="group-search">Search Groups</Label>
                  <Input
                    id="group-search"
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    placeholder="Search groups..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Select Group</Label>
                  <ScrollArea className="h-[200px] border rounded-md p-2">
                    <div className="space-y-1">
                      <div
                        className={`p-2 rounded cursor-pointer hover:bg-accent transition-colors ${
                          moveToGroupId === "" ? "bg-accent" : ""
                        }`}
                        onClick={() => setMoveToGroupId("")}
                      >
                        <p className="text-sm font-medium">No Group</p>
                        <p className="text-xs text-muted-foreground">Remove from all groups</p>
                      </div>
                      {documentGroups
                        .filter(group => 
                          group.group_name.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
                          (group.description && group.description.toLowerCase().includes(groupSearchQuery.toLowerCase()))
                        )
                        .map((group) => (
                          <div
                            key={group.id}
                            className={`p-2 rounded cursor-pointer hover:bg-accent transition-colors ${
                              moveToGroupId === group.id ? "bg-accent" : ""
                            }`}
                            onClick={() => setMoveToGroupId(group.id)}
                          >
                            <p className="text-sm font-medium">{group.group_name}</p>
                            {group.description && (
                              <p className="text-xs text-muted-foreground">{group.description}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsMoveDialogOpen(false);
                    setDocumentToMove(null);
                    setMoveToGroupId("");
                    setGroupSearchQuery("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleMoveDocument}>
                  <Move className="h-4 w-4 mr-2" />
                  Move Document
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </ScrollArea>
    </div>
  );
}
