import { Suspense } from 'react';
import { InsightsPageClient } from '@/components/InsightsPageClient';
import { getPaginatedProperties, getPriceDistribution, getCrawlHistory } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const { properties } = await getPaginatedProperties(1, 10000);
  const priceDistribution = await getPriceDistribution();
  const crawlHistory = await getCrawlHistory(90);

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <InsightsPageClient
        properties={properties}
        priceDistribution={priceDistribution}
        crawlHistory={crawlHistory}
      />
    </Suspense>
  );
}
