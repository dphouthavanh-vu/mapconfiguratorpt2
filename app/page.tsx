import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header with theme toggle */}
      <div className="container mx-auto px-4 pt-4">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Interactive Map Configurator
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Create beautiful, interactive maps with custom zones and content. Perfect for floor plans, blueprints, campus maps, and more.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/create">
              <Button size="lg" className="text-lg px-8 py-6">
                Create Your First Map
              </Button>
            </Link>
            <Link href="/maps">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                View All Maps
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🗺️</span>
                Define Your Canvas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Search for a location on the map or enter coordinates manually to define your working area
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📐</span>
                Upload Blueprints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload floor plans, blueprints, or any image to use as your map background
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📍</span>
                Add Interactive Zones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Click to place zones or enter coordinates manually. Add rich content to each zone.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Define Your Canvas</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Choose your working area by searching for a location or entering coordinates manually
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Upload Your Image</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Upload a blueprint, floor plan, or any image (or skip to use base map imagery)
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Add Interactive Zones</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Click on the canvas or enter coordinates to add points, rectangles, or circles with custom content
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Publish & Share</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Save your map and share the unique URL with anyone. Your map is ready to use!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <Link href="/create">
            <Button size="lg" className="text-lg px-12 py-6">
              Get Started Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
