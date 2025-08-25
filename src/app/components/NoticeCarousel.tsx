// app/components/NoticeCarousel.tsx
'use client';

import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { 
  InformationCircleIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon 
} from '@heroicons/react/24/solid';

interface PublicNotice {
  _id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isActive: boolean;
  displayOrder: number;
  validUntil?: string;
  _createdAt: string;
  _updatedAt: string;
}

interface NoticeCarouselProps {
  notices: PublicNotice[];
  autoSlideInterval?: number;
  showDismiss?: boolean;
}

const NoticeCarousel = ({ 
  notices, 
  autoSlideInterval = 5000, 
  showDismiss = true 
}: NoticeCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedNotices, setDismissedNotices] = useState<Set<string>>(new Set());
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Filter out dismissed notices
  const activeNotices = notices.filter(notice => !dismissedNotices.has(notice._id));

  // Reset current index if it's out of bounds after dismissing notices
  useEffect(() => {
    if (currentIndex >= activeNotices.length && activeNotices.length > 0) {
      setCurrentIndex(0);
    }
  }, [currentIndex, activeNotices.length]);

  // Auto-slide functionality
  useEffect(() => {
    if (!isAutoPlaying || activeNotices.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeNotices.length);
    }, autoSlideInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, activeNotices.length, autoSlideInterval]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + activeNotices.length) % activeNotices.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeNotices.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const dismissNotice = (noticeId: string) => {
    setDismissedNotices(prev => new Set([...prev, noticeId]));
  };

  const getNoticeIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <InformationCircleIcon className="w-6 h-6" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-6 h-6" />;
      case 'success':
        return <CheckCircleIcon className="w-6 h-6" />;
      case 'error':
        return <ExclamationCircleIcon className="w-6 h-6" />;
      default:
        return <InformationCircleIcon className="w-6 h-6" />;
    }
  };

  const getNoticeStyles = (type: string) => {
    switch (type) {
      case 'info':
        return {
          background: 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30',
          border: 'border-blue-200 dark:border-blue-600/50',
          icon: 'text-blue-500 dark:text-blue-400',
          title: 'text-blue-900 dark:text-blue-100',
          description: 'text-blue-700 dark:text-blue-300',
          accent: 'bg-blue-500'
        };
      case 'warning':
        return {
          background: 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30',
          border: 'border-amber-200 dark:border-amber-600/50',
          icon: 'text-amber-500 dark:text-amber-400',
          title: 'text-amber-900 dark:text-amber-100',
          description: 'text-amber-700 dark:text-amber-300',
          accent: 'bg-amber-500'
        };
      case 'success':
        return {
          background: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30',
          border: 'border-green-200 dark:border-green-600/50',
          icon: 'text-green-500 dark:text-green-400',
          title: 'text-green-900 dark:text-green-100',
          description: 'text-green-700 dark:text-green-300',
          accent: 'bg-green-500'
        };
      case 'error':
        return {
          background: 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30',
          border: 'border-red-200 dark:border-red-600/50',
          icon: 'text-red-500 dark:text-red-400',
          title: 'text-red-900 dark:text-red-100',
          description: 'text-red-700 dark:text-red-300',
          accent: 'bg-red-500'
        };
      default:
        return {
          background: 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/30 dark:to-slate-900/30',
          border: 'border-gray-200 dark:border-gray-600/50',
          icon: 'text-gray-500 dark:text-gray-400',
          title: 'text-gray-900 dark:text-gray-100',
          description: 'text-gray-700 dark:text-gray-300',
          accent: 'bg-gray-500'
        };
    }
  };

  if (activeNotices.length === 0) {
    return null;
  }

  const currentNotice = activeNotices[currentIndex];
  const styles = getNoticeStyles(currentNotice.type);

  return (
    <div className="relative">
      <div className={`relative rounded-xl shadow-lg border ${styles.border} ${styles.background} overflow-hidden`}>
        {/* Accent bar */}
        <div className={`h-1 ${styles.accent}`} />
        
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <div className={`flex-shrink-0 ${styles.icon}`}>
                {getNoticeIcon(currentNotice.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h3 className={`text-lg font-semibold ${styles.title} pr-2`}>
                    {currentNotice.title}
                  </h3>
                  
                  {showDismiss && (
                    <button
                      onClick={() => dismissNotice(currentNotice._id)}
                      className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
                      aria-label="Dismiss notice"
                    >
                      <XMarkIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" />
                    </button>
                  )}
                </div>
                
                <p className={`text-sm ${styles.description} leading-relaxed`}>
                  {currentNotice.description}
                </p>
                
                <div className="flex items-center justify-between mt-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {currentNotice.validUntil && (
                      <span>Valid until: {new Date(currentNotice.validUntil).toLocaleDateString()}</span>
                    )}
                  </div>
                  
                  {activeNotices.length > 1 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {currentIndex + 1} of {activeNotices.length}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation Controls */}
        {activeNotices.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-black/80 hover:bg-white dark:hover:bg-black/90 shadow-md transition-colors"
              aria-label="Previous notice"
            >
              <ChevronLeftIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </button>
            
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-black/80 hover:bg-white dark:hover:bg-black/90 shadow-md transition-colors"
              aria-label="Next notice"
            >
              <ChevronRightIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </button>
          </>
        )}
      </div>
      
      {/* Slide Indicators */}
      {activeNotices.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {activeNotices.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex
                  ? styles.accent
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
              aria-label={`Go to notice ${index + 1}`}
            />
          ))}
        </div>
      )}
      
      {/* Auto-play indicator */}
      {activeNotices.length > 1 && isAutoPlaying && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Auto-playing" />
        </div>
      )}
    </div>
  );
};

export default NoticeCarousel;