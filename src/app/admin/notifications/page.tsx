'use client';

import { useState, useEffect, FormEvent } from 'react';
import { BellIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Notice {
  _id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isActive: boolean;
  validUntil?: string;
}

export default function NotificationsPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'success' | 'error'>('info');
  const [isActive] = useState(true); // Removed unused 'setIsActive'
  const [validUntil, setValidUntil] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Failed to fetch notices');
      const data = await response.json();
      setNotices(data.notices);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError('Title is required.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setFeedback(null);

    const body = JSON.stringify({
        title,
        description,
        type,
        isActive,
        validUntil: validUntil || null,
    });

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create notification');
      }

      setFeedback('Notification created successfully!');
      setTitle('');
      setDescription('');
      fetchNotices();

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
      setFeedback('Notification deleted.');
      setNotices(notices.filter(n => n._id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };
  
  const handleToggleActive = async (notice: Notice) => {
      const updatedNotice = { ...notice, isActive: !notice.isActive };
       try {
        await fetch('/api/notifications', { 
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedNotice)
        });
        setNotices(notices.map(n => n._id === notice._id ? updatedNotice : n));
       } catch (err) {
           setError((err as Error).message); // Used 'err' to provide a dynamic error message
       }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-200">Manage Notifications</h1>

        {/* New Notice Form */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Notification</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
             {/* Fields for title, description, type, validUntil, isActive */}
             <div>
                <label className="block text-sm font-medium">Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md"/>
             </div>
             <div>
                <label className="block text-sm font-medium">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md"></textarea>
             </div>
             <div>
                <label className="block text-sm font-medium">Type</label>
                <select value={type} onChange={e => setType(e.target.value as typeof type)} className="mt-1 block w-full bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md">
                    <option value="info">Info (Blue)</option>
                    <option value="warning">Warning (Yellow)</option>
                    <option value="success">Success (Green)</option>
                    <option value="error">Error (Red)</option>
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium">Valid Until (Optional)</label>
                <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="mt-1 block w-full bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md"/>
             </div>
            <div className="text-right">
              <button type="submit" disabled={isLoading} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400">
                <BellIcon className="w-5 h-5 mr-2" />
                {isLoading ? 'Creating...' : 'Create Notification'}
              </button>
            </div>
          </form>
           {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
           {feedback && <p className="text-green-500 mt-4 text-sm">{feedback}</p>}
        </div>

        {/* Existing Notices */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Active & Inactive Notifications</h2>
            <div className="space-y-3">
                {notices.length > 0 ? (
                    notices.map(notice => (
                        <div key={notice._id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                            <div>
                                <p className="font-semibold">{notice.title}</p>
                                <p className="text-sm text-slate-500">{notice.description}</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                 <label className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input type="checkbox" className="sr-only" checked={notice.isActive} onChange={() => handleToggleActive(notice)} />
                                        <div className={`block w-10 h-6 rounded-full ${notice.isActive ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${notice.isActive ? 'translate-x-4' : ''}`}></div>
                                    </div>
                                </label>
                                <button onClick={() => handleDelete(notice._id)} className="text-slate-400 hover:text-red-500">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                   <p className="text-slate-500">No notifications found.</p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}