import React from 'react';
import DashboardNavbar from '../components/DashboardNavbar';
import DashboardSidebar from '../components/DashboardSidebar';

const Page = () => {
  return (
    <div className="flex h-screen">
      <DashboardSidebar />
      <div className="flex-1">
        <DashboardNavbar />
        <main className="p-6 bg-gray-100 h-full">
          <h1 className="text-2xl font-bold mb-4">Welcome to AI Dashboard</h1>
          <p className="text-gray-700">Here you can manage your AI agents and settings.</p>
        </main>
      </div>
    </div>
  );
};

export default Page;