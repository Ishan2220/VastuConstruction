import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export default function SupportEntryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setPresentation } = useAuthStore();
  const [status, setStatus] = useState('Verifying presentation code...');

  useEffect(() => {
    const exchangeCode = searchParams.get('code');
    
    if (!exchangeCode) {
      setStatus('No exchange code provided.');
      return;
    }

    // Remove code from URL immediately for security
    setSearchParams({});

    const exchange = async () => {
      try {
        const res = await fetch('/api/support/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exchangeCode })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.message || 'Failed to exchange code');
        }

        // Successfully exchanged, cookie is set.
        // Save presentation state
        setPresentation({
          reason: data.data.reason,
          expiresAt: data.data.expiresAt
        });

        // Set the auth token and user in zustand store
        // This gives the SUPER_ADMIN frontend access
        useAuthStore.getState().setAuth(data.data.accessToken, data.data.user);

        toast.success('Presentation Mode Active');
        
        navigate('/');
      } catch (err: any) {
        setStatus(`Error: ${err.message}`);
      }
    };

    exchange();
  }, [searchParams, setSearchParams, navigate, setPresentation]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Presentation Access</h1>
        <p className="text-slate-400">{status}</p>
      </div>
    </div>
  );
}
