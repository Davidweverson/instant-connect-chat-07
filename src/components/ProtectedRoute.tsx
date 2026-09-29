import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { CallProvider } from "@/lib/call-context";



interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <p className="text-2xl font-bold text-destructive mb-2">403</p>
          <p className="text-foreground font-medium">Acesso negado</p>
          <p className="text-muted-foreground text-sm mt-1">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return <CallProvider>{children}</CallProvider>;
}
