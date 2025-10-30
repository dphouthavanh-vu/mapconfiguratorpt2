'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface MapData {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  createdAt: string;
  zones: any[];
}

export default function MapsPage() {
  const router = useRouter();
  const [maps, setMaps] = useState<MapData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaps();
  }, []);

  const fetchMaps = async () => {
    try {
      const response = await fetch('/api/maps');
      const data = await response.json();

      // Check if the response is an error object
      if (data.error || !Array.isArray(data)) {
        console.error('Error fetching maps:', data.error || 'Invalid response');
        setMaps([]); // Set empty array to prevent map error
      } else {
        setMaps(data);
      }
    } catch (error) {
      console.error('Error fetching maps:', error);
      setMaps([]); // Set empty array to prevent map error
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this map?')) return;

    try {
      await fetch(`/api/maps/${id}`, { method: 'DELETE' });
      fetchMaps(); // Refresh list
    } catch (error) {
      console.error('Error deleting map:', error);
      alert('Failed to delete map');
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/maps/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !currentStatus }),
      });
      fetchMaps(); // Refresh list
    } catch (error) {
      console.error('Error updating map:', error);
      alert('Failed to update map');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-center">Loading maps...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
        <ThemeToggle />
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">My Maps</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage and deploy your interactive maps</p>
        </div>
        <Link href="/create">
          <Button size="lg">Create New Map</Button>
        </Link>
      </div>

      {maps.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">You haven't created any maps yet</p>
            <Link href="/create">
              <Button>Create Your First Map</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {maps.map((map) => (
            <Card key={map.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-1">{map.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {map.description || 'No description'}
                    </CardDescription>
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium ml-2 ${
                      map.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {map.published ? 'Published' : 'Draft'}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-gray-600">{map.zones.length} zones</p>
                <p className="text-xs text-gray-500 mt-1">
                  Created {new Date(map.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <div className="flex gap-2 w-full">
                  <Link href={`/map/${map.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      View
                    </Button>
                  </Link>
                  <Link href={`/maps/${map.id}/edit`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      Edit
                    </Button>
                  </Link>
                </div>
                <Button
                  onClick={() => togglePublish(map.id, map.published)}
                  variant={map.published ? 'secondary' : 'default'}
                  className="w-full"
                >
                  {map.published ? 'Unpublish' : 'Publish'}
                </Button>
                <Button onClick={() => handleDelete(map.id)} variant="destructive" className="w-full">
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
