import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">Meepo Internet Oddities</h1>
      <p className="text-muted-foreground">
        Next.js scaffold online. Migration in progress.
      </p>
      <Button>Say hi to Meepo</Button>
    </main>
  );
}
