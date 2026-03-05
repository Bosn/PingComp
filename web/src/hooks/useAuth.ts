import { useEffect, useState } from 'react';

export function useAuth() {
  const [me, setMe] = useState<{ name?: string; email?: string; picture?: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(j => setMe(j?.user || null))
      .catch(() => setMe(null));
  }, []);

  return { me };
}
