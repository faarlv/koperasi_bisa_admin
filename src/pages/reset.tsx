'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSearchParams } from 'react-router-dom';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const handlePasswordReset = async () => {
    if (newPassword !== confirmPassword) {
      setMessage("Passwords don't match!");
      return;
    }

    if (!token) {
      setMessage('Invalid reset link');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.api.updateUserByEmail(token, {
      password: newPassword,
    });

    if (error) {
      setMessage('Reset failed: ' + error.message);
    } else {
      setMessage('Password reset successfully! You can now log in.');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-md mx-auto p-6">
      <h2 className="text-3xl font-bold tracking-tight text-center">Reset Your Password</h2>
      
      <div>
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter your new password"
        />
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your new password"
        />
      </div>

      <Button
        onClick={handlePasswordReset}
        className="w-full"
        disabled={loading}
      >
        {loading ? 'Resetting...' : 'Reset Password'}
      </Button>

      {message && (
        <p className="mt-4 text-center text-sm text-red-500">{message}</p>
      )}
    </div>
  );
}
