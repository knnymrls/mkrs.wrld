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

export default function Sidebar() {
  const { user } = useAuth();
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

  const navItems = [
    { Icon: GlobeIcon, href: "/dashboard", label: "Home" },
    { Icon: SearchIcon, href: "/explore", label: "Explore" },
    { Icon: EmailIcon, href: "/messages", label: "Messages" },
    { Icon: ArchiveIcon, href: "/saved", label: "Saved" },
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
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-7 h-7  flex items-center justify-center transition-opacity ${
                pathname === item.href
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
      <div className="w-9 h-9 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0">
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
      </div>
    </div>
  );
}
