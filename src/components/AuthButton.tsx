import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";

export function AuthButton() {
  const { user, loading, isAuthenticated, logout } = useAuth();

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
      {user?.avatar_url && (
        <img
          src={user.avatar_url}
          alt={user.display_name}
          className="h-7 w-7 rounded-full"
        />
      )}
      <span className="text-sm font-medium">
        {user?.handle ? `@${user.handle}` : user?.display_name}
      </span>
      <Button variant="ghost" size="sm" onClick={logout}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
