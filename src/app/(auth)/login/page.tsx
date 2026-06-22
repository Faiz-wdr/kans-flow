'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { clientAuth } from '@/lib/supabase/auth-client';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'suspended') {
        setErrorMsg('Your account has been suspended. Please contact management.');
        clientAuth.signOut();
      }
    }
  }, []);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setErrorMsg(null);
    const { error } = await clientAuth.signIn(data.email, data.password);
    
    if (error) {
      setErrorMsg(error.message);
    } else {
      router.refresh();
      router.push('/dashboard');
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sign in to your KANs Flow workspace dashboard.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="name@workspace.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
          </div>
          <input
            id="password"
            type="password"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="••••••••"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_MOCK_LOGIN === 'true') && (
        <div className="mt-6 border-t border-border pt-4 text-center">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">
            Dev Quick Sign-in Bypass
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs border-primary/20 hover:border-primary/50 text-foreground"
              onClick={async () => {
                await clientAuth.signIn('admin@kansflow.com', 'password123');
                router.refresh();
                router.push('/dashboard');
              }}
            >
              Sign In as Admin
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs border-primary/20 hover:border-primary/50 text-foreground"
              onClick={async () => {
                await clientAuth.signIn('staff@kansflow.com', 'password123');
                router.refresh();
                router.push('/dashboard');
              }}
            >
              Sign In as Staff
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
