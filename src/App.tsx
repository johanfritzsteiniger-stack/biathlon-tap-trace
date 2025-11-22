import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ProfilesIndex from "./pages/ProfilesIndex";
import Training from "./pages/Training";
import Archive from "./pages/Archive";
import AthleteDashboard from "./pages/AthleteDashboard";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();
const App = () => <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Home />} className="bg-accent text-accent" />
            <Route path="/training" element={<Training />} />
            <Route path="/training/:sessionId" element={<Training />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/profiles" element={<ProfilesIndex />} />
            <Route path="/profiles/:athleteId" element={<Training />} />
            <Route path="/athlete-dashboard" element={<AthleteDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>;
export default App;