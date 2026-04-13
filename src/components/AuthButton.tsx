import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { SettingsDialog } from "@/components/SettingsDialog";

export function AuthButton() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <Button variant="outline" size="sm" asChild>
        <a href="/api/auth/github">
          <LogIn className="h-4 w-4" />
          Sign in with GitHub
        </a>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link to="/my-meeps" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        {user?.avatar_url && (
          <img
            src={user.avatar_url}
            alt={user.display_name}
            className="h-7 w-7 rounded-full"
          />
        )}
        <span className="text-sm font-medium">My Meeps</span>
      </Link>
      <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
        <Settings className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={logout}>
        <LogOut className="h-4 w-4" />
      </Button>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
