import { Link, useLocation } from "react-router-dom";
import { BarChart3, ClipboardList, Users, Home, User, Settings as SettingsIcon } from "lucide-react"; // 👈 added Settings icon
import { cn } from "@/lib/utils";
import ParcoLogo from "@/assets/parco-logo.png"; // <-- match exact name & extension

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3, current: true },
  { name: "Requests", href: "/requests", icon: ClipboardList, current: false },
  { name: "Vendors", href: "/vendors", icon: Users, current: false },
  { name: "Properties", href: "/properties", icon: Home, current: false },
  { name: "Analytics", href: "/analytics", icon: BarChart3, current: false },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="bg-white shadow-sm border-r border-gray-200 w-64 flex flex-col md:relative fixed inset-y-0 left-0 z-50 md:translate-x-0 transform -translate-x-full transition-transform duration-300">
      <div className="p-4 md:p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          {/* Green tile with Parco logo inside */}
          <div className="w-8 md:w-10 h-8 md:h-10 bg-green-700 rounded-lg flex items-center justify-center overflow-hidden">
            <img
              src={ParcoLogo}
              alt="Parco Logo"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">Parco PM</h1>
            <p className="text-xs md:text-sm text-gray-500">Agent Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive =
            location.pathname === item.href || (item.href === "/" && location.pathname === "/dashboard");
          return (
            <Link key={item.name} to={item.href}>
              <div
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer",
                  isActive
                    ? "bg-green-50 text-green-700 border-r-2 border-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 space-y-2">
        {/* User card */}
        <div className="flex items-center space-x-3 px-4 py-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Sarah Johnson</p>
            <p className="text-xs text-gray-500">Property Manager</p>
          </div>
        </div>

        {/* Settings button 👇 */}
        <Link to="/settings">
          <div
            className={cn(
              "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer",
              location.pathname === "/settings"
                ? "bg-green-50 text-green-700 border-r-2 border-green-700 font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <SettingsIcon className="w-5 h-5" />
            <span>Settings</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
