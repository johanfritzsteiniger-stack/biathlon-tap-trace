import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Target } from 'lucide-react';

const Login = () => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && user) {
      // Weiterleitung basierend auf Rolle
      if (user.role === 'admin') {
        navigate('/');
      } else if (user.role === 'athlete') {
        navigate('/athlete-dashboard');
      }
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !password) {
      toast({
        variant: 'destructive',
        description: 'Bitte Name und Passwort eingeben',
      });
      return;
    }

    setLoading(true);
    const { error } = await login(name.trim(), password);
    setLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        description: error,
      });
    } else {
      toast({
        description: 'Erfolgreich angemeldet',
      });
      // Navigation erfolgt durch useEffect basierend auf Rolle
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Biathlon Training</h1>
          <p className="text-muted-foreground mt-2">Anmelden mit Name und Passwort</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dein Name"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-teal text-teal-foreground hover:bg-teal/90"
            disabled={loading}
          >
            {loading ? 'Wird angemeldet...' : 'Anmelden'}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Standard Admin-Login: Admin / admin123
        </p>
      </Card>
    </div>
  );
};

export default Login;
