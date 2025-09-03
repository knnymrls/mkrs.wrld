import LandingPage from './landing/page';

export default function RootPage() {
  // Middleware handles auth redirect
  // If user reaches here, they're not authenticated
  return <LandingPage />;
}