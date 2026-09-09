import React from 'react';

export const NotificationsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500">History of alerts sent to your devices</p>
      </div>

      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900">No notifications</h3>
        <p className="text-sm text-gray-500">You have no recent notifications.</p>
      </div>
    </div>
  );
};
