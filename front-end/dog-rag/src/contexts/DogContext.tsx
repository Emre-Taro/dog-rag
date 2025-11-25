'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DogProfile } from '@/types';
import { useAuth, getAuthHeaders } from '@/contexts/AuthContext';

interface DogContextType {
  selectedDogId: number | null;
  selectedDog: DogProfile | null;
  dogs: DogProfile[];
  setSelectedDogId: (id: number | null) => void;
  refreshDogs: () => Promise<void>;
}

const DogContext = createContext<DogContextType | undefined>(undefined);

const SELECTED_DOG_ID_KEY = 'selectedDogId';

export function DogProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage if available
  const [selectedDogId, setSelectedDogIdState] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SELECTED_DOG_ID_KEY);
      if (saved) {
        const id = parseInt(saved, 10);
        if (!isNaN(id)) {
          return id;
        }
      }
    }
    return null;
  });
  const [selectedDog, setSelectedDog] = useState<DogProfile | null>(null);
  const [dogs, setDogs] = useState<DogProfile[]>([]);

  // Wrapper to save to localStorage when dog ID changes
  const setSelectedDogId = (id: number | null) => {
    setSelectedDogIdState(id);
    if (typeof window !== 'undefined') {
      if (id !== null) {
        localStorage.setItem(SELECTED_DOG_ID_KEY, String(id));
      } else {
        localStorage.removeItem(SELECTED_DOG_ID_KEY);
      }
    }
  };

  const { token } = useAuth();

  const fetchDogs = async () => {
    try {
      if (!token) {
        console.log('[DogContext] No token available, skipping fetch');
        setDogs([]);
        return;
      }
      const response = await fetch('/api/dogs', {
        headers: getAuthHeaders(token),
      });
      const result = await response.json();
      
      if (!response.ok) {
        console.error('[DogContext] Failed to fetch dogs:', result.error);
        setDogs([]);
        return;
      }
      if (result.success && result.data) {
        setDogs(result.data);
        
        // Try to restore saved dog ID, or select first dog if none saved
        if (result.data.length > 0) {
          if (selectedDogId) {
            // Check if saved dog ID still exists in the list
            const savedDog = result.data.find((d: DogProfile) => d.id === selectedDogId);
            if (savedDog) {
              // Restore saved dog
              setSelectedDog(savedDog);
            } else {
              // Saved dog no longer exists, select first dog
              console.log(`[DogContext] Saved dog ID ${selectedDogId} not found, selecting first dog`);
              setSelectedDogId(result.data[0].id);
              setSelectedDog(result.data[0]);
            }
          } else {
            // No saved dog ID, select first dog
            setSelectedDogId(result.data[0].id);
            setSelectedDog(result.data[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dogs:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDogs();
    } else {
      setDogs([]);
      setSelectedDog(null);
      setSelectedDogId(null);
    }
  }, [token]);

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

