import { Link, useLocation } from "wouter";
import { Building, BarChart3, ClipboardList, Users, Home, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3, current: true },
  { name: "Requests", href: "/requests", icon: ClipboardList, current: false },
  { name: "Vendors", href: "/vendors", icon: Users, current: false },
  { name: "Properties", href: "/properties", icon: Home, current: false },
  { name: "Analytics", href: "/analytics", icon: BarChart3, current: false },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="bg-white shadow-sm border-r border-gray-200 w-64 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Parco PM</h1>
            <p className="text-sm text-gray-500">Agent Dashboard</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href === "/" && location === "/dashboard");
          return (
            <Link key={item.name} href={item.href}>
              <a
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </a>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 px-4 py-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Sarah Johnson</p>
            <p className="text-xs text-gray-500">Property Manager</p>
          </div>
        </div>
      </div>
    </div>
  );
}
