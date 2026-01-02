import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Download,
  Users,
  X
} from "lucide-react";
import { useBulkCreateLeads, useLeadGroups } from "@/hooks/useSupabaseData";
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

export default function UploadCSVPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVLead[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bulkCreateLeads = useBulkCreateLeads();
  const { data: leadGroups } = useLeadGroups();
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

      // Reset form
      setCsvFile(null);
      setCsvData([]);
      setValidationErrors([]);
      setSelectedGroupId("");
      setShowPreview(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Upload CSV</h1>
          <p className="text-muted-foreground">
            Upload leads from a CSV file
          </p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Upload Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>CSV Format Requirements</CardTitle>
          <CardDescription>
            Your CSV file must follow this format for successful upload
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Required Columns:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>Name</strong> - Lead's full name</li>
                <li>• <strong>Email</strong> - Valid email address</li>
                <li>• <strong>Contact</strong> - Phone number or contact info</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Optional Columns:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>Description</strong> - Additional notes</li>
                <li>• Any other columns will be stored as additional data</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            Select a CSV file to upload leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="group">Assign to Group (Optional)</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
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
                </SelectContent>
              </Select>
            </div>
          )}

          {csvFile && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{csvFile.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCsvFile(null);
                  setCsvData([]);
                  setValidationErrors([]);
                  setShowPreview(false);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Validation Errors
            </CardTitle>
            <CardDescription>
              Please fix these errors before uploading
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {validationErrors.map((error, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-destructive/10 rounded">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm">
                    Row {error.row}, {error.field}: {error.message}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {showPreview && validationErrors.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Preview ({csvData.length} leads)
            </CardTitle>
            <CardDescription>
              Review your data before uploading
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-96 overflow-y-auto">
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
                  {csvData.slice(0, 10).map((lead, index) => (
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
              {csvData.length > 10 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  ... and {csvData.length - 10} more leads
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Button */}
      {showPreview && validationErrors.length === 0 && (
        <div className="flex justify-center">
          <Button 
            onClick={handleUpload} 
            disabled={isProcessing}
            size="lg"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isProcessing ? "Uploading..." : `Upload ${csvData.length} Leads`}
          </Button>
        </div>
      )}
    </div>
  );
}


