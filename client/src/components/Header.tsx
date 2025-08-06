"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { Menu, X, MessageCircleMore, LogIn, LogOut } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    location.href = "/login";
  };

  return (
    <header className="bg-white dark:bg-zinc-900 text-gray-800 dark:text-white shadow-md dark:shadow-zinc-800 px-4 py-3 sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          AI Chat App
        </div>

        {/* Desktop Menu */}
        <nav className="hidden md:flex space-x-6 items-center">
          <Link
            href="/ask-ai"
            className="flex items-center gap-1 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <MessageCircleMore size={18} />
            Ask AI
          </Link>

          {!user ? (
            <Link
              href="/login"
              className="flex items-center gap-1 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <LogIn size={18} />
              Login
            </Link>
          ) : (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline"
            >
              <LogOut size={18} />
              Logout
            </button>
          )}
        </nav>

        {/* Burger Icon */}
        <button
          className="md:hidden text-gray-700 dark:text-gray-200"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden mt-2 space-y-2 px-2 pb-4 border-t border-gray-200 dark:border-zinc-700">
          <Link
            href="/ask-ai"
            className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <MessageCircleMore size={18} />
            Ask AI
          </Link>

          {!user ? (
            <Link
              href="/login"
              className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <LogIn size={18} />
              Login
            </Link>
          ) : (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:underline"
            >
              <LogOut size={18} />
              Logout
            </button>
          )}
        </div>
      )}
    </header>
  );
}
