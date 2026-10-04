'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function PetRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  useEffect(() => {
    if (id) {
      router.replace(`/dashboard/pets/${id}/profile`);
    }
  }, [id, router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-gray-500">Przekierowanie...</div>
    </div>
  );
}
