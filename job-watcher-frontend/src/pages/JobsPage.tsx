import React from 'react';

export const JobsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Jobs</h1>
        <p className="text-sm text-gray-500">Browse all matched jobs from your profiles</p>
      </div>

      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900">No jobs found</h3>
        <p className="text-sm text-gray-500">Jobs will appear here once your watch profiles match new listings.</p>
      </div>
    </div>
  );
};
