import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, Snowflake, Zap, Star, ArrowRight } from "lucide-react";

export default function TopVendors() {
  const { data: vendors, isLoading } = useQuery({
    queryKey: ["/api/vendors"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTradeIcon = (trade: string) => {
    switch (trade.toLowerCase()) {
      case "plumbing":
        return <Wrench className="w-4 h-4 text-white" />;
      case "hvac":
        return <Snowflake className="w-4 h-4 text-white" />;
      case "electrical":
        return <Zap className="w-4 h-4 text-white" />;
      default:
        return <Wrench className="w-4 h-4 text-white" />;
    }
  };

  const getTradeColor = (trade: string) => {
    switch (trade.toLowerCase()) {
      case "plumbing":
        return "bg-blue-600";
      case "hvac":
        return "bg-blue-400";
      case "electrical":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="border border-gray-100">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="text-lg font-semibold text-gray-900">Top Vendors</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {vendors?.map((vendor: any) => (
          <div key={vendor.id} className="flex items-center space-x-3">
            <div className={`w-10 h-10 ${getTradeColor(vendor.trade)} rounded-lg flex items-center justify-center`}>
              {getTradeIcon(vendor.trade)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{vendor.name}</p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <div className="flex items-center">
                  <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                  {vendor.rating}
                </div>
                <span>•</span>
                <span>{vendor.jobsCompleted} jobs completed</span>
              </div>
            </div>
            <Button variant="ghost" className="text-xs text-blue-600 hover:text-blue-700 p-0 h-auto">
              Contact
            </Button>
          </div>
        ))}
        <div className="pt-2 border-t border-gray-200">
          <Button variant="ghost" className="text-sm text-blue-600 hover:text-blue-700 w-full">
            View All Vendors <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
