import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageSkeleton } from '@/components/Skeletons';
import { AuthProvider } from '@/context/AuthContext';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SchoolSelectionPage = lazy(() => import('@/pages/SchoolSelectionPage'));
const DashboardView = lazy(() => import('@/components/dashboard/DashboardView'));
const AILearningView = lazy(() => import('@/components/dashboard/views/AILearningView'));
const GeoRiskMapView = lazy(() => import('@/components/dashboard/views/GeoRiskMapView'));
const DigitalTwinView = lazy(() => import('@/components/dashboard/views/DigitalTwinView'));
const DisasterSimulationView = lazy(() => import('@/components/dashboard/views/DisasterSimulationView'));
const GSSView = lazy(() => import('@/components/dashboard/views/GSSView'));
const SchoolResilienceIndexView = lazy(() => import('@/components/dashboard/views/SchoolResilienceIndexView'));
const SurveyAnalyticsView = lazy(() => import('@/components/dashboard/views/SurveyAnalyticsView'));
const ProfileView = lazy(() => import('@/components/dashboard/views/ProfileView'));
const TeacherDashboardView = lazy(() => import('@/components/dashboard/views/TeacherDashboardView'));
const DevDashboardView = lazy(() => import('@/components/dashboard/views/DevDashboardView'));

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/app/*"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <DashboardLayout />
            </Suspense>
          }
        >
          <Route index element={<Suspense fallback={<PageSkeleton />}><DashboardView /></Suspense>} />
          <Route path="ai-learning" element={<Suspense fallback={<PageSkeleton />}><AILearningView /></Suspense>} />
          <Route path="geo-risk-map" element={<Suspense fallback={<PageSkeleton />}><GeoRiskMapView /></Suspense>} />
          <Route path="digital-twin" element={<Suspense fallback={<PageSkeleton />}><DigitalTwinView /></Suspense>} />
          <Route path="simulation" element={<Suspense fallback={<PageSkeleton />}><DisasterSimulationView /></Suspense>} />
          <Route path="gss" element={<Suspense fallback={<PageSkeleton />}><GSSView /></Suspense>} />
          <Route path="resilience" element={<Suspense fallback={<PageSkeleton />}><SchoolResilienceIndexView /></Suspense>} />
          <Route path="survey" element={<Suspense fallback={<PageSkeleton />}><SurveyAnalyticsView /></Suspense>} />
          <Route path="teacher" element={<Suspense fallback={<PageSkeleton />}><TeacherDashboardView /></Suspense>} />
          <Route path="dev-dashboard" element={<Suspense fallback={<PageSkeleton />}><DevDashboardView /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={<PageSkeleton />}><ProfileView /></Suspense>} />
        </Route>
        <Route path="/login" element={<Suspense fallback={<PageSkeleton />}><LoginPage /></Suspense>} />
        <Route path="/school-selection" element={<Suspense fallback={<PageSkeleton />}><SchoolSelectionPage /></Suspense>} />
<Route
          path="/*"
          element={
            <div className="min-h-screen bg-white dark:bg-slate-950">
              <Navbar />
              <main>
                <Suspense fallback={<PageSkeleton />}>
                  <LandingPage />
                </Suspense>
              </main>
              <Footer />
            </div>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
