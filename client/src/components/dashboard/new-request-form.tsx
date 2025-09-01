import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { propertyRequestSchema, type PropertyRequest } from "@shared/schema";
import { Sparkles, PlusCircle } from "lucide-react";

interface NewRequestFormProps {
  onSuggestion: (suggestion: any) => void;
}

export default function NewRequestForm({ onSuggestion }: NewRequestFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<PropertyRequest>({
    resolver: zodResolver(propertyRequestSchema),
    defaultValues: {
      description: "",
      propertyAddress: "",
      unitNumber: "",
      tenantReported: false,
      emergency: false,
    },
  });

  const onSubmit = async (data: PropertyRequest) => {
    setIsLoading(true);
    try {
      // Generate HMAC signature for the request
      const jsonData = JSON.stringify(data);
      
      // In a real implementation, you would generate the HMAC signature
      // For now, we'll simulate the API call
      const mockResponse = {
        summary: `${data.description} at ${data.propertyAddress}${data.unitNumber ? `, Unit ${data.unitNumber}` : ''}`,
        category: "plumbing" as const,
        priority: data.emergency ? "urgent" as const : "high" as const,
        sla_due: new Date(Date.now() + (data.emergency ? 4 : 24) * 60 * 60 * 1000).toISOString(),
        vendor_recommendation: {
          id: "vendor-1",
          name: "ProFix Plumbing Services",
          trade: "Licensed Plumber",
          contact: "(555) 123-4567 • contact@profixplumbing.com",
          rating: 4.8,
        },
        drafts: {
          vendor_message: `Hi ProFix, we have a ${data.description.toLowerCase()} at ${data.propertyAddress}${data.unitNumber ? `, Unit ${data.unitNumber}` : ''}. ${data.emergency ? 'URGENT - ' : ''}High priority repair needed. Please confirm availability and provide quote.`,
          tenant_update: `Hi! We've received your maintenance request for the ${data.description.toLowerCase()}. A licensed plumber will be scheduled within the SLA timeframe. We'll notify you once the appointment is confirmed. Thanks for reporting this promptly!`,
        },
      };

      onSuggestion(mockResponse);
      form.reset();
      
      toast({
        title: "AI Analysis Complete",
        description: "Review the suggestions below and take action as needed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate AI suggestion. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border border-gray-100">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
          <PlusCircle className="w-5 h-5 text-green-700 mr-2" />
          Submit New Property Issue
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="propertyAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Property Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter property address" 
                        {...field}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700 focus:border-green-700 transition-colors"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Unit Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 4B" 
                        {...field}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700 focus:border-green-700 transition-colors"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Issue Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={4}
                      placeholder="Describe the property issue in detail..."
                      {...field}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700 focus:border-green-700 transition-colors"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <FormField
                  control={form.control}
                  name="tenantReported"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox 
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm text-gray-600">Tenant reported</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergency"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox 
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm text-gray-600">Emergency</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-green-700 text-white hover:bg-green-800 transition-colors flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isLoading ? "Analyzing..." : "Get AI Suggestion"}</span>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
