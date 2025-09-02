import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Wrench, AlertCircle, Clock, Bus, Mail, Home, Check, Search, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AISuggestionProps {
  suggestion: {
    summary: string;
    category: string;
    priority: string;
    sla_due: string;
    vendor_recommendation: {
      id: string;
      name: string;
      trade: string;
      contact: string;
      rating: number;
    };
    drafts: {
      vendor_message: string;
      tenant_update: string;
    };
  };
}

export default function AISuggestion({ suggestion }: AISuggestionProps) {
  const { toast } = useToast();

  const handleApproveVendor = () => {
    toast({
      title: "Vendor Approved",
      description: `${suggestion.vendor_recommendation.name} has been approved and notified.`,
    });
  };

  const handleFindAlternative = () => {
    toast({
      title: "Finding Alternatives",
      description: "Searching for alternative vendors in your area...",
    });
  };

  const handleEditMessage = (type: "vendor" | "tenant") => {
    toast({
      title: "Message Editor",
      description: `Opening ${type} message editor...`,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-red-100 text-red-800";
      case "normal":
        return "bg-green-100 text-green-800";
      case "low":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "plumbing":
        return <Wrench className="w-4 h-4" />;
      case "electrical":
        return <AlertCircle className="w-4 h-4" />;
      case "hvac":
        return <Clock className="w-4 h-4" />;
      default:
        return <Wrench className="w-4 h-4" />;
    }
  };

  const formatSLATime = (isoDate: string) => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffHours = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60));
    return `${diffHours}h`;
  };

  return (
    <Card className="border border-gray-100">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
          <Brain className="w-5 h-5 text-green-700 mr-2" />
          AI Analysis & Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Classification Tags */}
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
              {getCategoryIcon(suggestion.category)}
              <span className="ml-1 capitalize">{suggestion.category}</span>
            </Badge>
            <Badge className={getPriorityColor(suggestion.priority)}>
              <AlertCircle className="w-3 h-3 mr-1" />
              <span className="capitalize">{suggestion.priority} Priority</span>
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
              <Clock className="w-3 h-3 mr-1" />
              SLA: {formatSLATime(suggestion.sla_due)}
            </Badge>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Issue Summary</h4>
            <p className="text-gray-700">{suggestion.summary}</p>
          </div>

          {/* Vendor Recommendation */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Bus className="w-4 h-4 text-green-700 mr-2" />
              Recommended Vendor
            </h4>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-700 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h5 className="font-medium text-gray-900">{suggestion.vendor_recommendation.name}</h5>
                <p className="text-gray-600 text-sm">
                  {suggestion.vendor_recommendation.trade} • {suggestion.vendor_recommendation.rating} rating • Available Today
                </p>
                <p className="text-gray-600 text-sm">{suggestion.vendor_recommendation.contact}</p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={handleApproveVendor}
                  className="bg-green-600 text-white hover:bg-green-700 transition-colors text-sm"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Approve
                </Button>
                <Button 
                  onClick={handleFindAlternative}
                  variant="outline"
                  className="text-sm"
                >
                  <Search className="w-3 h-3 mr-1" />
                  Find Alternative
                </Button>
              </div>
            </div>
          </div>

          {/* Draft Messages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <Mail className="w-4 h-4 text-green-700 mr-2" />
                Vendor Message
              </h4>
              <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 mb-2">
                {suggestion.drafts.vendor_message}
              </div>
              <Button 
                onClick={() => handleEditMessage("vendor")}
                variant="ghost" 
                className="text-green-700 hover:text-green-800 text-sm p-0 h-auto"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit & Send
              </Button>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <Home className="w-4 h-4 text-green-700 mr-2" />
                Tenant Update
              </h4>
              <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 mb-2">
                {suggestion.drafts.tenant_update}
              </div>
              <Button 
                onClick={() => handleEditMessage("tenant")}
                variant="ghost" 
                className="text-green-700 hover:text-green-800 text-sm p-0 h-auto"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit & Send
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
