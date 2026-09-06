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
const AILearningView = lazy(() => import('@/components/dashboard/views/LearningViews').then(m => ({ default: m.AILearningView })));
const DisasterQuestionView = lazy(() => import('@/components/dashboard/views/LearningViews').then(m => ({ default: m.DisasterQuestionView })));
const GeoRiskMapView = lazy(() => import('@/components/dashboard/views/SpatialViews').then(m => ({ default: m.GeoRiskMapView })));
const DigitalTwinView = lazy(() => import('@/components/dashboard/views/SpatialViews').then(m => ({ default: m.DigitalTwinView })));
const GSSView = lazy(() => import('@/components/dashboard/views/AnalyticsViews').then(m => ({ default: m.GSSView })));
const SchoolResilienceIndexView = lazy(() => import('@/components/dashboard/views/AnalyticsViews').then(m => ({ default: m.SchoolResilienceIndexView })));
const SurveyAnalyticsView = lazy(() => import('@/components/dashboard/views/AnalyticsViews').then(m => ({ default: m.SurveyAnalyticsView })));
const LeaderboardView = lazy(() => import('@/components/dashboard/views/AnalyticsViews').then(m => ({ default: m.LeaderboardView })));
const ProfileView = lazy(() => import('@/components/dashboard/views/RoleDashboards').then(m => ({ default: m.ProfileView })));
const TeacherDashboardView = lazy(() => import('@/components/dashboard/views/RoleDashboards').then(m => ({ default: m.TeacherDashboardView })));
const DevDashboardView = lazy(() => import('@/components/dashboard/views/RoleDashboards').then(m => ({ default: m.DevDashboardView })));
const StudentDTView = lazy(() => import('@/components/dashboard/views/spatial/digital-twin/student/StudentDTView').then(m => ({ default: m.StudentDTView })));

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
          <Route path="simulation" element={<Suspense fallback={<PageSkeleton />}><DisasterQuestionView /></Suspense>} />
          <Route path="gss" element={<Suspense fallback={<PageSkeleton />}><GSSView /></Suspense>} />
          <Route path="resilience" element={<Suspense fallback={<PageSkeleton />}><SchoolResilienceIndexView /></Suspense>} />
          <Route path="survey" element={<Suspense fallback={<PageSkeleton />}><SurveyAnalyticsView /></Suspense>} />
          <Route path="teacher" element={<Suspense fallback={<PageSkeleton />}><TeacherDashboardView /></Suspense>} />
          <Route path="student-game" element={<Suspense fallback={<PageSkeleton />}><StudentDTView /></Suspense>} />
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
