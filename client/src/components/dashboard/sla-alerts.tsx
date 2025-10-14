// client/src/components/dashboard/slaalerts.tsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, RefreshCcw } from "lucide-react";
import { useSlaAlerts } from "@/lib/hooks"; // uses /sla-alerts under the hood

export default function SLAAlerts() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: alerts, isLoading, isError } = useSlaAlerts();

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
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border border-red-200">
        <CardHeader className="border-b border-red-200">
          <CardTitle className="flex items-center text-lg font-semibold text-red-700">
            <Clock className="w-5 h-5 text-red-600 mr-2" />
            SLA Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-sm text-red-700 mb-3">Failed to load SLA alerts.</div>
          <Button
            variant="outline"
            onClick={() => qc.invalidateQueries({ queryKey: ["/sla-alerts"] })}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const items = Array.isArray(alerts) ? alerts : [];

  return (
    <Card className="border border-gray-100">
      <CardHeader className="border-b border-gray-200 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
          <Clock className="w-5 h-5 text-yellow-600 mr-2" />
          SLA Alerts
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => qc.invalidateQueries({ queryKey: ["/sla-alerts"] })}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
          title="Refresh"
        >
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {items.map((alert: any) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 border rounded-lg ${
              alert.priority === "urgent"
                ? "bg-red-50 border-red-200"
                : "bg-yellow-50 border-yellow-200"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full mt-2 ${
                alert.priority === "urgent" ? "bg-red-500" : "bg-yellow-500"
              }`}
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {alert.propertyAddress} — {alert.category}
              </p>
              <p className="text-sm text-gray-600">
                SLA expires in <span className="font-medium">{alert.hoursLeft}h</span>
              </p>
              <Button
                variant="ghost"
                className="text-xs text-green-700 hover:text-green-800 mt-1 p-0 h-auto inline-flex items-center"
                onClick={() => navigate("/requests")}
              >
                View Details <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No SLA alerts at this time</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
