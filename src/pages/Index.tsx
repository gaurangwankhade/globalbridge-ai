import { useState } from "react";
import { StatCard } from "@/components/StatCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Package,
  AlertTriangle,
  Users,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { generateTradeMetrics } from "@/lib/mockData";

const Index = () => {
  const [metrics, setMetrics] = useState(generateTradeMetrics());

  const refreshMetrics = () => {
    setMetrics(generateTradeMetrics());
  };

  const recentActivity = [
    {
      id: 1,
      type: "shipment",
      title: "Shipment #SH-2024-001",
      description: "Departed from Shanghai Port",
      time: "2 hours ago",
      status: "in-transit",
    },
    {
      id: 2,
      type: "compliance",
      title: "Compliance Check",
      description: "Document review required for BL-8842",
      time: "4 hours ago",
      status: "warning",
    },
    {
      id: 3,
      type: "match",
      title: "New Buyer Match",
      description: "3 potential buyers found for Electronics",
      time: "5 hours ago",
      status: "success",
    },
    {
      id: 4,
      type: "route",
      title: "Route Optimized",
      description: "Saved $2,400 on Mumbai-Hamburg route",
      time: "1 day ago",
      status: "success",
    },
  ];

  const alerts = [
    {
      id: 1,
      title: "Missing Documentation",
      description: "HS Code certificate required for shipment #1234",
      severity: "high",
    },
    {
      id: 2,
      title: "Tariff Change Alert",
      description: "New tariffs applied to textile imports in EU",
      severity: "medium",
    },
    {
      id: 3,
      title: "Route Delay",
      description: "Weather conditions affecting Asia-Europe routes",
      severity: "low",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Overview of current trade operations and system activity.
          </p>
        </div>

        <div className="text-right text-xs text-muted-foreground">
          <p>
            Last updated at{" "}
            {metrics.lastUpdatedAt.toLocaleTimeString()}
          </p>
          <button
            onClick={refreshMetrics}
            className="underline hover:text-foreground mt-1"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Shipments"
          value={metrics.shipmentsInTransit}
          change="+12% from last month"
          icon={Package}
          trend="up"
        />
        <StatCard
          title="Compliance Alerts"
          value={metrics.complianceAlerts}
          change="2 resolved today"
          icon={AlertTriangle}
          trend="down"
        />
        <StatCard
          title="Buyer Matches"
          value={metrics.activeBuyers}
          change="+5 new this week"
          icon={Users}
          trend="up"
        />
        <StatCard
          title="Avg Transit Days"
          value={metrics.avgTransitDays}
          change="Across active routes"
          icon={TrendingDown}
          trend="up"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates from trade workflows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
                >
                  <div
                    className={`p-2 rounded-lg ${
                      activity.status === "success"
                        ? "bg-success/10 text-success"
                        : activity.status === "warning"
                        ? "bg-warning/10 text-warning"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {activity.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : activity.status === "warning" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance & Alerts</CardTitle>
            <CardDescription>
              Items requiring review or action
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
                >
                  <div
                    className={`p-2 rounded-lg ${
                      alert.severity === "high"
                        ? "bg-destructive/10 text-destructive"
                        : alert.severity === "medium"
                        ? "bg-warning/10 text-warning"
                        : "bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {alert.severity === "high" ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {alert.title}
                      </p>
                      <Badge
                        variant={
                          alert.severity === "high"
                            ? "destructive"
                            : alert.severity === "medium"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {alert.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
