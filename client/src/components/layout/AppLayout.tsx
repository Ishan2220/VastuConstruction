import { Outlet } from 'react-router';
import Sidebar from './Sidebar';
import Header from './Header';
import ErrorBoundary from '../common/ErrorBoundary';

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
