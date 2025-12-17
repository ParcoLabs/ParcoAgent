import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  ClipboardList,
  Home,
  Bot,
  MoreHorizontal,
  Building2,
  ScrollText,
  Newspaper,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const mainNavItems = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Requests", href: "/requests", icon: ClipboardList },
  { name: "Agent", href: "/agent", icon: Bot },
  { name: "Properties", href: "/properties", icon: Building2 },
  { name: "More", href: "#more", icon: MoreHorizontal },
];

const moreNavItems = [
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Audit", href: "/audit", icon: ScrollText },
  { name: "Daily Brief", href: "/daily-brief", icon: Newspaper },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden"
        data-testid="mobile-bottom-nav"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {mainNavItems.map((item) => {
            const isMore = item.href === "#more";
            const isActive = !isMore && location.pathname === item.href;

            if (isMore) {
              return (
                <button
                  key={item.name}
                  onClick={() => setMoreOpen(true)}
                  className="flex flex-col items-center justify-center flex-1 py-2 text-gray-500 hover:text-green-700"
                  data-testid="button-more-menu"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-xs mt-1">{item.name}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-2",
                  isActive
                    ? "text-green-700"
                    : "text-gray-500 hover:text-green-700"
                )}
                data-testid={`nav-${item.name.toLowerCase()}`}
              >
                <item.icon className={cn("w-5 h-5", isActive && "text-green-700")} />
                <span className={cn("text-xs mt-1", isActive && "font-medium")}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-4 pb-6">
            {moreNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-lg",
                    isActive
                      ? "bg-green-50 text-green-700"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                  data-testid={`menu-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <item.icon className="w-6 h-6 mb-2" />
                  <span className="text-xs text-center">{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="border-t pt-4 pb-2">
            <div className="flex items-center space-x-3 px-4 py-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Sarah Johnson</p>
                <p className="text-xs text-gray-500">Property Manager</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
