'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DogProfile } from '@/types';
import { FIXED_USER_ID } from '@/lib/constants';

interface DogContextType {
  selectedDogId: number | null;
  selectedDog: DogProfile | null;
  dogs: DogProfile[];
  setSelectedDogId: (id: number | null) => void;
  refreshDogs: () => Promise<void>;
}

const DogContext = createContext<DogContextType | undefined>(undefined);

export function DogProvider({ children }: { children: ReactNode }) {
  const [selectedDogId, setSelectedDogId] = useState<number | null>(null);
  const [selectedDog, setSelectedDog] = useState<DogProfile | null>(null);
  const [dogs, setDogs] = useState<DogProfile[]>([]);

  const fetchDogs = async () => {
    try {
      // TODO: Get user_id from authentication/session
      const response = await fetch(`/api/dogs?user_id=${FIXED_USER_ID}`);
      const result = await response.json();
      if (result.success && result.data) {
        setDogs(result.data);
        // Auto-select first dog if available and none selected
        if (result.data.length > 0 && !selectedDogId) {
          setSelectedDogId(result.data[0].id);
          setSelectedDog(result.data[0]);
        } else if (selectedDogId) {
          // Update selected dog if it exists in the list
          const dog = result.data.find((d: DogProfile) => d.id === selectedDogId);
          if (dog) {
            setSelectedDog(dog);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dogs:', error);
    }
  };

  useEffect(() => {
    fetchDogs();
  }, []);

  useEffect(() => {
    if (selectedDogId) {
      const dog = dogs.find((d) => d.id === selectedDogId);
      setSelectedDog(dog || null);
    } else {
      setSelectedDog(null);
    }
  }, [selectedDogId, dogs]);

  return (
    <DogContext.Provider
      value={{
        selectedDogId,
        selectedDog,
        dogs,
        setSelectedDogId,
        refreshDogs: fetchDogs,
      }}
    >
      {children}
    </DogContext.Provider>
  );
}

export function useDog() {
  const context = useContext(DogContext);
  if (context === undefined) {
    throw new Error('useDog must be used within a DogProvider');
  }
  return context;
}

