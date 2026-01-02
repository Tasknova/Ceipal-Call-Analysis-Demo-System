import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateLead, useLeadGroups } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/lib/supabase";

interface EditLeadModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditLeadModal({ lead, isOpen, onClose }: EditLeadModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact: "",
    description: "",
    group_id: "none",
  });

  const updateLead = useUpdateLead();
  const { data: leadGroups } = useLeadGroups();
  const { toast } = useToast();

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || "",
        email: lead.email || "",
        contact: lead.contact || "",
        description: lead.description || "",
        group_id: lead.group_id || "none",
      });
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.contact.trim()) {
      toast({
        title: "Error",
        description: "Name, email, and contact are required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateLead.mutateAsync({
        id: lead.id,
        name: formData.name.trim(),
        email: formData.email.trim(),
        contact: formData.contact.trim(),
        description: formData.description.trim() || undefined,
        group_id: formData.group_id !== "none" ? formData.group_id : undefined,
      });

      toast({
        title: "Success",
        description: "Lead updated successfully",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update lead",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
          <DialogDescription>
            Update the lead information. Name, email, and contact are required.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter lead's name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter lead's email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact *</Label>
            <Input
              id="contact"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              placeholder="Enter phone number or contact info"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter additional notes about this lead"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group">Group</Label>
            <Select
              value={formData.group_id}
              onValueChange={(value) => setFormData({ ...formData, group_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a group (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No group</SelectItem>
                {leadGroups?.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.group_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateLead.isPending}>
              {updateLead.isPending ? "Updating..." : "Update Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


