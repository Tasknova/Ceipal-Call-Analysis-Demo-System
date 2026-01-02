import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import GroupLeadsPage from "@/components/GroupLeadsPage";

const GroupPage = () => {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // If user is not logged in, redirect to home page which will show the landing page
  if (!user) {
    // Just show a loading state briefly; the router will handle redirecting to home
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent-blue mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Please sign in to view this page...</p>
        </div>
      </div>
    );
  }

  // Show the group leads page
  return <GroupLeadsPage />;
};

export default GroupPage;