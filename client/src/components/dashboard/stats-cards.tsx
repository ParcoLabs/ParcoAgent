import { useQuery } from "@tanstack/react-query";
import { ClipboardList, AlertTriangle, Clock, Timer, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Active Requests",
      value: stats?.activeRequests || 0,
      icon: ClipboardList,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      change: "+12% from last month",
      changeType: "positive",
    },
    {
      title: "Urgent Issues",
      value: stats?.urgentIssues || 0,
      icon: AlertTriangle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      change: "3 new today",
      changeType: "negative",
    },
    {
      title: "SLA Compliance",
      value: `${stats?.slaCompliance || 0}%`,
      icon: Clock,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      change: "2% improvement",
      changeType: "positive",
    },
    {
      title: "Avg Resolution",
      value: `${stats?.avgResolutionDays || 0}d`,
      icon: Timer,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      change: "0.3d faster",
      changeType: "positive",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat) => (
        <Card key={stat.title} className="border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <span
                className={`flex items-center ${
                  stat.changeType === "positive" ? "text-green-600" : "text-red-600"
                }`}
              >
                {stat.changeType === "positive" ? (
                  <ArrowUp className="w-3 h-3 mr-1" />
                ) : (
                  <ArrowUp className="w-3 h-3 mr-1" />
                )}
                {stat.change}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
