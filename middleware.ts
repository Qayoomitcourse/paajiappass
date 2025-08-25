// middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  // Get the user's session token to check their login status and role
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Get the path the user is trying to access
  const { pathname } = req.nextUrl;

  // --- DEFINE YOUR PUBLIC PATHS (accessible without authentication) ---
  // Only logged-out users can access these paths (home page only)
  const publicPaths = [
    '/',            // Home page for logged-out users
  ];

  // --- CHECK IF THE PATH IS PUBLIC ---
  const isPublicPath = publicPaths.some(path => pathname === path || (path === '/' && pathname === '/'));

  if (isPublicPath && !token) {
    // Allow access to public paths only if user is NOT logged in
    return NextResponse.next();
  }

  if (isPublicPath && token) {
    // If user is logged in and tries to access public paths, redirect based on their role
    const userRole = token.role as string;
    
    if (userRole === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url));
    } else if (userRole === 'editor') {
      return NextResponse.redirect(new URL('/add-pass', req.url));
    } else if (userRole === 'viewer') {
      return NextResponse.redirect(new URL('/cargo-id', req.url)); // or any default viewer page
    }
  }

  // --- CHECK IF THE USER IS LOGGED IN ---
  // If the path is not public, we must have a logged-in user.
  if (!token) {
    const url = new URL('/', req.url); // Redirect to the home/login page
    return NextResponse.redirect(url);
  }

  // ===================================================================
  // --- ROLE-BASED ACCESS CONTROL ---
  // At this point, we know the user is logged in.
  // ===================================================================

  const userRole = token.role as string;

  // --- ADMIN FULL ACCESS ---
  // Admins have access to everything
  if (userRole === 'admin') {
    return NextResponse.next();
  }

  // --- VIEWER ROLE ACCESS ---
  // Viewers can ONLY access cargo-id/[id]/[year] and landside-id/[id]/[year] pages
  if (userRole === 'viewer') {
    const viewerAllowedPaths = [
      '/cargo-id',    // Matches /cargo-id/[id]/[year]
      '/landside-id', // Matches /landside-id/[id]/[year]
      '/profile',     // Allow profile access
      '/unauthorized' // Allow unauthorized page access
    ];

    // Check if the current path starts with any of the allowed viewer paths
    const isViewerAllowedPath = viewerAllowedPaths.some(path => pathname.startsWith(path));
    
    if (!isViewerAllowedPath) {
      const url = new URL('/unauthorized', req.url);
      return NextResponse.redirect(url);
    }

    // Additional check to ensure viewer is accessing the correct dynamic route format
    // cargo-id/[id]/[year] or landside-id/[id]/[year]
    const cargoIdPattern = /^\/cargo-id\/\d+\/\d{4}$/;
    const landsideIdPattern = /^\/landside-id\/\d+\/\d{4}$/;
    const profilePattern = /^\/profile/;
    const unauthorizedPattern = /^\/unauthorized/;

    const isValidViewerPath = cargoIdPattern.test(pathname) || 
                             landsideIdPattern.test(pathname) || 
                             profilePattern.test(pathname) || 
                             unauthorizedPattern.test(pathname) ||
                             pathname === '/cargo-id' ||
                             pathname === '/landside-id';

    if (!isValidViewerPath) {
      const url = new URL('/unauthorized', req.url);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // --- EDITOR ROLE ACCESS ---
  // Editors can add pass, view/edit database (but cannot delete)
  if (userRole === 'editor') {
    const editorAllowedPaths = [
      '/add-pass',
      '/database',
      '/profile',
      '/dashboard',
      '/unauthorized'
    ];

    // Check if editor is trying to access delete functionality
    const deleteRestrictedPaths = [
      '/api/delete',
      '/delete',
      '/api/remove',
      '/remove'
    ];

    const isDeletePath = deleteRestrictedPaths.some(path => pathname.includes(path));
    if (isDeletePath) {
      const url = new URL('/unauthorized', req.url);
      return NextResponse.redirect(url);
    }

    // Check if editor is accessing allowed paths
    const isEditorAllowedPath = editorAllowedPaths.some(path => pathname.startsWith(path));
    
    if (!isEditorAllowedPath) {
      const url = new URL('/unauthorized', req.url);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // --- SANITY STUDIO SPECIFIC ACCESS CONTROL ---
  // Only admins can access CMS/Sanity Studio
  if (pathname.startsWith('/studio') || 
      pathname.startsWith('/admin/studio') || 
      pathname.startsWith('/cms') || 
      pathname.startsWith('/sanity')) {
    
    if (userRole !== 'admin') {
      const url = new URL('/unauthorized', req.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // --- ADMIN-ONLY PATHS ---
  const adminOnlyPaths = [
    '/admin',
    '/settings',
    '/user-management',
    '/reports',
    '/analytics',
    '/studio',
    '/admin/studio',
    '/cms',
    '/sanity'
  ];

  const isAdminPath = adminOnlyPaths.some(path => pathname.startsWith(path));
  if (isAdminPath && userRole !== 'admin') {
    const url = new URL('/unauthorized', req.url);
    return NextResponse.redirect(url);
  }

  // --- HANDLE UNRECOGNIZED ROLES ---
  if (!['admin', 'editor', 'viewer'].includes(userRole)) {
    const url = new URL('/unauthorized', req.url);
    return NextResponse.redirect(url);
  }

  // --- FALLBACK: REDIRECT TO UNAUTHORIZED FOR ANY OTHER PATHS ---
  // If none of the above conditions are met, redirect to unauthorized
  const url = new URL('/unauthorized', req.url);
  return NextResponse.redirect(url);
}

// --- CONFIGURE WHICH PATHS THE MIDDLEWARE RUNS ON ---
export const config = {
  // This matcher runs on all paths except for static/API assets and NextAuth routes
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
};