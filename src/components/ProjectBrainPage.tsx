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
import {
  storeProjectEmbedding,
  prepareProjectMetadataForEmbedding,
  deleteProjectEmbeddingsByType,
  chunkProjectText
} from "@/lib/projectEmbeddings";
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
  FolderKanban
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadFormData, setUploadFormData] = useState({
    description: "",
    tags: "",
    category: ""
  });

  // Tech stack input
  const [techStackInput, setTechStackInput] = useState("");
  const [keyGoalsInput, setKeyGoalsInput] = useState("");

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

      // Generate and store embeddings
      try {
        const content = prepareProjectMetadataForEmbedding(metadata, project.project_name);

        // Delete old embeddings
        await deleteProjectEmbeddingsByType(supabase, projectId, 'project_metadata');

        // Store new embedding
        await storeProjectEmbedding(supabase, {
          project_id: projectId,
          company_id: user.id,
          content_type: 'project_metadata',
          content_id: projectId,
          content: content,
          metadata: { source: 'project_metadata_form' }
        });
      } catch (embeddingError) {
        console.warn('Failed to generate embeddings:', embeddingError);
        // Don't fail the save if embeddings fail
      }

      toast({
        title: "Success",
        description: "Project metadata saved successfully"
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
      
      const { error: insertError } = await supabase
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
        }]);

      if (insertError) throw insertError;

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

  const handleDeleteDocument = async (documentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('project_documents')
        .update({ is_deleted: true })
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document deleted successfully"
      });

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
                    Upload documents to enhance your Project Brain
                  </CardDescription>
                </div>
                <Button onClick={() => document.getElementById('file-upload')?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Upload documents to build your Project Brain
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {documents.map((doc) => (
                      <Card key={doc.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">{doc.file_name}</CardTitle>
                              <CardDescription className="mt-1">
                                {doc.description || "No description"}
                              </CardDescription>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {doc.tags?.map((tag, index) => (
                              <Badge key={index} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                            {doc.category && (
                              <Badge variant="secondary">{doc.category}</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
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
              <Input
                value={uploadFormData.category}
                onChange={(e) => setUploadFormData({ ...uploadFormData, category: e.target.value })}
                placeholder="e.g., requirements, design"
              />
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
    </div>
  );
}
