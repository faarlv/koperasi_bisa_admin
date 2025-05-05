import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { createClient } from '@supabase/supabase-js';

export default function Login({ setIsAuthenticated }: { setIsAuthenticated: (auth: boolean) => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL!,
        import.meta.env.VITE_SUPABASE_ANON_KEY!
      );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error || !data.user) {
            alert('Login failed: ' + error?.message);
            return;
        }

        if (data.user.email !== 'admin@gmail.com' && data.user.email !== 'admin@smkn2.oke') {
            alert('Access denied: You are not an admin');
            return;
        }

        setIsAuthenticated(true);
        navigate('/');
    };

    return (
        <div className="h-screen flex items-center justify-center bg-background w-full">
            <Card className="w-[500px]">
                <CardHeader className="space-y-2 text-center flex flex-col items-center">
                    <img src="https://rjfqtggfziqjtqwwwzcl.supabase.co/storage/v1/object/public/profile-photos/profile-photos/logo_koperasi.png" alt="" className='w-20 h-20' />
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <CardTitle className="text-2xl">Dashboard Koperasi</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        silahkan masukan akun admin
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full">
                            Sign In
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
