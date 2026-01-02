import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, ArrowLeft, Check, Building, User, Briefcase, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingFlowProps {
  onComplete: () => void;
}

interface FormData {
  company_name: string;
  company_email: string;
  company_industry: string;
  position: string;
  use_cases: string[];
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    company_name: '',
    company_email: '',
    company_industry: '',
    position: '',
    use_cases: [],
  });

  // Check for existing profile data on component mount
  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching existing profile:', error);
          setInitialLoading(false);
          return;
        }

        if (data) {
          // Check if user has a complete profile
          const hasCompleteProfile = data.onboarding_completed || 
            (data.full_name && data.company_name && data.position);

          if (hasCompleteProfile) {
            // User already has a complete profile, skip onboarding
            toast({
              title: 'Welcome back!',
              description: 'Your profile is already set up.',
            });
            onComplete();
            return;
          }

          // Pre-populate form with existing data
          setFormData({
            company_name: data.company_name || '',
            company_email: data.company_email || '',
            company_industry: data.company_industry || '',
            position: data.position || '',
            use_cases: data.use_cases || [],
          });
        }
      } catch (error) {
        console.error('Error checking existing profile:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    checkExistingProfile();
  }, [user, onComplete, toast]);

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

  const steps = [
    {
      id: 'company-info',
      title: 'Company Information',
      description: 'Tell us about your company',
      icon: Building,
    },
    {
      id: 'personal-info',
      title: 'Your Role',
      description: 'What\'s your position in the company?',
      icon: User,
    },
    {
      id: 'use-cases',
      title: 'How will you use our platform?',
      description: 'Select all that apply to customize your experience',
      icon: Target,
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
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

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const profileData = {
        user_id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url,
        company_name: formData.company_name,
        company_email: formData.company_email,
        company_industry: formData.company_industry,
        position: formData.position,
        use_cases: formData.use_cases,
        onboarding_completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData);

      if (error) {
        throw error;
      }

      toast({
        title: 'Welcome to Tasknova!',
        description: 'Your profile has been set up successfully.',
      });

      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete setup. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Create a minimal profile to mark onboarding as completed
      const profileData = {
        user_id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url,
        onboarding_completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData);

      if (error) {
        throw error;
      }

      toast({
        title: 'Welcome to Tasknova!',
        description: 'You can complete your profile later from the settings.',
      });

      onComplete();
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      toast({
        title: 'Error',
        description: 'Failed to skip setup. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.company_name.trim() && formData.company_email.trim() && formData.company_industry;
      case 1:
        return formData.position.trim();
      case 2:
        return formData.use_cases.length > 0;
      default:
        return false;
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  // Show loading spinner while checking for existing profile
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Welcome to Tasknova!</h1>
            <span className="text-sm text-gray-600">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  index <= currentStep 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  {index < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 transition-colors duration-300 ${
                    index < currentStep ? 'bg-blue-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl">{steps[currentStep].title}</CardTitle>
            <CardDescription className="text-base">
              {steps[currentStep].description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-96 overflow-hidden">
              <AnimatePresence mode="wait" custom={1}>
                <motion.div
                  key={currentStep}
                  custom={1}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                  }}
                  className="absolute inset-0 flex flex-col justify-center"
                >
                  {/* Step 1: Company Information */}
                  {currentStep === 0 && (
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="company_name" className="text-base font-medium">
                          Company Name *
                        </Label>
                        <Input
                          id="company_name"
                          value={formData.company_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                          placeholder="Enter your company name"
                          className="mt-2 h-12 text-base"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company_email" className="text-base font-medium">
                          Company Email *
                        </Label>
                        <Input
                          id="company_email"
                          type="email"
                          value={formData.company_email}
                          onChange={(e) => setFormData(prev => ({ ...prev, company_email: e.target.value }))}
                          placeholder="Enter your company email"
                          className="mt-2 h-12 text-base"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company_industry" className="text-base font-medium">
                          Industry *
                        </Label>
                        <Select
                          value={formData.company_industry}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, company_industry: value }))}
                        >
                          <SelectTrigger className="mt-2 h-12 text-base">
                            <SelectValue placeholder="Select your industry" />
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
                    </div>
                  )}

                  {/* Step 2: Personal Information */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <User className="h-8 w-8 text-blue-500" />
                        </div>
                        <p className="text-gray-600">
                          Help us understand your role so we can customize your experience
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="position" className="text-base font-medium">
                          Your Position in the Company *
                        </Label>
                        <Select
                          value={formData.position}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, position: value }))}
                        >
                          <SelectTrigger className="mt-2 h-12 text-base">
                            <SelectValue placeholder="Select your position in the company" />
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
                  )}

                  {/* Step 3: Use Cases */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Target className="h-8 w-8 text-purple-500" />
                        </div>
                        <p className="text-gray-600">
                          Select all use cases that apply to help us tailor your dashboard
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto">
                        {useCases.map((useCase) => (
                          <motion.div
                            key={useCase}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                              formData.use_cases.includes(useCase)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                            }`}
                            onClick={() => handleUseCaseToggle(useCase)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                formData.use_cases.includes(useCase)
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-gray-300'
                              }`}>
                                {formData.use_cases.includes(useCase) && (
                                  <Check className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <span className="font-medium text-gray-900">{useCase}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 text-center">
                        Selected: {formData.use_cases.length} use case{formData.use_cases.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={loading}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Skip for now
                </Button>
              </div>
              
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={!canProceed() || loading}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Complete Setup
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
