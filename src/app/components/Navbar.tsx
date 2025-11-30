// /components/Navbar.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signIn, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === 'admin';
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Navigation items
  const navigationItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/add-pass', label: 'Add Pass', icon: '➕' },
    { href: '/database', label: 'Database', icon: '🗃️' },
    { href: '/scan-cards', label: 'Scan Cards', icon: '📋' },
  ];

  // Check if current path is active
  const isActivePath = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  // Close menus when clicking outside or on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        setIsUserMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      const navbar = document.querySelector('[data-navbar]');
      const userMenu = document.querySelector('[data-user-menu]');
      
      if (navbar && !navbar.contains(target)) {
        setIsMenuOpen(false);
      }
      if (userMenu && !userMenu.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isMenuOpen || isUserMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMenuOpen, isUserMenuOpen]);

  const handleLinkClick = () => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  const getUserInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white shadow-xl sticky top-0 z-50 backdrop-blur-sm" data-navbar>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link 
              href="/" 
              className="flex items-center space-x-4 group" 
              onClick={handleLinkClick}
            >
              <div className="relative w-12 h-12 flex-shrink-0">
                <div className="absolute inset-0 bg-white rounded-xl shadow-lg transform group-hover:scale-105 transition-all duration-300 group-hover:shadow-xl">
                  <Image
                    src="/logo.png"
                    alt="PAA Logo"
                    fill
                    style={{ objectFit: 'contain' }}
                    sizes="78px"
                    priority
                    className="p-2"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white leading-tight group-hover:text-blue-200 transition-colors duration-300">
                  PAA Pass System
                </span>
                <span className="text-sm text-blue-200 hidden sm:block font-light">
                  Vigilance Branch • Jinnah International Airport
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                  isActivePath(item.href)
                    ? 'bg-white text-blue-900 shadow-lg'
                    : 'text-blue-100 hover:text-white hover:bg-white/10 backdrop-blur-sm'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {isActivePath(item.href) && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                )}
              </Link>
            ))}
            
            {isAdmin && (
              <Link
                href="/admin/users"
                className={`relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                  isActivePath('/admin')
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg'
                    : 'text-amber-300 hover:text-white hover:bg-amber-500/20 backdrop-blur-sm'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">⚡</span>
                  <span>Admin</span>
                </div>
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {status === 'loading' ? (
              <div className="w-10 h-10 bg-blue-300/30 rounded-full animate-pulse backdrop-blur-sm"></div>
            ) : session ? (
              <div className="relative" data-user-menu>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 text-sm bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-300 transform hover:scale-105"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                    {getUserInitials(session.user?.name)}
                  </div>
                  <span className="hidden sm:block font-medium text-white max-w-32 truncate">
                    {session.user?.name || 'User'}
                  </span>
                  <svg className={`w-4 h-4 text-white/80 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* User Dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 py-3 animate-in slide-in-from-top-5 duration-300">
                    <div className="px-5 py-4 border-b border-gray-200/50">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg">
                          {getUserInitials(session.user?.name)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{session.user?.name}</p>
                          <p className="text-xs text-gray-600">{session.user?.email}</p>
                          {session.user?.role && (
                            <span className="inline-block mt-1 px-3 py-1 text-xs bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-medium">
                              {session.user.role.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleLinkClick();
                        signOut();
                      }}
                      className="w-full text-left px-5 py-3 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 font-medium flex items-center space-x-3 rounded-b-2xl"
                    >
                      <span className="text-lg">🚪</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Sign In
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-3 rounded-xl text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-300 backdrop-blur-sm"
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              <svg className={`w-6 h-6 transition-transform duration-300 ${isMenuOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-white/20 py-6 animate-in slide-in-from-top-5 duration-300">
            <div className="space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`block px-4 py-4 rounded-2xl text-base font-semibold transition-all duration-300 transform hover:scale-102 ${
                    isActivePath(item.href)
                      ? 'bg-white text-blue-900 shadow-xl'
                      : 'text-blue-100 hover:text-white hover:bg-white/15 backdrop-blur-sm'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                </Link>
              ))}
              
              {isAdmin && (
                <Link
                  href="/admin/users"
                  onClick={handleLinkClick}
                  className={`block px-4 py-4 rounded-2xl text-base font-semibold transition-all duration-300 transform hover:scale-102 ${
                    isActivePath('/admin')
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-xl'
                      : 'text-amber-300 hover:text-white hover:bg-amber-500/20 backdrop-blur-sm'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">⚡</span>
                    <span>Admin Panel</span>
                  </div>
                </Link>
              )}
            </div>

            {/* Mobile User Section */}
            {session && (
              <div className="mt-8 pt-6 border-t border-white/20">
                <div className="px-4 py-4 bg-white/10 backdrop-blur-md rounded-2xl">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-xl">
                      {getUserInitials(session.user?.name)}
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">{session.user?.name}</p>
                      <p className="text-sm text-blue-200">{session.user?.email}</p>
                      {session.user?.role && (
                        <span className="inline-block mt-2 px-3 py-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-bold">
                          {session.user.role.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleLinkClick();
                      signOut();
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl text-base font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200 flex items-center space-x-3"
                  >
                    <span className="text-xl">🚪</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Animated Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-8 right-20 w-16 h-16 bg-blue-300/10 rounded-full blur-lg animate-bounce" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-4 right-40 w-8 h-8 bg-indigo-200/10 rounded-full blur-md animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Bottom accent line */}
      <div className="h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400"></div>
    </nav>
  );
}