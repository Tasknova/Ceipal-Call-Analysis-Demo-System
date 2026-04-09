import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BarChart3, PhoneCall, ShieldCheck, Sparkles } from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-amber-50">
      <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <img src="/Bharat-Petroleum-logo.png" alt="Bharat Petroleum" className="h-11 w-auto" />
          <Button onClick={onGetStarted} className="bg-primary text-primary-foreground hover:bg-primary-hover">
            Enter Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <p className="inline-flex items-center rounded-full bg-accent-blue-light px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Bharat Petroleum Intelligence Suite
            </p>
            <h1 className="text-4xl font-bold leading-tight text-primary sm:text-5xl">
              Unified Call Analysis
              <br />
              for Operations Teams
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Monitor call quality, uncover trends, and generate leadership-ready reports from one platform.
              Built for high-volume review workflows with AI-assisted insights.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={onGetStarted} className="bg-primary text-primary-foreground hover:bg-primary-hover">
                Open Calls Workspace
              </Button>
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-accent-blue-light">
                Learn More
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm font-semibold text-primary">Daily Operations Snapshot</p>
              <img src="/Bharat-Petroleum-Logo-2.png" alt="BP mark" className="h-8 w-auto" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-border bg-blue-50/70">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Processed Calls</p>
                  <p className="mt-1 text-2xl font-bold text-primary">1,248</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-amber-50/90">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Positive Sentiment</p>
                  <p className="mt-1 text-2xl font-bold text-primary">82%</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-white">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Avg Engagement</p>
                  <p className="mt-1 text-2xl font-bold text-primary">77%</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-white">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Reports Generated</p>
                  <p className="mt-1 text-2xl font-bold text-primary">34</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="border-border bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-primary">
                <PhoneCall className="h-5 w-5 text-primary" />
                Calls Workspace
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Centralized call queue with quick status checks, playback, and analysis access.
            </CardContent>
          </Card>

          <Card className="border-border bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-primary">
                <BarChart3 className="h-5 w-5 text-primary" />
                Reporting Layer
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Compare sentiment, engagement, and objection trends with export-ready visual summaries.
            </CardContent>
          </Card>

          <Card className="border-border bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-primary">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Governance Ready
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Structured audit trail and standardized scorecards for quality and compliance review.
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border bg-white px-6 py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/Bharat-Petroleum-logo.png" alt="Bharat Petroleum" className="h-9 w-auto" />
            <p className="text-xs text-muted-foreground">Call Intelligence Platform</p>
          </div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent-blue" />
            Powered for operations excellence
          </p>
        </div>
      </footer>
    </div>
  );
}
