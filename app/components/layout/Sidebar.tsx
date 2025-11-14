"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import LazyImage from "../ui/LazyImage";
import GlobeIcon from "../icons/GlobeIcon";
import SearchIcon from "../icons/SearchIcon";
import EmailIcon from "../icons/EmailIcon";
import ArchiveIcon from "../icons/ArchiveIcon";
import ProjectsIcon from "../icons/ProjectsIcon";
import CalendarIcon from "../icons/CalendarIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { User, LogOut } from "lucide-react";

interface SidebarProps {
  onOpenCommandPalette?: () => void;
}

export default function Sidebar({ onOpenCommandPalette }: SidebarProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single();

        if (data) {
          setUserAvatar(data.avatar_url);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  const navItems: Array<{
    Icon: React.ComponentType<{ className?: string }>;
    href: string | null;
    label: string;
    isCommandPalette?: boolean;
  }> = [
    { Icon: GlobeIcon, href: "/dashboard", label: "Home" },
    { Icon: SearchIcon, href: null, label: "Search", isCommandPalette: true },
    { Icon: EmailIcon, href: "/messages", label: "Messages" },
    { Icon: ArchiveIcon, href: "/projects", label: "Saved" },
    { Icon: ProjectsIcon, href: "/graph", label: "Graph" },
    { Icon: CalendarIcon, href: "/events", label: "Events" },
  ];

  return (
    <div className="h-screen w-[52px] border-r border-border flex flex-col items-center justify-between py-4 px-8 bg-surface shrink-0">
      {/* Top: Logo/Brand */}
      <div className="w-9 h-9 rounded-full bg-avatar-bg opacity-0" />

      {/* Middle: Navigation Icons */}
      <div className="flex flex-col gap-12 items-center ">
        {navItems.map((item) => {
          const IconComponent = item.Icon;
          const isActive =
            item.href &&
            (pathname === item.href ||
              (item.href === "/projects" &&
                pathname?.startsWith("/projects")) ||
              (item.href === "/events" && pathname?.startsWith("/events")));

          return (
            <button
              key={item.href || item.label}
              onClick={() => {
                if (item.isCommandPalette && onOpenCommandPalette) {
                  onOpenCommandPalette();
                } else if (item.href) {
                  router.push(item.href);
                }
              }}
              className={`w-7 h-7  flex items-center justify-center transition-opacity ${
                isActive
                  ? "opacity-100 text-onsurface-primary"
                  : "opacity-50 hover:opacity-75 text-onsurface-secondary"
              }`}
              title={item.label}
            >
              <IconComponent className="w-full h-full" />
            </button>
          );
        })}
      </div>

      {/* Bottom: User Avatar */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-9 h-9 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 ring-primary/20 transition-all focus:outline-none">
            {userAvatar ? (
              <LazyImage
                src={userAvatar}
                alt="User avatar"
                className="w-full h-full object-cover"
                placeholder="blur"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-onsurface-secondary font-medium text-base">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="right" className="w-48">
          <DropdownMenuItem
            onClick={() => router.push("/profile")}
            className="cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              await signOut();
            }}
            className="cursor-pointer text-error focus:text-error"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
