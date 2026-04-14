import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export default function MyMeeps() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">Sign in to see your meeps.</p>
        <Button asChild>
          <a href="/api/auth/github">
            <LogIn className="h-4 w-4" />
            Sign in with GitHub
          </a>
        </Button>
      </div>
    );
  }

  if (!user?.handle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Set your handle to continue.</p>
      </div>
    );
  }

  return <Navigate to={`/u/${user.handle}`} replace />;
}
