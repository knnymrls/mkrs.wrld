import Navbar from '../components/layout/Navbar';
import MobileNavbar from '../components/layout/MobileNavbar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Main Content Area */}
      <div className="flex h-screen">
        {/* Desktop Navbar */}
        <Navbar />
        
        {/* Main Content - Adjust padding for mobile bottom nav */}
        <main className="flex-1 md:ml-16 overflow-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileNavbar />
    </>
  );
}