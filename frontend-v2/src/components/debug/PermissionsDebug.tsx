import React from 'react';
import { useSession } from 'next-auth/react';

export function PermissionsDebug() {
  const { data: session, status } = useSession();
  const user = (session as any)?.user;

  if (process.env.NODE_ENV !== 'production') {
    return (
      <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
        <h3 className="font-bold mb-2">Debug: Session & User</h3>
        
        <div className="space-y-2">
          <div>
            <strong>Status:</strong> {status}
          </div>
          
          <div>
            <strong>User:</strong>
            <pre className="text-xs overflow-auto max-h-20">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
          
          <div>
            <strong>Full Session:</strong>
            <pre className="text-xs overflow-auto max-h-32">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return null;
}