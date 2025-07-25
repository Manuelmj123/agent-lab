import React from 'react';
import Link from 'next/link';

const DashboardNavbar = () => {
  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-white font-bold">AI Dashboard</div>
        <div className="space-x-4">
          <Link href="/overview">
            <a className="text-gray-300 hover:text-white">Overview</a>
          </Link>
          <Link href="/agents">
            <a className="text-gray-300 hover:text-white">Agents</a>
          </Link>
          <Link href="/settings">
            <a className="text-gray-300 hover:text-white">Settings</a>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavbar;