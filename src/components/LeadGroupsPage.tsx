import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  FolderOpen, 
  Users,
  Eye
} from "lucide-react";
import { useLeadGroups, useDeleteLeadGroup, useLeads } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import { LeadGroup } from "@/lib/supabase";
import AddGroupModal from "./AddGroupModal";
import EditGroupModal from "./EditGroupModal";

export default function LeadGroupsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LeadGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<LeadGroup | null>(null);
  const [viewingGroup, setViewingGroup] = useState<LeadGroup | null>(null);
  
  const navigate = useNavigate();
  const { data: leadGroups, isLoading, error } = useLeadGroups();
  const { data: allLeads } = useLeads();
  const deleteGroup = useDeleteLeadGroup();
  const { toast } = useToast();

  const filteredGroups = leadGroups?.filter(group => 
    group.group_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getLeadsInGroup = (groupId: string) => {
    return allLeads?.filter(lead => lead.group_id === groupId) || [];
  };

  const handleDeleteGroup = async (group: LeadGroup) => {
    try {
      await deleteGroup.mutateAsync(group.id);
      toast({
        title: "Success",
        description: "Group deleted successfully",
      });
      setDeletingGroup(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading groups...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Error loading groups: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Lead Groups</h1>
          <p className="text-slate-600 mt-1">
            Organize your leads into groups for better management
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Total Groups</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <FolderOpen className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{leadGroups?.length || 0}</div>
            <p className="text-xs text-slate-600">
              Groups created
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Total Leads</CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{allLeads?.length || 0}</div>
            <p className="text-xs text-slate-600">
              Leads across all groups
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Avg Leads/Group</CardTitle>
            <div className="p-2 bg-amber-100 rounded-lg">
              <Users className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {leadGroups?.length ? Math.round((allLeads?.length || 0) / leadGroups.length) : 0}
            </div>
            <p className="text-xs text-slate-600">
              Average leads per group
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Groups List */}
      <Card className="shadow-md">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-slate-900">Groups</CardTitle>
          <CardDescription className="text-slate-600">
            Manage your lead groups
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-lg border border-slate-200">
              <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <FolderOpen className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No groups found</h3>
              <p className="text-slate-600 mb-6 max-w-sm mx-auto">
                {searchTerm ? "No groups match your search criteria. Try adjusting your search." : "Create your first group to organize your leads."}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsAddModalOpen(true)} className="shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Group
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-700">Group Name</TableHead>
                    <TableHead className="font-semibold text-slate-700">Leads Count</TableHead>
                    <TableHead className="font-semibold text-slate-700">Created</TableHead>
                    <TableHead className="w-[50px] font-semibold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map((group) => {
                    const leadsInGroup = getLeadsInGroup(group.id);
                    return (
                      <TableRow key={group.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium">
                          <div 
                            className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => navigate(`/group/${group.id}`)}
                          >
                            <FolderOpen className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-900">{group.group_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className="cursor-pointer hover:bg-blue-50 transition-colors bg-blue-50 text-blue-700 border-blue-200 font-medium"
                            onClick={() => navigate(`/group/${group.id}`)}
                          >
                            {leadsInGroup.length} leads
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">
                          {new Date(group.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/group/${group.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Leads
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditingGroup(group)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeletingGroup(group)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Group Modal */}
      <AddGroupModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />

      {/* Edit Group Modal */}
      {editingGroup && (
        <EditGroupModal 
          group={editingGroup}
          isOpen={!!editingGroup} 
          onClose={() => setEditingGroup(null)} 
        />
      )}

      {/* View Group Leads Modal */}
      {viewingGroup && (
        <Dialog open={!!viewingGroup} onOpenChange={() => setViewingGroup(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Leads in "{viewingGroup.group_name}"</DialogTitle>
              <DialogDescription>
                View all leads in this group
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {getLeadsInGroup(viewingGroup.id).length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No leads in this group yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {getLeadsInGroup(viewingGroup.id).map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">{lead.email}</p>
                      </div>
                      <Badge variant="outline">{lead.contact}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setViewingGroup(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingGroup} onOpenChange={() => setDeletingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingGroup?.group_name}"? 
              This will remove the group but keep all leads (they will become ungrouped).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeletingGroup(null)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deletingGroup && handleDeleteGroup(deletingGroup)}
              disabled={deleteGroup.isPending}
            >
              {deleteGroup.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


