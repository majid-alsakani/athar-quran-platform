import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Portal from "./pages/Portal";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path="/dashboard" component={Portal} />
      <Route path="/circles" component={Portal} />
      <Route path="/students" component={Portal} />
      <Route path="/progress" component={Portal} />
      <Route path="/attendance" component={Portal} />
      <Route path="/reports" component={Portal} />
      <Route path="/tasks" component={Portal} />
      <Route path="/notifications" component={Portal} />
      <Route path="/messages" component={Portal} />
      <Route path="/schedule" component={Portal} />
      <Route path="/points" component={Portal} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-center" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
