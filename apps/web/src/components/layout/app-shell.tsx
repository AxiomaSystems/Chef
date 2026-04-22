import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
  topBarTitle?: string;
  topBarActions?: React.ReactNode;
  showBack?: boolean;
}

export function AppShell({ children, topBarTitle, topBarActions, showBack }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Sidebar />
      <div className="lg:ml-64 flex flex-col min-h-screen">
        <TopBar title={topBarTitle} actions={topBarActions} showBack={showBack} />
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
