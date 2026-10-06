import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Globe, DollarSign, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AnalyticsData {
  totalShipments: number;
  shipmentsPerMonth: { month: string; count: number }[];
  transportModes: { mode: string; count: number }[];
  destinations: { destination: string; count: number }[];
  complianceStats: { passed: number; needsReview: number; failed: number };
}

const Analytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;

      try {
        // Fetch shipments
        const { data: shipments, error: shipmentsError } = await supabase
          .from('shipments')
          .select('*')
          .eq('user_id', user.id);

        if (shipmentsError) throw shipmentsError;

        // Fetch compliance checks
        const { data: complianceChecks, error: complianceError } = await supabase
          .from('compliance_checks')
          .select('*')
          .eq('user_id', user.id);

        if (complianceError) throw complianceError;

        // Process shipments by month
        const monthCounts: Record<string, number> = {};
        const modeCounts: Record<string, number> = {};
        const destCounts: Record<string, number> = {};

        shipments?.forEach((shipment) => {
          const date = new Date(shipment.created_at);
          const monthKey = date.toLocaleString('default', { month: 'short' });
          monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
          
          modeCounts[shipment.transport_mode] = (modeCounts[shipment.transport_mode] || 0) + 1;
          destCounts[shipment.destination] = (destCounts[shipment.destination] || 0) + 1;
        });

        // Process compliance stats
        let passed = 0, needsReview = 0, failed = 0;
        complianceChecks?.forEach((check) => {
          const redFlags = check.red_flags as any[] || [];
          const missingDocs = check.missing_docs as any[] || [];
          
          if (redFlags.length === 0 && missingDocs.length === 0) {
            passed++;
          } else if (redFlags.length > 2 || missingDocs.length > 2) {
            failed++;
          } else {
            needsReview++;
          }
        });

        const total = passed + needsReview + failed || 1;

        setData({
          totalShipments: shipments?.length || 0,
          shipmentsPerMonth: Object.entries(monthCounts).map(([month, count]) => ({ month, count })),
          transportModes: Object.entries(modeCounts).map(([mode, count]) => ({ mode, count })),
          destinations: Object.entries(destCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([destination, count]) => ({ destination, count })),
          complianceStats: {
            passed: Math.round((passed / total) * 100),
            needsReview: Math.round((needsReview / total) * 100),
            failed: Math.round((failed / total) * 100),
          },
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const maxMonthCount = Math.max(...(data?.shipmentsPerMonth.map(m => m.count) || [1]), 1);
  const totalDestinations = data?.destinations.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Track performance metrics and insights across your operations
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shipments Trend</CardTitle>
            <CardDescription>Shipment volume by month</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.shipmentsPerMonth.length ? (
              <div className="h-[300px] flex items-end justify-around gap-4 px-4">
                {data.shipmentsPerMonth.slice(-6).map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full bg-primary rounded-t-md transition-all hover:bg-primary/80"
                      style={{ height: `${(item.count / maxMonthCount) * 100}%`, minHeight: '20px' }}
                    />
                    <span className="text-xs text-muted-foreground">{item.month}</span>
                    <span className="text-xs font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No shipment data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transport Modes</CardTitle>
            <CardDescription>Shipments by transport type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.transportModes.length ? (
                data.transportModes.map((item, i) => {
                  const colors = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4'];
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium capitalize">{item.mode}</p>
                        <p className="text-xs text-muted-foreground">{item.count} shipments</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground text-center py-8">No transport data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Accuracy</CardTitle>
            <CardDescription>Document check results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Passed</span>
                  <span className="font-medium">{data?.complianceStats.passed || 0}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-success" style={{ width: `${data?.complianceStats.passed || 0}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Needs Review</span>
                  <span className="font-medium">{data?.complianceStats.needsReview || 0}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-warning" style={{ width: `${data?.complianceStats.needsReview || 0}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Failed</span>
                  <span className="font-medium">{data?.complianceStats.failed || 0}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-destructive" style={{ width: `${data?.complianceStats.failed || 0}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Destinations</CardTitle>
            <CardDescription>Most frequent shipping destinations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.destinations.length ? (
                data.destinations.map((item, i) => {
                  const percentage = Math.round((item.count / totalDestinations) * 100);
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.destination}</span>
                        <span className="text-muted-foreground">{item.count} shipments</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground text-center py-8">No destination data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Shipments</p>
                <p className="text-2xl font-bold">{data?.totalShipments || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{data?.complianceStats.passed || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/10 rounded-lg">
                <Globe className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Destinations</p>
                <p className="text-2xl font-bold">{data?.destinations.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-warning/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transport Modes</p>
                <p className="text-2xl font-bold">{data?.transportModes.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
