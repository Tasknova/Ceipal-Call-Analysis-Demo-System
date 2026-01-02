import { useState, useEffect } from "react";
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
import { useUpdateLeadGroup } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import { LeadGroup } from "@/lib/supabase";

interface EditGroupModalProps {
  group: LeadGroup;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditGroupModal({ group, isOpen, onClose }: EditGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const updateGroup = useUpdateLeadGroup();
  const { toast } = useToast();

  useEffect(() => {
    if (group) {
      setGroupName(group.group_name || "");
    }
  }, [group]);

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
      await updateGroup.mutateAsync({
        id: group.id,
        group_name: groupName.trim(),
      });

      toast({
        title: "Success",
        description: "Group updated successfully",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update group",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
          <DialogDescription>
            Update the group name.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateGroup.isPending}>
              {updateGroup.isPending ? "Updating..." : "Update Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


