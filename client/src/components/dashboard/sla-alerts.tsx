import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight } from "lucide-react";

export default function SLAAlerts() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ["/api/sla-alerts"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 text-yellow-600 mr-2" />
            SLA Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-100">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
          <Clock className="w-5 h-5 text-yellow-600 mr-2" />
          SLA Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {alerts?.map((alert: any) => (
          <div
            key={alert.id}
            className={`flex items-start space-x-3 p-3 border rounded-lg ${
              alert.priority === "urgent"
                ? "bg-red-50 border-red-200"
                : "bg-yellow-50 border-yellow-200"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full mt-2 ${
                alert.priority === "urgent" ? "bg-red-500" : "bg-yellow-500"
              }`}
            ></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {alert.propertyAddress} - {alert.category}
              </p>
              <p className="text-sm text-gray-600">
                SLA expires in {alert.hoursLeft} hours
              </p>
              <Button variant="ghost" className="text-xs text-blue-600 hover:text-blue-700 mt-1 p-0 h-auto">
                View Details <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        ))}
        {(!alerts || alerts.length === 0) && (
          <div className="text-center text-gray-500 py-4">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No SLA alerts at this time</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
