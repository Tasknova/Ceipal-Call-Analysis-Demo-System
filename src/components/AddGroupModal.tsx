import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateLeadGroup } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddGroupModal({ isOpen, onClose }: AddGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const createGroup = useCreateLeadGroup();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createGroup.mutateAsync({
        group_name: groupName.trim(),
      });

      toast({
        title: "Success",
        description: "Group created successfully",
      });

      setGroupName("");
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setGroupName("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Create a new group to organize your leads.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name (e.g., 'Meta Leads', 'Event X Leads')"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createGroup.isPending}>
              {createGroup.isPending ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


