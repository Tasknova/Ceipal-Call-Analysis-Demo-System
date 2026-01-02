import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Plus,
  X
} from "lucide-react";
import { useBulkCreateLeads, useLeadGroups, useCreateLeadGroup } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";

interface CSVLead {
  name: string;
  email: string;
  contact: string;
  description?: string;
  other?: Record<string, any>;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface CSVUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CSVUploadDialog({ isOpen, onClose }: CSVUploadDialogProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVLead[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("none");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bulkCreateLeads = useBulkCreateLeads();
  const { data: leadGroups, refetch: refetchLeadGroups } = useLeadGroups();
  const createGroup = useCreateLeadGroup();
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      parseCSV(file);
    } else {
      toast({
        title: "Error",
        description: "Please select a valid CSV file",
        variant: "destructive",
      });
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "Error",
          description: "CSV file must have at least a header row and one data row",
          variant: "destructive",
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Validate required columns
      const requiredColumns = ['name', 'email', 'contact'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        toast({
          title: "Error",
          description: `Missing required columns: ${missingColumns.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      const data: CSVLead[] = [];
      const errors: ValidationError[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: CSVLead = {
          name: '',
          email: '',
          contact: '',
        };

        // Map required fields
        const nameIndex = headers.indexOf('name');
        const emailIndex = headers.indexOf('email');
        const contactIndex = headers.indexOf('contact');
        const descriptionIndex = headers.indexOf('description');

        if (nameIndex !== -1) row.name = values[nameIndex] || '';
        if (emailIndex !== -1) row.email = values[emailIndex] || '';
        if (contactIndex !== -1) row.contact = values[contactIndex] || '';
        if (descriptionIndex !== -1) row.description = values[descriptionIndex] || '';

        // Validate required fields
        if (!row.name.trim()) {
          errors.push({ row: i + 1, field: 'name', message: 'Name is required' });
        }
        if (!row.email.trim()) {
          errors.push({ row: i + 1, field: 'email', message: 'Email is required' });
        }
        if (!row.contact.trim()) {
          errors.push({ row: i + 1, field: 'contact', message: 'Contact is required' });
        }

        // Validate email format
        if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
          errors.push({ row: i + 1, field: 'email', message: 'Invalid email format' });
        }

        // Store additional fields in 'other'
        const otherFields: Record<string, any> = {};
        headers.forEach((header, index) => {
          if (!['name', 'email', 'contact', 'description'].includes(header) && values[index]) {
            otherFields[header] = values[index];
          }
        });
        
        if (Object.keys(otherFields).length > 0) {
          row.other = otherFields;
        }

        data.push(row);
      }

      setCsvData(data);
      setValidationErrors(errors);
      setShowPreview(true);
    };

    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (validationErrors.length > 0) {
      toast({
        title: "Error",
        description: "Please fix validation errors before uploading",
        variant: "destructive",
      });
      return;
    }

    if (csvData.length === 0) {
      toast({
        title: "Error",
        description: "No valid data to upload",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const leadsToCreate = csvData.map(lead => ({
        ...lead,
        group_id: selectedGroupId && selectedGroupId !== "none" ? selectedGroupId : undefined,
      }));

      await bulkCreateLeads.mutateAsync(leadsToCreate);

      toast({
        title: "Success",
        description: `Successfully uploaded ${csvData.length} leads`,
      });

      // Reset form and close dialog
      resetForm();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload leads",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setCsvFile(null);
    setCsvData([]);
    setValidationErrors([]);
    setSelectedGroupId("none");
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const newGroup = await createGroup.mutateAsync({
        group_name: newGroupName.trim(),
      });
      
      // Update the form with the newly created group
      setSelectedGroupId(newGroup.id);
      
      toast({
        title: "Success",
        description: "Group created successfully",
      });
      
      // Reset the new group dialog
      setNewGroupName("");
      setIsCreatingGroup(false);
      
      // Refetch the groups to update the dropdown
      refetchLeadGroups();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const csvContent = "Name,Email,Contact,Description\nJohn Doe,john@example.com,+1234567890,Sample lead";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Upload Leads from CSV</DialogTitle>
            <DialogDescription>
              Upload multiple leads at once from a CSV file
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Required Columns:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>Name</strong> - Lead's full name</li>
                  <li>• <strong>Email</strong> - Valid email address</li>
                  <li>• <strong>Contact</strong> - Phone number or contact info</li>
                </ul>
                <Button variant="ghost" onClick={downloadTemplate} className="mt-4 text-xs">
                  Download Template
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="csvFile">CSV File</Label>
                  <Input
                    id="csvFile"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                  />
                </div>

                {leadGroups && leadGroups.length > 0 && (
                  <div>
                    <Label htmlFor="group">Assign to Group (Optional)</Label>
                    <Select value={selectedGroupId} onValueChange={(value) => {
                      if (value === "create-new") {
                        setIsCreatingGroup(true);
                      } else {
                        setSelectedGroupId(value);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a group (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No group</SelectItem>
                        {leadGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.group_name}
                          </SelectItem>
                        ))}
                        <SelectItem value="create-new" className="text-primary font-medium">
                          <div className="flex items-center">
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Group
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {csvFile && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{csvFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetForm();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="border border-destructive/50 bg-destructive/10 rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <h4 className="font-semibold text-destructive">Validation Errors</h4>
                </div>
                <div className="space-y-1">
                  {validationErrors.slice(0, 5).map((error, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="text-destructive">
                        Row {error.row}, {error.field}: {error.message}
                      </span>
                    </div>
                  ))}
                  {validationErrors.length > 5 && (
                    <p className="text-sm text-muted-foreground">
                      ... and {validationErrors.length - 5} more errors
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Preview */}
            {showPreview && validationErrors.length === 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <h4 className="font-semibold">Preview ({csvData.length} leads)</h4>
                </div>
                <div className="rounded-md border max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.slice(0, 5).map((lead, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{lead.name}</TableCell>
                          <TableCell>{lead.email}</TableCell>
                          <TableCell>{lead.contact}</TableCell>
                          <TableCell>
                            {lead.description ? (
                              <span className="text-sm text-muted-foreground">
                                {lead.description.length > 30 
                                  ? `${lead.description.substring(0, 30)}...` 
                                  : lead.description
                                }
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {csvData.length > 5 && (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      ... and {csvData.length - 5} more leads
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {showPreview && validationErrors.length === 0 && (
              <Button 
                onClick={handleUpload} 
                disabled={isProcessing}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isProcessing ? "Uploading..." : `Upload ${csvData.length} Leads`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Group Dialog */}
      <Dialog open={isCreatingGroup} onOpenChange={(open) => !open && setIsCreatingGroup(false)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a new group to organize your leads.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newGroupName">Group Name *</Label>
              <Input
                id="newGroupName"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name (e.g., 'Meta Leads', 'Event X Leads')"
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreatingGroup(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateGroup} 
                disabled={createGroup.isPending || !newGroupName.trim()}
              >
                {createGroup.isPending ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}