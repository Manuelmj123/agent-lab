import React from 'react';
import Link from 'next/link';

const DashboardSidebar = () => {
  return (
    <aside className="bg-gray-700 w-64 p-6">
      <ul>
        <li className="mb-4">
          <Link href="/overview">
            <a className="text-gray-300 hover:text-white">Overview</a>
          </Link>
        </li>
        <li className="mb-4">
          <Link href="/agents">
            <a className="text-gray-300 hover:text-white">Agents</a>
          </Link>
        </li>
        <li>
          <Link href="/settings">
            <a className="text-gray-300 hover:text-white">Settings</a>
          </Link>
        </li>
      </ul>
    </aside>
  );
};

export default DashboardSidebar;