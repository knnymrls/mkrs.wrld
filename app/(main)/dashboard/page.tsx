import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the page component with suspense
const HomePage = dynamic(() => import('../page'), {
  ssr: true,
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-onsurface-secondary">Loading...</div>
    </div>
  )
});

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-onsurface-secondary">Loading...</div>
      </div>
    }>
      <HomePage />
    </Suspense>
  );
}