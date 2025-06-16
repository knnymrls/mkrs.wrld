import Navbar from '../components/layout/Navbar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Navbar />
      <main className="flex-1 ml-16 overflow-auto">{children}</main>
    </div>
  );
}