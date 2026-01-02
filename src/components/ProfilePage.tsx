import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, UserProfile } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit2, Save, X, User, Building, Mail, Briefcase } from 'lucide-react';

interface ProfilePageProps {
  onBack: () => void;
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    company_email: '',
    company_industry: '',
    position: '',
    use_cases: [] as string[],
  });

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Retail',
    'Manufacturing',
    'Real Estate',
    'Consulting',
    'Marketing',
    'Other'
  ];

  const positions = [
    'CEO / Founder',
    'CTO / Chief Technology Officer',
    'COO / Chief Operating Officer',
    'VP of Sales',
    'VP of Marketing', 
    'VP of Operations',
    'Sales Manager',
    'Sales Director',
    'Marketing Manager',
    'Marketing Director',
    'HR Manager',
    'HR Director',
    'Operations Manager',
    'Operations Director',
    'Business Development Manager',
    'Business Development Director',
    'Customer Success Manager',
    'Account Manager',
    'Project Manager',
    'Product Manager',
    'Team Lead',
    'Senior Manager',
    'Manager',
    'Coordinator',
    'Specialist',
    'Analyst',
    'Consultant',
    'Other'
  ];

  const useCases = [
    'Sales Call Analysis',
    'Recruitment Call Analysis', 
    'Customer Support Call Analysis',
    'Training & Quality Assurance',
    'Market Research',
    'Client Consultation Analysis',
    'Team Performance Review',
    'Compliance Monitoring'
  ];

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          company_name: data.company_name || '',
          company_email: data.company_email || '',
          company_industry: data.company_industry || '',
          position: data.position || '',
          use_cases: data.use_cases || [],
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const profileData = {
        user_id: user.id,
        email: user.email!,
        full_name: formData.full_name,
        avatar_url: user.user_metadata?.avatar_url,
        company_name: formData.company_name,
        company_email: formData.company_email,
        company_industry: formData.company_industry,
        position: formData.position,
        use_cases: formData.use_cases,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData);

      if (error) {
        throw error;
      }

      setProfile({ ...profileData, id: profile?.id || '', created_at: profile?.created_at || new Date().toISOString() });
      setEditing(false);
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUseCaseToggle = (useCase: string) => {
    setFormData(prev => ({
      ...prev,
      use_cases: prev.use_cases.includes(useCase)
        ? prev.use_cases.filter(uc => uc !== useCase)
        : [...prev.use_cases, useCase]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold">Profile</h1>
          </div>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarImage 
                    src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture} 
                    alt="Profile picture"
                    className="object-cover"
                  />
                  <AvatarFallback className="text-lg">
                    {user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('') || 
                     user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl">
                  {profile?.full_name || user?.user_metadata?.full_name || 'User'}
                </CardTitle>
                <CardDescription>{user?.email}</CardDescription>
                {profile?.company_name && (
                  <Badge variant="secondary" className="mt-2">
                    {profile.company_name}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{profile?.position || 'Position not set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{profile?.company_industry || 'Industry not set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{profile?.company_email || 'Company email not set'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Use Cases */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Use Cases</CardTitle>
                <CardDescription>What you use our platform for</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile?.use_cases?.length ? (
                    profile.use_cases.map((useCase) => (
                      <Badge key={useCase} variant="outline">
                        {useCase}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No use cases selected</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Manage your personal and company information
                  </CardDescription>
                </div>
                {!editing ? (
                  <Button onClick={() => setEditing(true)} size="sm">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setEditing(false)} 
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                        disabled={!editing}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>

                {/* Company Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Company Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="company_name">Company Name</Label>
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                        disabled={!editing}
                        placeholder="Enter company name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="company_email">Company Email</Label>
                      <Input
                        id="company_email"
                        type="email"
                        value={formData.company_email}
                        onChange={(e) => setFormData(prev => ({ ...prev, company_email: e.target.value }))}
                        disabled={!editing}
                        placeholder="Enter company email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="company_industry">Industry</Label>
                      <Select
                        value={formData.company_industry}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, company_industry: value }))}
                        disabled={!editing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {industries.map((industry) => (
                            <SelectItem key={industry} value={industry}>
                              {industry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="position">Your Position</Label>
                      <Select
                        value={formData.position}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, position: value }))}
                        disabled={!editing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your position" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {positions.map((position) => (
                            <SelectItem key={position} value={position}>
                              {position}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Use Cases */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Use Cases
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select what you plan to use our platform for (multiple selections allowed)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {useCases.map((useCase) => (
                      <div
                        key={useCase}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          formData.use_cases.includes(useCase)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        } ${!editing ? 'cursor-not-allowed opacity-60' : ''}`}
                        onClick={() => editing && handleUseCaseToggle(useCase)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            formData.use_cases.includes(useCase)
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                          }`}>
                            {formData.use_cases.includes(useCase) && (
                              <div className="w-2 h-2 bg-white rounded-sm"></div>
                            )}
                          </div>
                          <span className="text-sm font-medium">{useCase}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
