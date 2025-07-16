"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plane, User, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export function Navbar() {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Plane className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">SkyBooker</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Home
            </Link>
            {user && (
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                My Trips
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-72 p-3 rounded-xl shadow-lg"
                  align="end"
                  forceMount
                >
                  <div className="flex items-center gap-3 p-3 mb-2 rounded-lg bg-gray-50 w-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1 leading-none w-full">
                      <p className="font-semibold text-gray-900 truncate overflow-hidden whitespace-nowrap max-w-[180px]">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/profile/settings"
                      className="flex items-center"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center">
                      <Plane className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/register">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-4">
              <Link
                href="/"
                className="text-gray-700 hover:text-blue-600 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Trips
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      window.location.href = "/profile/settings";
                    }}
                    className="justify-start"
                  >
                    Profile Settings
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={signOut}
                    className="justify-start"
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <div className="flex flex-col space-y-2">
                  <Button variant="ghost" asChild>
                    <Link
                      href="/auth/login"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link
                      href="/auth/register"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
