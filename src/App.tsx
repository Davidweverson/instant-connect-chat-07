import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import { SettingsProvider } from "./lib/settings-context";
import { ParticlesRoot } from "./components/ParticlesBackground";
import WallpaperBackground from "./components/wallpaper/WallpaperBackground";
import { MusicProvider } from "./lib/music/player-context";
import { MiniPlayer } from "./components/music/MiniPlayer";
import { FullPlayer } from "./components/music/FullPlayer";
import { FlashForgeProvider } from "./lib/flashforge/context";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const Settings = lazy(() => import("./pages/Settings"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Groups = lazy(() => import("./pages/Groups"));
const MusicPage = lazy(() => import("./pages/Music"));
const FlashForgePage = lazy(() => import("./pages/FlashForge"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SettingsProvider>
      <FlashForgeProvider>
      <ParticlesRoot>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <WallpaperBackground />
          <MusicProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
              <Route path="/music" element={<ProtectedRoute><MusicPage /></ProtectedRoute>} />
              <Route path="/flashforge" element={<ProtectedRoute><FlashForgePage /></ProtectedRoute>} />
              <Route path="/u/:username" element={<PublicProfile />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="*" element={<NotFound />} />

            </Routes>
          </Suspense>
          <MiniPlayer />
          <FullPlayer />
          </MusicProvider>
        </BrowserRouter>
      </TooltipProvider>
      </ParticlesRoot>
      </FlashForgeProvider>
    </SettingsProvider>
  </QueryClientProvider>
);

export default App;
