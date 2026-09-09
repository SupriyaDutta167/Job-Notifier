import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const WatchProfilesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Watch Profiles</h1>
          <p className="text-sm text-gray-500">Manage your job search queries and alerts</p>
        </div>
        <Button>Create Profile</Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium text-gray-900">No watch profiles yet</h3>
            <p className="text-sm text-gray-500">Create your first watch profile to start monitoring jobs.</p>
            <Button variant="outline" className="mt-4">Create your first watch profile</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
