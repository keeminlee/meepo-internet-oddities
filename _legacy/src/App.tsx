import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { HandleSetup } from "@/components/HandleSetup";
import Index from "./pages/Index";
import ProjectDetail from "./pages/ProjectDetail";
import MyMeeps from "./pages/MyMeeps";
import CreatorProfile from "./pages/CreatorProfile";
import ReviewQueue from "./pages/ReviewQueue";
import Demo from "./pages/Demo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HandleSetup />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/meep/:slug" element={<ProjectDetail />} />
            <Route path="/u/:handle" element={<CreatorProfile />} />
            <Route path="/my-meeps" element={<MyMeeps />} />
            <Route path="/review" element={<ReviewQueue />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
