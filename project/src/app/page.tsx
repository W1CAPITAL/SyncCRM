import { AuthGuard } from "@/components/crm/auth-guard";
import { SheetExplorer } from "@/components/crm/sheet-explorer";

export default function Home() {
  return (
    <AuthGuard>
      <SheetExplorer />
    </AuthGuard>
  );
}