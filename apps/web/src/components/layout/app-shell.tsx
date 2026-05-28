import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
  topBarTitle?: string;
  topBarActions?: React.ReactNode;
  showBack?: boolean;
  embedded?: boolean;
  hideCreateActions?: boolean;
  hideBottomCreateButton?: boolean;
}

export function AppShell({
  children,
  topBarTitle,
  topBarActions,
  showBack,
  embedded = false,
  hideCreateActions = false,
  hideBottomCreateButton,
}: AppShellProps) {
  const hideBottomActions = hideCreateActions || hideBottomCreateButton;

  if (embedded) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar hideCreateActions={hideCreateActions} />
      <div className="lg:ml-64 flex flex-col min-h-screen">
        <TopBar
          title={topBarTitle}
          actions={topBarActions}
          showBack={showBack}
        />
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      </div>
      <BottomNav hideCreateButton={hideBottomActions} />
    </div>
  );
}
