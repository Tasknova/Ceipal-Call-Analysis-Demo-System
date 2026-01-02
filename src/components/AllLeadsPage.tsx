import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  User,
  MapPin,
  Upload,
  FileSpreadsheet,
  Bell,
  Calendar,
  TrendingUp,
  PhoneCall,
  ExternalLink,
  Flame,
  Snowflake,
  Target,
  CheckCircle2
} from "lucide-react";
import { useLeads, useDeleteLead } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Lead, Recording, Analysis, supabase } from "@/lib/supabase";
import AddLeadModal from "./AddLeadModal";
import EditLeadModal from "./EditLeadModal";
import CSVUploadDialog from "./CSVUploadDialog";

// Helper function to get description for specific leads
const getLeadDescription = (leadName: string, currentDescription?: string): string => {
  const name = leadName.toLowerCase();
  if (name.includes('rajpal') || name.includes('singh')) {
    return 'Interested in premium office space for expanding IT startup, budget-conscious';
  }
  if (name.includes('aarav') || name.includes('varma')) {
    return 'Looking for luxury villa in gated community with modern amenities';
  }
  if (name.includes('jack')) {
    return 'Seeking retail space in high-traffic commercial area for new business';
  }
  return currentDescription || 'Potential property buyer';
};

type LeadStatus = 'all' | 'hot' | 'warm' | 'cold' | 'closing' | 'site_visit' | 'interview' | 'churned';

interface LeadWithStats extends Lead {
  callsMade?: number;
  lastCallQuality?: number;
  nextAction?: string;
  nextActionTime?: string;
  leadStatus?: string;
}

function AllLeadsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<LeadStatus>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvUploadOpen, setIsCsvUploadOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [leadsWithStats, setLeadsWithStats] = useState<LeadWithStats[]>([]);
  
  const { data: leads, isLoading, error } = useLeads();
  const deleteLead = useDeleteLead();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch lead statistics
  useEffect(() => {
    const fetchLeadStats = async () => {
      if (!leads || !user) return;

      const nextActionVariations = [
        { action: 'Follow up call', time: 'Today, 3:00 PM' },
        { action: 'Send property brochure', time: 'Tomorrow, 11:30 AM' },
        { action: 'Schedule site visit', time: 'Dec 23, 2:00 PM' },
        { action: 'Follow up call', time: 'Dec 22, 10:00 AM' },
        { action: 'Send pricing details', time: 'Tomorrow, 4:00 PM' },
        { action: 'Review proposal', time: 'Dec 24, 9:00 AM' },
        { action: 'Follow up call', time: 'Next week Monday' },
        { action: 'Schedule meeting', time: 'Dec 23, 5:00 PM' }
      ];

      const enrichedLeads = await Promise.all(
        leads.map(async (lead, index) => {
          // Fetch recordings for this lead
          const { data: recordings } = await supabase
            .from('recordings')
            .select('id, created_at')
            .eq('lead_id', lead.id)
            .order('created_at', { ascending: false });

          const callsMade = recordings?.length || 0;

          // Fetch latest analysis for last call quality
          let lastCallQuality = null;
          let leadStatus = null;
          if (recordings && recordings.length > 0) {
            const { data: analyses } = await supabase
              .from('analyses')
              .select('sentiments_score, lead_type')
              .eq('recording_id', recordings[0].id)
              .single();
            
            if (analyses) {
              lastCallQuality = analyses.sentiments_score;
              leadStatus = analyses.lead_type;
            }
          }

          // Get varied next action
          const actionVariation = nextActionVariations[index % nextActionVariations.length];

          return {
            ...lead,
            callsMade,
            lastCallQuality,
            leadStatus,
            nextAction: lastCallQuality ? actionVariation.action : null,
            nextActionTime: lastCallQuality ? actionVariation.time : null
          } as LeadWithStats;
        })
      );

      setLeadsWithStats(enrichedLeads);
    };

    fetchLeadStats();
  }, [leads, user]);

  // Filter leads by search and status
  const filteredLeads = leadsWithStats.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (activeFilter === 'all') return true;
    
    const leadType = (lead.lead_type || '').toLowerCase();
    return leadType === activeFilter;
  });

  // Count leads by status
  const statusCounts = {
    all: leadsWithStats.length,
    hot: leadsWithStats.filter(l => (l.lead_type || '').toLowerCase() === 'hot').length,
    warm: leadsWithStats.filter(l => (l.lead_type || '').toLowerCase() === 'warm').length,
    cold: leadsWithStats.filter(l => (l.lead_type || '').toLowerCase() === 'cold').length,
    closing: leadsWithStats.filter(l => (l.lead_type || '').toLowerCase() === 'closing').length,
    site_visit: 0, // Can be enhanced with additional data
    interview: 0,  // Can be enhanced with additional data
    churned: 0     // Can be enhanced with additional data
  };

  const handleDeleteLead = async (lead: Lead) => {
    try {
      await deleteLead.mutateAsync(lead.id);
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });
      setDeletingLead(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete lead",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading leads...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Error loading leads: {error.message}</p>
      </div>
    );
  }

  const getStatusBadge = (leadType?: string) => {
    if (!leadType) return null;
    const type = leadType.toLowerCase();
    if (type === 'hot') return (
      <Badge className="bg-rose-500 text-white flex items-center gap-1">
        <Flame className="h-3 w-3" />
        Hot Lead
      </Badge>
    );
    if (type === 'warm') return (
      <Badge className="bg-amber-500 text-white flex items-center gap-1">
        <Target className="h-3 w-3" />
        Warm Lead
      </Badge>
    );
    if (type === 'cold') return (
      <Badge className="bg-blue-500 text-white flex items-center gap-1">
        <Snowflake className="h-3 w-3" />
        Cold Lead
      </Badge>
    );
    if (type === 'closing') return (
      <Badge className="bg-green-500 text-white flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Closing
      </Badge>
    );
    return null;
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Button 
          variant={activeFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('all')}
          className="rounded-full"
        >
          All ({statusCounts.all})
        </Button>
        <Button 
          variant={activeFilter === 'hot' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('hot')}
          className="rounded-full"
        >
          Hot ({statusCounts.hot})
        </Button>
        <Button 
          variant={activeFilter === 'warm' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('warm')}
          className="rounded-full"
        >
          Warm ({statusCounts.warm})
        </Button>
        <Button 
          variant={activeFilter === 'cold' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('cold')}
          className="rounded-full"
        >
          Cold ({statusCounts.cold})
        </Button>
        <Button 
          variant={activeFilter === 'closing' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('closing')}
          className="rounded-full"
        >
          Closing ({statusCounts.closing})
        </Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setIsCsvUploadOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Upload CSV
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Leads Cards */}
      {filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No leads found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "No leads match your search criteria." : "Get started by adding your first lead."}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Lead
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredLeads.map((lead) => (
            <Card 
              key={lead.id} 
              className="hover:shadow-md transition-shadow duration-200 cursor-pointer"
              onClick={() => navigate(`/lead/${lead.id}`)}
            >
              <CardContent className="p-6">
                {/* Lead Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-slate-900">{lead.name}</h3>
                      {getStatusBadge(lead.lead_type)}
                    </div>
                    {/* Project Name */}
                    {lead.project && (
                      <div className="flex items-center gap-2 mt-2 mb-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {lead.project}
                        </Badge>
                      </div>
                    )}
                    {/* Lead Description */}
                    <div className="flex items-center gap-2 mt-1 text-slate-600">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">{getLeadDescription(lead.name, lead.description)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-600 mb-1">Budget</p>
                    <p className="text-lg font-semibold text-amber-600">Contact for info</p>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <PhoneCall className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Calls Made</p>
                      <p className="text-lg font-semibold text-slate-900">{lead.callsMade || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Last Call Quality</p>
                      <p className={`text-lg font-semibold ${lead.lastCallQuality ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {lead.lastCallQuality ? `${(lead.lastCallQuality / 10).toFixed(1)}/10` : 'Not Contacted'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Next Action</p>
                      <p className={`text-sm font-medium ${lead.nextActionTime ? 'text-blue-600' : 'text-slate-500'}`}>
                        {lead.nextActionTime || 'Not Contacted'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="grid grid-cols-2 gap-4 mb-4 py-3 border-t border-b border-slate-200">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4" />
                    <span>{lead.contact}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4" />
                    <span>{lead.email}</span>
                  </div>
                </div>

                {/* Next Action Plan */}
                {lead.nextAction && (
                  <div className="bg-amber-50 rounded-lg p-3 mb-4">
                    <p className="text-xs font-semibold text-amber-900 mb-1">Next Action Plan</p>
                    <p className="text-sm text-amber-800">{lead.nextAction}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-3" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="default"
                    className="w-full bg-amber-500 hover:bg-amber-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/lead/${lead.id}`);
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `tel:${lead.contact}`;
                    }}
                  >
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Call Now
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full">
                        Update Status
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingLead(lead)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Lead
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeletingLead(lead)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Lead
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Lead Modal */}
      <AddLeadModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />

      {/* Edit Lead Modal */}
      {editingLead && (
        <EditLeadModal 
          lead={editingLead}
          isOpen={!!editingLead} 
          onClose={() => setEditingLead(null)} 
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingLead} onOpenChange={() => setDeletingLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lead</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingLead?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeletingLead(null)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deletingLead && handleDeleteLead(deletingLead)}
              disabled={deleteLead.isPending}
            >
              {deleteLead.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Upload Dialog */}
      <CSVUploadDialog 
        isOpen={isCsvUploadOpen}
        onClose={() => setIsCsvUploadOpen(false)}
      />
    </div>
  );
}

export default AllLeadsPage;
