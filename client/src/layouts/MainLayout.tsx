import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-300">
      <Header />
      <main className="pt-16 min-h-[calc(100vh-16rem)]">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}