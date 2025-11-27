'use client';

import { useState, useEffect } from 'react';
import { useDog } from '@/contexts/DogContext';
import { useAuth, getAuthHeaders } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { DogProfile } from '@/types';
import Link from 'next/link';

export function DogProfilePage() {
  const { dogs, refreshDogs, selectedDogId, setSelectedDogId } = useDog();
  const { token } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingDog, setEditingDog] = useState<DogProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshDogs();
  }, []);

  const handleDelete = async (dogId: number) => {
    if (!confirm('Are you sure you want to delete this pet profile?')) return;

    try {
      const response = await fetch(`/api/dogs/${dogId.toString()}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });
      const result = await response.json();

      if (result.success) {
        await refreshDogs();
        if (selectedDogId === dogId) {
          if (dogs.length > 1) {
            const otherDog = dogs.find((d) => d.id !== dogId);
            if (otherDog) setSelectedDogId(otherDog.id);
            else setSelectedDogId(null);
          } else {
            setSelectedDogId(null);
          }
        }
      } else {
        alert('Failed to delete: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting dog:', error);
      alert('An error occurred while deleting');
    }
  };

  const formatAge = (months: number): string => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years === 0) return `${remainingMonths} months`;
    if (remainingMonths === 0) return `${years} years`;
    return `${years} years ${remainingMonths} months`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pet Management</h1>
          <p className="text-sm text-slate-400">Manage your pet information</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <select
            value={selectedDogId || ''}
            onChange={(e) => setSelectedDogId(e.target.value ? parseInt(e.target.value) : null)}
            className="rounded-lg bg-slate-900 px-3 py-2 text-slate-200"
          >
            <option value="">All Pets</option>
            {dogs.map((dog) => (
              <option key={dog.id} value={dog.id}>
                {dog.dogName}
              </option>
            ))}
          </select>
          <Button
            onClick={() => {
              setEditingDog(null);
              setShowForm(true);
            }}
          >
            ＋ Add Pet
          </Button>
        </div>
      </div>

      {dogs.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 p-12 text-center text-slate-400">
          <p className="mb-4">No pet profiles</p>
          <Button onClick={() => setShowForm(true)}>Add a pet</Button>
        </div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-3">
          {dogs.map((dog) => (
            <article
              key={dog.id}
              className="rounded-2xl bg-slate-900 p-5 text-xs"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-2xl">
                    🐕
                  </div>
                  <div>
                    <div className="text-base font-semibold text-slate-50">{dog.dogName}</div>
                    <div className="text-[11px] text-slate-400">{dog.breed || ''}</div>
                  </div>
                </div>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] text-blue-300">
                  {dog.stageOfTraining === 'PUPPY' ? 'Puppy' :
                   dog.stageOfTraining === 'BASIC' ? 'Basic Training' :
                   dog.stageOfTraining === 'INTERMEDIATE' ? 'Intermediate Training' :
                   dog.stageOfTraining === 'ADVANCED' ? 'Advanced Training' :
                   dog.stageOfTraining === 'OTHER' ? 'Other' :
                   dog.stageOfTraining}
                </span>
              </div>

              <dl className="space-y-2 text-[11px]">
                {dog.gender && (
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Gender</dt>
                    <dd className="text-slate-100">{dog.gender === 'MALE' ? 'Male' : dog.gender === 'FEMALE' ? 'Female' : dog.gender}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-slate-400">Age</dt>
                  <dd className="text-slate-100">{dog.age ? formatAge(dog.age) : 'N/A'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Weight</dt>
                  <dd className="text-slate-100">{dog.weight ?? 'N/A'} kg</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Height</dt>
                  <dd className="text-slate-100">{dog.height ?? 'N/A'} cm</dd>
                </div>
                {dog.personality && (
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Personality</dt>
                    <dd className="text-slate-100 truncate max-w-[150px]" title={dog.personality}>
                      {dog.personality}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setEditingDog(dog);
                    setShowForm(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 text-red-400 hover:text-red-300"
                  onClick={() => handleDelete(dog.id)}
                >
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* 新規/編集フォーム */}
      {showForm && (
        <DogProfileForm
          dog={editingDog}
          onClose={() => {
            setShowForm(false);
            setEditingDog(null);
          }}
          onSuccess={async () => {
            await refreshDogs();
            setShowForm(false);
            setEditingDog(null);
          }}
        />
      )}
    </div>
  );
}

function DogProfileForm({
  dog,
  onClose,
  onSuccess,
}: {
  dog: DogProfile | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    dogName: dog?.dogName || '',
    gender: dog?.gender || '',
    age: dog?.age ?? 0,
    height: dog?.height ?? null,
    weight: dog?.weight ?? null,
    breed: dog?.breed || '',
    personality: dog?.personality || '',
    stageOfTraining: dog?.stageOfTraining || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = dog ? `/api/dogs/${dog.id}` : '/api/dogs';
      const method = dog ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(token),
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Failed to save');
      }
    } catch (err) {
      setError('An error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 text-slate-100">
        <h2 className="mb-4 text-lg font-semibold">{dog ? 'Edit' : 'Add New Pet'}</h2>
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">Name *</label>
            <input
              type="text"
              value={formData.dogName}
              onChange={(e) => setFormData({ ...formData, dogName: e.target.value })}
              className="w-full rounded-lg bg-slate-800 px-3 py-2"
              required
              maxLength={100}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full rounded-lg bg-slate-800 px-3 py-2"
            >
              <option value="">Please select</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Age (months) *</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
              className="w-full rounded-lg bg-slate-800 px-3 py-2"
              min="0"
              max="600"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Weight (kg) *</label>
            <input
              type="number"
              step="0.1"
              value={formData.weight ?? ''}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value === '' ? null : parseFloat(e.target.value) || null })}
              className="w-full rounded-lg bg-slate-800 px-3 py-2"
              min="0"
              max="200"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Height (cm) *</label>
            <input
              type="number"
              step="0.1"
              value={formData.height ?? ''}
              onChange={(e) => setFormData({ ...formData, height: e.target.value === '' ? null : parseFloat(e.target.value) || null })}
              className="w-full rounded-lg bg-slate-800 px-3 py-2"
              min="0"
              max="200"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Breed *</label>
            <input
              type="text"
              value={formData.breed}
              onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
              className="w-full rounded-lg bg-slate-800 px-3 py-2"
              required
              maxLength={100}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Personality</label>
            <textarea
              value={formData.personality}
              onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
              className="w-full rounded-lg bg-slate-800 px-3 py-2"
              rows={3}
              maxLength={1000}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Training Stage *</label>
            <select
              value={formData.stageOfTraining}
              onChange={(e) => setFormData({ ...formData, stageOfTraining: e.target.value })}
              className="w-full rounded-lg bg-slate-800 px-3 py-2"
              required
            >
              <option value="">Please select</option>
              <option value="PUPPY">Puppy</option>
              <option value="BASIC">Basic Training</option>
              <option value="INTERMEDIATE">Intermediate Training</option>
              <option value="ADVANCED">Advanced Training</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : 'Save'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
