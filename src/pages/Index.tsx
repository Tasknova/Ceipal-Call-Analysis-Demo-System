import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import LandingPage from "@/components/LandingPage";
import Dashboard from "@/components/Dashboard";

type ViewType = "landing" | "dashboard";

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialView = (searchParams.get("view") as ViewType) || "landing";
  const [currentView, setCurrentView] = useState<ViewType>(initialView);

  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentView === "landing") {
      navigate("/", { replace: true });
      return;
    }

    const params = new URLSearchParams();
    params.set("view", currentView);
    if (currentTab) {
      params.set("tab", currentTab);
    }
    navigate(`/?${params.toString()}`, { replace: true });
  }, [currentView, navigate, searchParams]);

  if (currentView === "dashboard") {
    return <Dashboard />;
  }

  return <LandingPage onGetStarted={() => setCurrentView("dashboard")} />;
};

export default Index;
