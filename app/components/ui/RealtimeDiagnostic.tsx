'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function RealtimeDiagnostic() {
  const [status, setStatus] = useState<string>('Not connected');
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Test basic channel subscription
    const testChannel = supabase
      .channel('test-channel')
      .on('broadcast', { event: 'test' }, (payload) => {
        console.log('Received test broadcast:', payload);
      })
      .subscribe((status, err) => {
        setStatus(status);
        if (err) {
          setError(err.message || 'Unknown error');
          console.error('Realtime subscription error:', err);
        }
      });

    return () => {
      testChannel.unsubscribe();
    };
  }, [supabase]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-surface-container rounded-lg shadow-lg text-xs">
      <div className="font-semibold mb-1">Realtime Status</div>
      <div className={`${status === 'SUBSCRIBED' ? 'text-green-600' : 'text-amber-600'}`}>
        {status}
      </div>
      {error && (
        <div className="text-red-600 mt-1">
          Error: {error}
        </div>
      )}
    </div>
  );
}