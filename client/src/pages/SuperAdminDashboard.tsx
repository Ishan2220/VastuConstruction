import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function SuperAdminDashboard() {
  const [reason, setReason] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [loading, setLoading] = useState(false);
  const [exchangeCode, setExchangeCode] = useState<string | null>(null);

  const startSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Reason is mandatory');
      return;
    }
    
    setLoading(true);
    try {
      // NOTE: Using a normal fetch because we need to hit the api
      // using the super admin's auth token, which the api client should handle if it sends cookies/headers
      // Let's assume we have our standard api client or just fetch
      const res = await fetch('/api/support/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vastu-auth-token') ? JSON.parse(localStorage.getItem('vastu-auth-token') || '{}').state?.accessToken : ''}`
        },
        body: JSON.stringify({ reason, durationMinutes: parseInt(durationMinutes) })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start session');
      
      setExchangeCode(data.data.exchangeCode);
      toast.success('Presentation session started!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Super Admin Dashboard</CardTitle>
          <CardDescription>Vastu Construction ERP Presentation Mode</CardDescription>
        </CardHeader>
        <CardContent>
          {!exchangeCode ? (
            <form onSubmit={startSession} className="space-y-4">
              <div className="space-y-2">
                <Label>Reason for Presentation</Label>
                <Input 
                  value={reason} 
                  onChange={e => setReason(e.target.value)} 
                  placeholder="e.g. Client presentation"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (Minutes, Max 60)</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="60"
                  value={durationMinutes} 
                  onChange={e => setDurationMinutes(e.target.value)} 
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Starting...' : 'Start Presentation Session'}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-100 p-4 rounded-md font-mono text-center text-lg font-semibold break-all">
                {exchangeCode}
              </div>
              <div className="flex gap-4">
                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText(exchangeCode);
                    toast.success('Copied to clipboard');
                  }}
                >
                  Copy Code
                </Button>
                <Button 
                  variant="default"
                  onClick={() => {
                    // Open in new tab or navigate
                    window.open(`/support-entry?code=${exchangeCode}`, '_blank');
                  }}
                >
                  Open Vastu ERP
                </Button>
                <Button variant="outline" onClick={() => setExchangeCode(null)}>
                  Start Another
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
