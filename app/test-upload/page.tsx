'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/app/context/AuthContext';

export default function TestUpload() {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const testUpload = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setStatus('Testing...');
    setError('');

    try {
      // Test 1: Check if bucket exists
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        setError(`Failed to list buckets: ${bucketsError.message}`);
        return;
      }

      const postImagesBucket = buckets?.find(b => b.id === 'post-images');
      
      if (!postImagesBucket) {
        setError('post-images bucket does not exist. Please create it in Supabase Dashboard.');
        return;
      }

      setStatus(`Bucket exists: ${postImagesBucket.name}`);

      // Test 2: Try to upload a test file
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });
      
      const fileName = `${user.id}/test-${Date.now()}.txt`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, testFile);

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        return;
      }

      setStatus(`Upload successful! File: ${uploadData.path}`);

      // Test 3: Try to get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      setStatus(`Success! Public URL: ${publicUrl}`);

      // Clean up test file
      await supabase.storage
        .from('post-images')
        .remove([fileName]);

    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Storage Test</h1>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">User ID: {user?.id || 'Not authenticated'}</p>
        </div>

        <button
          onClick={testUpload}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={!user}
        >
          Test Storage Upload
        </button>

        {status && (
          <div className="p-4 bg-green-100 text-green-800 rounded">
            {status}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-100 text-red-800 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}