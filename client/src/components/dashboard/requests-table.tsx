import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Wrench, Zap, Snowflake, Lock } from "lucide-react";

export default function RequestsTable() {
  const { data: requests, isLoading } = useQuery({
    queryKey: ["/api/requests"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "plumbing":
        return <Wrench className="w-4 h-4 text-blue-500" />;
      case "electrical":
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case "hvac":
        return <Snowflake className="w-4 h-4 text-blue-400" />;
      case "locks":
        return <Lock className="w-4 h-4 text-gray-500" />;
      default:
        return <Wrench className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge className="bg-red-100 text-red-800">Urgent</Badge>;
      case "high":
        return <Badge className="bg-red-100 text-red-800">High</Badge>;
      case "normal":
        return <Badge className="bg-green-100 text-green-800">Normal</Badge>;
      case "low":
        return <Badge className="bg-gray-100 text-gray-800">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-blue-100 text-blue-800">Open</Badge>;
      case "assigned":
        return <Badge className="bg-blue-100 text-blue-800">Assigned</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatSLATime = (hoursLeft: number) => {
    if (hoursLeft <= 0) return "On time";
    if (hoursLeft < 24) return `${hoursLeft}h left`;
    const days = Math.floor(hoursLeft / 24);
    const hours = hoursLeft % 24;
    return hours > 0 ? `${days}d ${hours}h left` : `${days}d left`;
  };

  return (
    <Card className="border border-gray-100">
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Recent Requests</CardTitle>
          <Button variant="ghost" className="text-blue-600 hover:text-blue-700 text-sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SLA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests?.map((request: any) => (
                <tr key={request.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{request.propertyAddress}</div>
                    {request.unitNumber && (
                      <div className="text-sm text-gray-500">Unit {request.unitNumber}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{request.description}</div>
                    <div className="text-sm text-gray-500 flex items-center mt-1">
                      {getCategoryIcon(request.category)}
                      <span className="ml-1 capitalize">{request.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPriorityBadge(request.priority)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatSLATime(request.slaHoursLeft)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
