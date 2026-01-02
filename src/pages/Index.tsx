import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import LandingPage from "@/components/LandingPage";
import Dashboard from "@/components/Dashboard";
import ProfilePage from "@/components/ProfilePage";
import BrainPage from "@/components/BrainPage";

type ViewType = 'landing' | 'dashboard' | 'profile' | 'brain';

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialView = searchParams.get('view') as ViewType || 'landing'; // Default to landing page on first launch
  const [currentView, setCurrentView] = useState<ViewType>(initialView);

  // Update URL when view changes, preserving existing params
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentView === 'landing') {
      navigate('/', { replace: true });
    } else {
      // Preserve tab parameter if it exists
      const params = new URLSearchParams();
      params.set('view', currentView);
      if (currentTab) {
        params.set('tab', currentTab);
      }
      navigate(`/?${params.toString()}`, { replace: true });
    }
  }, [currentView, navigate, searchParams]);

  const handleGetStarted = () => {
    setCurrentView('dashboard');
  };

  const handleShowProfile = () => {
    setCurrentView('profile');
  };

  const handleShowBrain = () => {
    setCurrentView('brain');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  // Render based on current view
  switch (currentView) {
    case 'landing':
      return <LandingPage onGetStarted={handleGetStarted} />;
    
    case 'profile':
      return <ProfilePage onBack={handleBackToDashboard} />;
    
    case 'brain':
      return <BrainPage onBack={handleBackToDashboard} />;
    
    case 'dashboard':
      return <Dashboard onShowProfile={handleShowProfile} onShowBrain={handleShowBrain} />;
    
    default:
      return <LandingPage onGetStarted={handleGetStarted} />;
  }
};

export default Index;
