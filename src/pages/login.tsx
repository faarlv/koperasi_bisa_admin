import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PiggyBank } from 'lucide-react';

export default function Login({ setIsAuthenticated }: { setIsAuthenticated: (auth: boolean) => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (email === "admin@example.com" && password === "admin123") {
            setIsAuthenticated(true); // Update auth state
            navigate('/');
        } else {
            alert("Invalid email or password");
        }
    };

    return (
        <div className="h-screen flex items-center justify-center bg-background w-full">
            <Card className="w-[500px]">
                <CardHeader className="space-y-2 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <PiggyBank className="h-8 w-8 text-primary" />
                        <CardTitle className="text-2xl">Koperasi Admin</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Enter your credentials to access the admin dashboard
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@example.com"
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
