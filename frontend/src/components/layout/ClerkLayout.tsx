import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { ClerkProfile } from '@/types';
import { clerkAuthService } from '@/services/firebase/clerkAuthService';
import { clerkApplicationService } from '@/services/firebase/clerkApplicationService';
import { seedTestApplicationsIntoFirestore } from '@/services/firebase/seedService';
import { TopNavbar } from './TopNavbar';
import { Sidebar } from './Sidebar';

interface ClerkLayoutProps {
  clerk: ClerkProfile;
}

export const ClerkLayout: React.FC<ClerkLayoutProps> = ({ clerk }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    ambiguous: 0,
    clarification: 0,
  });
  const [seedNotice, setSeedNotice] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen to queue for badge counts
    const unsubscribe = clerkApplicationService.subscribeToQueue((apps) => {
      let pending = 0;
      let ambiguous = 0;
      let clarification = 0;

      apps.forEach((a) => {
        if (['submitted', 'human_review_required', 'under_clerk_review', 'resubmitted'].includes(a.status)) {
          pending++;
        }
        if (a.humanReviewRequired || a.ambiguity) {
          ambiguous++;
        }
        if (a.status === 'clarification_required') {
          clarification++;
        }
      });

      setStats({ pending, ambiguous, clarification });
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await clerkAuthService.logout();
      navigate('/login');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const handleSeedData = async () => {
    try {
      setSeedNotice('Seeding real test records into live Cloud Firestore...');
      const ids = await seedTestApplicationsIntoFirestore();
      setSeedNotice(`Success: Inserted 3 test applications into Firestore (${ids.join(', ')}). Queue refreshed!`);
      setTimeout(() => setSeedNotice(null), 6000);
    } catch (err: any) {
      setSeedNotice(`Seed error: ${err.message}`);
      setTimeout(() => setSeedNotice(null), 6000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <TopNavbar
        clerk={clerk}
        onLogout={handleLogout}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onSeedData={handleSeedData}
      />

      {seedNotice && (
        <div className="bg-amber-500 text-white text-xs py-2 px-4 text-center font-medium shadow-sm flex items-center justify-center gap-2 sticky top-16 z-30">
          <span>{seedNotice}</span>
          <button
            onClick={() => setSeedNotice(null)}
            className="text-white hover:text-amber-100 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex-1 flex">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          pendingCount={stats.pending}
          ambiguousCount={stats.ambiguous}
          clarificationCount={stats.clarification}
        />

        <main className="flex-1 md:ml-64 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
