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
      value: (stats as any)?.activeRequests || 0,
      icon: ClipboardList,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      change: "+12% from last month",
      changeType: "positive",
    },
    {
      title: "Urgent Issues",
      value: (stats as any)?.urgentIssues || 0,
      icon: AlertTriangle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      change: "3 new today",
      changeType: "negative",
    },
    {
      title: "SLA Compliance",
      value: `${(stats as any)?.slaCompliance || 0}%`,
      icon: Clock,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      change: "2% improvement",
      changeType: "positive",
    },
    {
      title: "Avg Resolution",
      value: `${(stats as any)?.avgResolutionDays || 0}d`,
      icon: Timer,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      change: "0.3d faster",
      changeType: "positive",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {statCards.map((stat) => (
        <Card key={stat.title} className="border border-gray-100">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-gray-500 text-sm font-medium truncate">{stat.title}</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 md:w-12 md:h-12 ${stat.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.iconColor}`} />
              </div>
            </div>
            <div className="flex items-center mt-3 md:mt-4 text-sm">
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
