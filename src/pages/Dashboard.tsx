import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, MessageCircle, Shield, User, Mail, Hash } from "lucide-react";

export default function Dashboard() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 w-full max-w-lg"
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary border border-border">
            <User className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Username</p>
              <p className="text-foreground font-medium">{profile.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary border border-border">
            <Mail className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-foreground font-medium">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary border border-border">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="text-foreground font-medium capitalize">{profile.role}</p>
            </div>
          </div>

          {profile.friend_code && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary border border-border">
              <Hash className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Friend Code</p>
                <p className="text-foreground font-medium">{profile.friend_code}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => navigate("/")}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            Ir para o Chat
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-accent-foreground font-semibold hover:brightness-110 transition-all"
            >
              <Shield className="w-4 h-4" />
              Admin
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
