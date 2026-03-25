import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import IndicationsTab from './market/IndicationsTab';
import PricesTab from './market/PricesTab';
import TurkishExchangesTab from './market/TurkishExchangesTab';
import TMOTendersTab from './market/TMOTendersTab';
import CoasterFreightsTab from './market/CoasterFreightsTab';
import TelegramSidebar from './market/TelegramSidebar';

export default function MarketDataPage() {
  const [activeTab, setActiveTab] = useState('news');

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]" data-testid="market-data-page">
      {/* Main Content */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Market Data</h1>
            <p className="text-muted-foreground">Live commodity prices, notes, and tender tracking</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="news" data-testid="tab-indications">Indications</TabsTrigger>
            <TabsTrigger value="prices" data-testid="tab-prices">Prices</TabsTrigger>
            <TabsTrigger value="turkish" data-testid="tab-turkish">Turkish Exchanges</TabsTrigger>
            <TabsTrigger value="tenders" data-testid="tab-tenders">TMO Tenders</TabsTrigger>
            <TabsTrigger value="freights" data-testid="tab-freights">Coaster Freights</TabsTrigger>
          </TabsList>

          <TabsContent value="news">
            <IndicationsTab />
          </TabsContent>

          <TabsContent value="prices">
            <PricesTab />
          </TabsContent>

          <TabsContent value="turkish">
            <TurkishExchangesTab />
          </TabsContent>

          <TabsContent value="tenders">
            <TMOTendersTab />
          </TabsContent>

          <TabsContent value="freights">
            <CoasterFreightsTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Telegram Sidebar */}
      <div className="w-80 border-l pl-4 hidden lg:block">
        <TelegramSidebar />
      </div>
    </div>
  );
}
