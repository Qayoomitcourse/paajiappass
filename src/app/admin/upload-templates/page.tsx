// app/admin/upload-templates/page.tsx
'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowUpOnSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

// Define the Template type and a specific type for the category
type TemplateCategory = 'cargo' | 'landside' | 'general';

interface Template {
  _id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  fileName: string;
  fileUrl: string;
  isRequired: boolean;
  displayOrder: number;
}

// Type guard to validate the category from URL params
const isValidCategory = (value: string | null): value is TemplateCategory => {
  return value === 'cargo' || value === 'landside' || value === 'general';
};

// Loading component
function UploadTemplatesLoading() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400">Loading templates...</p>
      </div>
    </div>
  );
}

// Main component that uses useSearchParams
function UploadTemplatesContent() {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get('type');
  const initialCategory: TemplateCategory = isValidCategory(urlCategory) ? urlCategory : 'general';

  const [templates, setTemplates] = useState<Template[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TemplateCategory>(initialCategory);
  const [file, setFile] = useState<File | null>(null);
  const [isRequired, setIsRequired] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data.templates);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      setError('Title and file are required.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setFeedback(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('isRequired', String(isRequired));
    formData.append('displayOrder', String(displayOrder));

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to upload template');
      }

      setFeedback('Template uploaded successfully!');
      // Reset form
      setTitle('');
      setDescription('');
      setFile(null);
      setIsRequired(false);
      setDisplayOrder(10);
      
      // Refresh list
      fetchTemplates();

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/templates?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete template');
      
      setFeedback('Template deleted successfully.');
      setTemplates(templates.filter(t => t._id !== id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTemplates = templates.filter(t => t.category === category);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6">Manage Document Templates</h1>

        {/* Upload Form */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Upload New Template</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Form fields */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Title</label>
              <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"/>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium">Description</label>
              <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1 block w-full bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"></textarea>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium">Category</label>
              <select id="category" value={category} onChange={e => setCategory(e.target.value as TemplateCategory)} className="mt-1 block w-full bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500">
                <option value="general">General</option>
                <option value="cargo">Cargo</option>
                <option value="landside">Landside</option>
              </select>
            </div>
             <div>
              <label htmlFor="displayOrder" className="block text-sm font-medium">Display Order</label>
              <input type="number" id="displayOrder" value={displayOrder} onChange={e => setDisplayOrder(Number(e.target.value))} className="mt-1 block w-full bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm"/>
            </div>
            <div className="flex items-center">
              <input id="isRequired" type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} className="h-4 w-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500"/>
              <label htmlFor="isRequired" className="ml-2 block text-sm">Is this document required?</label>
            </div>
            <div>
              <label htmlFor="file" className="block text-sm font-medium">File (PDF, DOCX)</label>
              <input type="file" id="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"/>
            </div>
            <div className="text-right">
              <button type="submit" disabled={isLoading} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400">
                <ArrowUpOnSquareIcon className="w-5 h-5 mr-2" />
                {isLoading ? 'Uploading...' : 'Upload Template'}
              </button>
            </div>
          </form>
          {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
          {feedback && <p className="text-green-500 mt-4 text-sm">{feedback}</p>}
        </div>

        {/* Existing Templates List */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
           <h2 className="text-xl font-semibold mb-4">Existing Templates</h2>
            <div className="border-b border-slate-200 dark:border-slate-700 mb-4">
                <nav className="-mb-px flex space-x-6">
                    {(['general', 'cargo', 'landside'] as const).map(cat => (
                         <button key={cat} onClick={() => setCategory(cat)} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm capitalize ${category === cat ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                           {cat}
                         </button>
                    ))}
                </nav>
            </div>

            {isLoading && !templates.length ? <p>Loading templates...</p> : null}
            <div className="space-y-3">
              {filteredTemplates.length > 0 ? (
                filteredTemplates
                  .sort((a,b) => a.displayOrder - b.displayOrder)
                  .map(template => (
                    <div key={template._id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                      <div>
                        <a href={template.fileUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-600 hover:underline">{template.title}</a>
                        <p className="text-sm text-slate-500">{template.fileName}</p>
                         {template.isRequired && <span className="text-xs text-red-500 font-bold">Required</span>}
                      </div>
                      <button onClick={() => handleDelete(template._id)} className="text-slate-400 hover:text-red-500">
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-4">No templates found for this category.</p>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense
export default function UploadTemplatesPage() {
  return (
    <Suspense fallback={<UploadTemplatesLoading />}>
      <UploadTemplatesContent />
    </Suspense>
  );
}