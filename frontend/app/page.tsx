/**
 * Main Page Component (Server Component)
 * Displays paginated property list and price distribution chart
 * Uses static generation with client-side pagination for static export compatibility
 */

import { getPaginatedProperties, getPriceDistribution } from '@/lib/db';
import { ClientPropertyList } from '@/components/ClientPropertyList';
import { PriceChart } from '@/components/PriceChart';

export default async function HomePage() {
  // Fetch all data at build time for static export
  // Get all properties (up to a reasonable limit for static export)
  const { properties, pagination: initialPagination } = await getPaginatedProperties(1, 1000);
  const priceDistribution = await getPriceDistribution();
  
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Property Tracker
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track and analyze property listings
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm text-muted-foreground">
                Total Properties
              </p>
              <p className="text-2xl font-bold text-primary">
                {initialPagination.total_properties.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Price Chart - Full width on mobile, 1/3 on desktop */}
          <div className="lg:col-span-3 xl:col-span-1 order-first xl:order-last">
            <PriceChart distribution={priceDistribution} />
          </div>

          {/* Property List - Full width on mobile, 2/3 on desktop */}
          <div className="lg:col-span-3 xl:col-span-2">
            <ClientPropertyList properties={properties} pageSize={20} />
          </div>
        </div>
      </div>
    </main>
  );
}
