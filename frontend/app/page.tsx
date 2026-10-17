import { Suspense } from 'react';
import { HomePageClient } from '@/components/HomePageClient';
import { getPaginatedProperties } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { properties, pagination: initialPagination } = await getPaginatedProperties(1, 10000);

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <HomePageClient
        properties={properties}
        totalProperties={initialPagination.total_properties}
      />
    </Suspense>
  );
}
