import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// ⚡ Bolt Optimization: Lazy load route components to reduce initial bundle size
const Home = lazy(() => import("./pages/Home"));
const Clinician = lazy(() => import("./pages/Clinician"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Fallback loader while lazy components are fetched
const PageLoader = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/clinician"} component={Clinician} />
        {/* Redirect patient portal to clinician dashboard */}
        <Route path={"/patient/:id"} component={() => <Redirect to="/clinician" />} />
        <Route path={"/patient/*"} component={() => <Redirect to="/clinician" />} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      {/* defaultTheme="dark" forces the Accessible Dark Healthcare palette globally */}
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
