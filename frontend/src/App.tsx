import { LanguageProvider } from '@/i18n/LanguageContext';
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { clerkAuthService } from '@/services/firebase/clerkAuthService';
import { ClerkProfile } from '@/types';
import { ClerkLayout } from '@/components/layout/ClerkLayout';
import { ClerkLogin } from '@/pages/ClerkLogin';
import { DashboardHome } from '@/pages/DashboardHome';
import { ReviewQueue } from '@/pages/ReviewQueue';
import { AmbiguousCases } from '@/pages/AmbiguousCases';
import { ClarificationQueue } from '@/pages/ClarificationQueue';
import { ReviewWorkspace } from '@/pages/ReviewWorkspace';
import { MyReviews } from '@/pages/MyReviews';
import { ApprovedRouted } from '@/pages/ApprovedRouted';
import { SearchApplications } from '@/pages/SearchApplications';
import { AuditLog } from '@/pages/AuditLog';
import { ClerkProfileView } from '@/pages/ClerkProfile';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [clerk, setClerk] = useState<ClerkProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = clerkAuthService.onAuthStateChanged((profile) => {
      setClerk(profile);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white font-sans">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 animate-pulse">
          <ShieldAlert className="w-7 h-7 text-white" />
        </div>
        <div className="text-base font-bold tracking-tight">RTI Sathi Routing Terminal</div>
        <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
          <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
          <span>Verifying officer credentials against Cloud Firestore...</span>
        </div>
      </div>
    );
  }

  return (
    <LanguageProvider>
      <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={!clerk ? <ClerkLogin /> : <Navigate to="/" replace />}
        />

        {/* Authenticated Clerk Routes */}
        <Route
          path="/"
          element={clerk ? <ClerkLayout clerk={clerk} /> : <Navigate to="/login" replace />}
        >
          <Route index element={<DashboardHome clerk={clerk!} />} />
          <Route path="queue" element={<ReviewQueue clerk={clerk!} />} />
          <Route path="ambiguous" element={<AmbiguousCases clerk={clerk!} />} />
          <Route path="clarifications" element={<ClarificationQueue clerk={clerk!} />} />
          <Route path="review/:id" element={<ReviewWorkspace clerk={clerk!} />} />
          <Route path="my-reviews" element={<MyReviews clerk={clerk!} />} />
          <Route path="approved" element={<ApprovedRouted clerk={clerk!} />} />
          <Route path="search" element={<SearchApplications clerk={clerk!} />} />
          <Route path="audit" element={<AuditLog clerk={clerk!} />} />
          <Route path="profile" element={<ClerkProfileView clerk={clerk!} />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;
