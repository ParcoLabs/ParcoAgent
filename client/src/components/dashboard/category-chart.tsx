import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CategoryChart() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["/api/category-distribution"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Issue Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getColorClasses = (category: string) => {
    switch (category.toLowerCase()) {
      case "plumbing":
        return { bg: "bg-green-600", text: "text-green-600" };
      case "hvac":
        return { bg: "bg-green-500", text: "text-green-500" };
      case "electrical":
        return { bg: "bg-yellow-500", text: "text-yellow-500" };
      case "locks":
        return { bg: "bg-gray-500", text: "text-gray-500" };
      case "general":
        return { bg: "bg-gray-400", text: "text-gray-400" };
      default:
        return { bg: "bg-gray-300", text: "text-gray-300" };
    }
  };

  return (
    <Card className="border border-gray-100">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="text-lg font-semibold text-gray-900">Issue Categories</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {Array.isArray(categories) && categories.map((category: any) => {
            const colors = getColorClasses(category.category);
            return (
              <div key={category.category} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 ${colors.bg} rounded-full`}></div>
                  <span className="text-sm text-gray-600">{category.category}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className={`${colors.bg} h-2 rounded-full`}
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">
                    {category.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
