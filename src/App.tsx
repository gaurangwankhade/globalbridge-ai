import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Compliance from "./pages/Compliance";
import RouteOptimizer from "./pages/RouteOptimizer";
import Matchmaking from "./pages/Matchmaking";
import Documents from "./pages/Documents";
import Tracking from "./pages/Tracking";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedLayout><Index /></ProtectedLayout>} />
            <Route path="/compliance" element={<ProtectedLayout><Compliance /></ProtectedLayout>} />
            <Route path="/route-optimizer" element={<ProtectedLayout><RouteOptimizer /></ProtectedLayout>} />
            <Route path="/matchmaking" element={<ProtectedLayout><Matchmaking /></ProtectedLayout>} />
            <Route path="/documents" element={<ProtectedLayout><Documents /></ProtectedLayout>} />
            <Route path="/tracking" element={<ProtectedLayout><Tracking /></ProtectedLayout>} />
            <Route path="/analytics" element={<ProtectedLayout><Analytics /></ProtectedLayout>} />
            <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
