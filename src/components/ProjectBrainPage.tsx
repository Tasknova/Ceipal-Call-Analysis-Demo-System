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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Project, ProjectMetadata, ProjectDocument } from "@/lib/supabase";
import { storeProjectEmbedding, prepareProjectMetadataForEmbedding, deleteProjectEmbeddingsByType } from "@/lib/projectEmbeddings";
import {
  Brain,
  Save,
  Edit,
  Upload,
  FileText,
  X,
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  Target,
  Code,
  Users,
  Sparkles,
  FolderKanban,
  File,
  FileImage,
  Download,
  ExternalLink,
  DollarSign
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectBrainPageProps {
  projectId: string;
  onBack: () => void;
}

export default function ProjectBrainPage({ projectId, onBack }: ProjectBrainPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [metadata, setMetadata] = useState<Partial<ProjectMetadata>>({});
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("metadata");

  // Upload dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDocumentDialogOpen, setEditDocumentDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [documentToEdit, setDocumentToEdit] = useState<ProjectDocument | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadFormData, setUploadFormData] = useState({
    description: "",
    tags: "",
    category: ""
  });
  const [editFormData, setEditFormData] = useState({
    description: "",
    tags: "",
    category: ""
  });
  const [customCategory, setCustomCategory] = useState("");
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Tech stack input
  const [techStackInput, setTechStackInput] = useState("");
  const [keyGoalsInput, setKeyGoalsInput] = useState("");

  // Helper function to get file icon
  const getFileIcon = (fileType: string, mimeType?: string) => {
    const type = fileType?.toLowerCase() || '';
    const mime = mimeType?.toLowerCase() || '';
    
    if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(type)) {
      return FileImage;
    } else if (type === 'pdf' || mime === 'application/pdf') {
      return FileText;
    } else if (['doc', 'docx', 'txt'].includes(type) || mime.includes('text') || mime.includes('document')) {
      return FileText;
    }
    return File;
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Helper function to group documents by category
  const groupDocumentsByCategory = () => {
    const grouped: { [key: string]: ProjectDocument[] } = {};
    documents.forEach(doc => {
      const category = doc.category || 'Uncategorized';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(doc);
    });
    return grouped;
  };

  useEffect(() => {
    if (user && projectId) {
      loadProjectData();
    }
  }, [user, projectId]);

  const loadProjectData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Load project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Load metadata
      const { data: metadataData, error: metadataError } = await supabase
        .from('project_metadata')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (metadataError && metadataError.code !== 'PGRST116') {
        throw metadataError;
      }
      
      if (metadataData) {
        setMetadata(metadataData);
      }

      // Load documents
      const { data: docsData, error: docsError } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docsData || []);
      
      // Extract unique categories
      const categories = [...new Set(docsData.map(doc => doc.category).filter(Boolean) as string[])];
      setExistingCategories(categories);
    } catch (error) {
      console.error('Error loading project data:', error);
      toast({
        title: "Error",
        description: "Failed to load project data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!user || !project) return;

    try {
      setIsSaving(true);

      // Update metadata
      const { error } = await supabase
        .from('project_metadata')
        .upsert({
          project_id: projectId,
          company_id: user.id,
          ...metadata,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Generate and store embeddings for the updated metadata
      try {
        // Delete old metadata embeddings first
        await deleteProjectEmbeddingsByType(supabase, projectId, 'project_metadata');
        
        // Prepare content for embedding (includes pricing information now)
        const content = prepareProjectMetadataForEmbedding(metadata, project.project_name);
        
        // Store new embedding
        await storeProjectEmbedding(supabase, {
          projectId,
          companyId: user.id,
          contentType: 'project_metadata',
          contentId: projectId,
          content,
          metadata: {
            project_name: project.project_name,
            domain: metadata.domain,
            industry: metadata.industry,
            has_pricing_info: !!(metadata.pricing_information)
          }
        });
        
        console.log('✅ Project metadata embeddings regenerated successfully');
      } catch (embeddingError) {
        console.warn('⚠️ Failed to generate embeddings, but metadata was saved:', embeddingError);
        // Don't fail the entire save operation if embeddings fail
      }

      toast({
        title: "Success",
        description: "Project metadata saved successfully (including embeddings)"
      });

      setIsEditing(false);
      loadProjectData();
    } catch (error) {
      console.error('Error saving metadata:', error);
      toast({
        title: "Error",
        description: "Failed to save project metadata",
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
    event.target.value = '';
  };

  const handleUploadDocument = async () => {
    if (!user || !project || !selectedFile) return;

    try {
      setIsUploading(true);

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const filePath = `${user.id}/${projectId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-documents')
        .getPublicUrl(filePath);

      // Save document metadata
      const tags = uploadFormData.tags.split(',').map(t => t.trim()).filter(Boolean);
      
      const { data: insertedDoc, error: insertError } = await supabase
        .from('project_documents')
        .insert([{
          project_id: projectId,
          company_id: user.id,
          uploaded_by: user.id,
          file_name: selectedFile.name,
          file_type: fileExt || 'unknown',
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          storage_path: filePath,
          storage_url: publicUrl,
          description: uploadFormData.description || null,
          tags: tags.length > 0 ? tags : null,
          category: uploadFormData.category || null
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Embeddings will be generated automatically by database trigger

      toast({
        title: "Success",
        description: "Document uploaded successfully"
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadFormData({ description: "", tags: "", category: "" });
      loadProjectData();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const openDeleteDialog = (documentId: string) => {
    setDocumentToDelete(documentId);
    setDeleteDialogOpen(true);
  };

  const openEditDocumentDialog = (doc: ProjectDocument) => {
    setDocumentToEdit(doc);
    setEditFormData({
      description: doc.description || "",
      tags: doc.tags?.join(", ") || "",
      category: doc.category || ""
    });
    setEditDocumentDialogOpen(true);
  };

  const handleUpdateDocument = async () => {
    if (!user || !documentToEdit || !project) return;

    try {
      const tags = editFormData.tags.split(',').map(t => t.trim()).filter(Boolean);
      
      const { error } = await supabase
        .from('project_documents')
        .update({
          description: editFormData.description || null,
          tags: tags.length > 0 ? tags : null,
          category: editFormData.category || null
        })
        .eq('id', documentToEdit.id);

      if (error) throw error;

      // Embeddings will be regenerated automatically by database trigger

      toast({
        title: "Success",
        description: "Document updated successfully"
      });

      setEditDocumentDialogOpen(false);
      setDocumentToEdit(null);
      loadProjectData();
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: "Error",
        description: "Failed to update document",
        variant: "destructive"
      });
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !existingCategories.includes(newCategoryName.trim())) {
      setExistingCategories([...existingCategories, newCategoryName.trim()]);
      setNewCategoryName("");
      toast({
        title: "Success",
        description: "Category added successfully"
      });
    }
  };

  const handleDeleteCategory = (category: string) => {
    setExistingCategories(existingCategories.filter(cat => cat !== category));
    toast({
      title: "Success",
      description: "Category removed"
    });
  };

  const handleDeleteDocument = async () => {
    if (!user || !documentToDelete) return;

    try {
      // Delete document
      const { error } = await supabase
        .from('project_documents')
        .update({ is_deleted: true })
        .eq('id', documentToDelete);

      if (error) throw error;

      // Embeddings will be deleted automatically by database trigger

      toast({
        title: "Success",
        description: "Document deleted successfully"
      });

      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      loadProjectData();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive"
      });
    }
  };

  const addTechStack = () => {
    if (techStackInput.trim()) {
      const current = metadata.tech_stack || [];
      setMetadata({
        ...metadata,
        tech_stack: [...current, techStackInput.trim()]
      });
      setTechStackInput("");
    }
  };

  const removeTechStack = (index: number) => {
    const current = metadata.tech_stack || [];
    setMetadata({
      ...metadata,
      tech_stack: current.filter((_, i) => i !== index)
    });
  };

  const addKeyGoal = () => {
    if (keyGoalsInput.trim()) {
      const current = metadata.key_goals || [];
      setMetadata({
        ...metadata,
        key_goals: [...current, keyGoalsInput.trim()]
      });
      setKeyGoalsInput("");
    }
  };

  const removeKeyGoal = (index: number) => {
    const current = metadata.key_goals || [];
    setMetadata({
      ...metadata,
      key_goals: current.filter((_, i) => i !== index)
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Project not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header Navigation */}
      <header className="border-b border-border bg-card px-8 py-5 sticky top-0 z-50 backdrop-blur-lg bg-card/95">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <img 
              src="/ceipal_logo.png" 
              alt="Ceipal Logo" 
              className="h-12 cursor-pointer hover:opacity-90 transition-opacity duration-300" 
              onClick={() => window.location.href = '/'}
            />
            <div className="border-l border-border pl-6">
              <h1 className="text-xl font-semibold text-primary tracking-wide">Ceipal Voice Intelligence</h1>
              <p className="text-xs text-muted-foreground">AI Powered. People Driven.</p>
            </div>
          </div>
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </Button>
          )}
        </div>
      </header>

      <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8" />
              {project.project_name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Project Brain - Knowledge Base & Documents
            </p>
          </div>
        </div>
        <Badge className="bg-purple-500">
          <Sparkles className="h-3 w-3 mr-1" />
          AI-Powered
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="metadata">
            <Target className="h-4 w-4 mr-2" />
            Project Metadata
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents ({documents.length})
          </TabsTrigger>
        </TabsList>

        {/* Metadata Tab */}
        <TabsContent value="metadata">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Project Information</CardTitle>
                  <CardDescription>
                    Structured data about your project for AI embeddings
                  </CardDescription>
                </div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveMetadata} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <Accordion type="multiple" defaultValue={["basic", "tech", "audience", "context"]} className="space-y-2">
                  
                  {/* Basic Info Section */}
                  <AccordionItem value="basic" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-5 w-5 text-blue-500" />
                        <span className="text-lg font-semibold">Basic Information</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Domain</Label>
                          {isEditing ? (
                            <Input
                              value={metadata.domain || ""}
                              onChange={(e) => setMetadata({ ...metadata, domain: e.target.value })}
                              placeholder="e.g., Healthcare, Finance"
                            />
                          ) : (
                            <p className="text-sm mt-1">{metadata.domain || "Not specified"}</p>
                          )}
                        </div>
                        <div>
                          <Label>Industry</Label>
                          {isEditing ? (
                            <Input
                              value={metadata.industry || ""}
                              onChange={(e) => setMetadata({ ...metadata, industry: e.target.value })}
                              placeholder="e.g., SaaS, E-commerce"
                            />
                          ) : (
                            <p className="text-sm mt-1">{metadata.industry || "Not specified"}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Project Type</Label>
                          {isEditing ? (
                            <Input
                              value={metadata.project_type || ""}
                              onChange={(e) => setMetadata({ ...metadata, project_type: e.target.value })}
                              placeholder="e.g., Web App, Mobile App"
                            />
                          ) : (
                            <p className="text-sm mt-1">{metadata.project_type || "Not specified"}</p>
                          )}
                        </div>
                        <div>
                          <Label>Priority Level</Label>
                          {isEditing ? (
                            <Select
                              value={metadata.priority_level || ""}
                              onValueChange={(value: any) => setMetadata({ ...metadata, priority_level: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-sm mt-1 capitalize">{metadata.priority_level || "Not specified"}</p>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Technology Stack Section */}
                  <AccordionItem value="tech" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Code className="h-5 w-5 text-purple-500" />
                        <span className="text-lg font-semibold">Technology Stack</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      {isEditing && (
                        <div className="flex gap-2">
                          <Input
                            value={techStackInput}
                            onChange={(e) => setTechStackInput(e.target.value)}
                            placeholder="Add technology..."
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTechStack())}
                          />
                          <Button type="button" onClick={addTechStack}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2">
                        {(metadata.tech_stack || []).map((tech, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {tech}
                            {isEditing && (
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => removeTechStack(index)}
                              />
                            )}
                          </Badge>
                        ))}
                        {(!metadata.tech_stack || metadata.tech_stack.length === 0) && !isEditing && (
                          <p className="text-sm text-muted-foreground">No technologies added</p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Audience & Goals Section */}
                  <AccordionItem value="audience" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-green-500" />
                        <span className="text-lg font-semibold">Audience & Goals</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div>
                        <Label>Target Audience</Label>
                        {isEditing ? (
                          <Textarea
                            value={metadata.target_audience || ""}
                            onChange={(e) => setMetadata({ ...metadata, target_audience: e.target.value })}
                            placeholder="Who is this project for?"
                            rows={3}
                          />
                        ) : (
                          <p className="text-sm mt-1 whitespace-pre-wrap">{metadata.target_audience || "Not specified"}</p>
                        )}
                      </div>

                      <div>
                        <Label>Key Goals</Label>
                        {isEditing && (
                          <div className="flex gap-2 mb-2">
                            <Input
                              value={keyGoalsInput}
                              onChange={(e) => setKeyGoalsInput(e.target.value)}
                              placeholder="Add goal..."
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyGoal())}
                            />
                            <Button type="button" onClick={addKeyGoal}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <ul className="space-y-2">
                          {(metadata.key_goals || []).map((goal, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-sm">• {goal}</span>
                              {isEditing && (
                                <X
                                  className="h-4 w-4 cursor-pointer text-destructive"
                                  onClick={() => removeKeyGoal(index)}
                                />
                              )}
                            </li>
                          ))}
                        </ul>
                        {(!metadata.key_goals || metadata.key_goals.length === 0) && !isEditing && (
                          <p className="text-sm text-muted-foreground">No goals added</p>
                        )}
                      </div>

                      <div>
                        <Label>Requirements</Label>
                        {isEditing ? (
                          <Textarea
                            value={metadata.requirements || ""}
                            onChange={(e) => setMetadata({ ...metadata, requirements: e.target.value })}
                            placeholder="Key requirements and constraints"
                            rows={4}
                          />
                        ) : (
                          <p className="text-sm mt-1 whitespace-pre-wrap">{metadata.requirements || "Not specified"}</p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Pricing Information Section */}
                  <AccordionItem value="pricing" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-500" />
                        <span className="text-lg font-semibold">Pricing & Quote Guidelines</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div>
                        <Label>Pricing Information</Label>
                        {isEditing ? (
                          <Textarea
                            value={metadata.pricing_information || ""}
                            onChange={(e) => setMetadata({ ...metadata, pricing_information: e.target.value })}
                            placeholder="Enter pricing details, quote ranges, and ROI talking points...

Example:
Base Quote Range: $150,000 - $300,000 (Annual License)
Pricing Model: SaaS Subscription - Per User/Per Month

Quote Guidelines:
  Small Agency: $150K-$250K/year (10-25 recruiters, Professional tier)
  Mid-Market: $300K-$600K/year (25-75 recruiters, Professional/Enterprise)
  Enterprise: $700K-$1.2M+/year (75+ recruiters, Enterprise tier with customization)
  Discount Strategy: Annual commitment: 10-15% off, Multi-year: 20-25% off

ROI Talking Points:
  • Reduce time-to-hire by 40-50%: Save $50K-$200K annually in recruiter time
  • Increase placements by 30%: Additional $500K-$2M in revenue for staffing firms
  • Reduce cost-per-hire by 35%: Save $100K-$500K on recruitment costs
  • Improve recruiter productivity by 60%: Handle 2x more reqs per recruiter
  • Typical ROI: 3-6 months for mid-market, 6-12 months for enterprise"
                            rows={15}
                            className="font-mono text-sm"
                          />
                        ) : (
                          <div className="mt-2 p-4 bg-muted/30 rounded-lg border">
                            {metadata.pricing_information ? (
                              <pre className="text-sm whitespace-pre-wrap font-sans">{metadata.pricing_information}</pre>
                            ) : (
                              <p className="text-sm text-muted-foreground">No pricing information set. Click Edit to add pricing details and quote guidelines.</p>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Include pricing tiers, quote ranges by customer size, discount strategies, and ROI talking points for sales reference
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Additional Context Section */}
                  <AccordionItem value="context" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        <span className="text-lg font-semibold">Additional Context</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Team Size</Label>
                          {isEditing ? (
                            <Input
                              value={metadata.team_size || ""}
                              onChange={(e) => setMetadata({ ...metadata, team_size: e.target.value })}
                              placeholder="e.g., 5-10 people"
                            />
                          ) : (
                            <p className="text-sm mt-1">{metadata.team_size || "Not specified"}</p>
                          )}
                        </div>
                        <div>
                          <Label>Budget Range</Label>
                          {isEditing ? (
                            <Input
                              value={metadata.budget_range || ""}
                              onChange={(e) => setMetadata({ ...metadata, budget_range: e.target.value })}
                              placeholder="e.g., $50k-$100k"
                            />
                          ) : (
                            <p className="text-sm mt-1">{metadata.budget_range || "Not specified"}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label>Additional Context</Label>
                        {isEditing ? (
                          <Textarea
                            value={metadata.additional_context || ""}
                            onChange={(e) => setMetadata({ ...metadata, additional_context: e.target.value })}
                            placeholder="Any other relevant information..."
                            rows={5}
                          />
                        ) : (
                          <p className="text-sm mt-1 whitespace-pre-wrap">{metadata.additional_context || "Not specified"}</p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                </Accordion>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Project Documents</CardTitle>
                  <CardDescription>
                    Upload and manage your project documents ({documents.length} files)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>
                    <FolderKanban className="h-4 w-4 mr-2" />
                    Manage Groups
                  </Button>
                  <Button onClick={() => document.getElementById('file-upload')?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Upload documents to build your Project Brain
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupDocumentsByCategory()).map(([category, docs]) => (
                      <div key={category}>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                          <FolderKanban className="h-4 w-4" />
                          {category} ({docs.length})
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {docs.map((doc) => {
                            const FileIcon = getFileIcon(doc.file_type || '', doc.mime_type);
                            const isImage = doc.mime_type?.startsWith('image/');
                            
                            return (
                              <Card 
                                key={doc.id} 
                                className="group hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                                onClick={() => doc.storage_url && window.open(doc.storage_url, '_blank')}
                              >
                                <CardContent className="p-4">
                                  {/* Preview/Icon */}
                                  <div className="aspect-square rounded-md bg-muted mb-3 flex items-center justify-center overflow-hidden">
                                    {isImage && doc.storage_url ? (
                                      <img 
                                        src={doc.storage_url} 
                                        alt={doc.file_name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <FileIcon className="h-12 w-12 text-muted-foreground" />
                                    )}
                                  </div>
                                  
                                  {/* File Info */}
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium truncate" title={doc.file_name}>
                                      {doc.file_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {doc.file_size ? formatFileSize(doc.file_size) : 'Unknown size'}
                                    </p>
                                    {doc.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                        {doc.description}
                                      </p>
                                    )}
                                  </div>

                                  {/* Tags */}
                                  {doc.tags && doc.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {doc.tags.slice(0, 2).map((tag, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                      {doc.tags.length > 2 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{doc.tags.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  )}

                                  {/* Action Buttons - Show on Hover */}
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <Button
                                      variant="secondary"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditDocumentDialog(doc);
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    {doc.storage_url && (
                                      <Button
                                        variant="secondary"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(doc.storage_url, '_blank');
                                        }}
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="secondary"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (doc.storage_url) {
                                          const a = document.createElement('a');
                                          a.href = doc.storage_url;
                                          a.download = doc.file_name;
                                          a.click();
                                        }
                                      }}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openDeleteDialog(doc.id);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Add a document to your Project Brain
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>File</Label>
              <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={uploadFormData.description}
                onChange={(e) => setUploadFormData({ ...uploadFormData, description: e.target.value })}
                placeholder="Brief description of the document"
                rows={3}
              />
            </div>

            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                value={uploadFormData.tags}
                onChange={(e) => setUploadFormData({ ...uploadFormData, tags: e.target.value })}
                placeholder="e.g., requirements, design, technical"
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={uploadFormData.category}
                onValueChange={(value) => {
                  if (value === 'custom') {
                    setUploadFormData({ ...uploadFormData, category: '' });
                  } else {
                    setUploadFormData({ ...uploadFormData, category: value });
                    setCustomCategory('');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select or create category" />
                </SelectTrigger>
                <SelectContent>
                  {existingCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">+ Create New Category</SelectItem>
                </SelectContent>
              </Select>
              {(uploadFormData.category === '' || customCategory) && (
                <Input
                  className="mt-2"
                  value={customCategory || uploadFormData.category}
                  onChange={(e) => {
                    setCustomCategory(e.target.value);
                    setUploadFormData({ ...uploadFormData, category: e.target.value });
                  }}
                  placeholder="Enter new category name"
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUploadDocument} disabled={isUploading}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDocument}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={editDocumentDialogOpen} onOpenChange={setEditDocumentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Update document information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>File Name</Label>
              <p className="text-sm text-muted-foreground">{documentToEdit?.file_name}</p>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Brief description of the document"
                rows={3}
              />
            </div>

            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                value={editFormData.tags}
                onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
                placeholder="e.g., requirements, design, technical"
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={editFormData.category}
                onValueChange={(value) => {
                  if (value === 'custom') {
                    setEditFormData({ ...editFormData, category: '' });
                  } else {
                    setEditFormData({ ...editFormData, category: value });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select or create category" />
                </SelectTrigger>
                <SelectContent>
                  {existingCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">+ Create New Category</SelectItem>
                </SelectContent>
              </Select>
              {editFormData.category === '' && (
                <Input
                  className="mt-2"
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  placeholder="Enter new category name"
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDocumentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDocument}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Categories Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Document Groups</DialogTitle>
            <DialogDescription>
              Create and manage categories to organize your documents
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Add New Group</Label>
              <div className="flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter group name"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <Button onClick={handleAddCategory}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label>Existing Groups</Label>
              <ScrollArea className="h-[200px] rounded-md border p-4 mt-2">
                {existingCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No groups yet. Create one above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {existingCategories.map((category) => (
                      <div key={category} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                        <span className="text-sm">{category}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDeleteCategory(category)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setCategoryDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
