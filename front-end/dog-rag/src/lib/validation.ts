// Data validation utilities

import { LogType, LogData } from '@/types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Validate date is not in the future
export function validateNotFutureDate(date: Date): void {
  const now = new Date();
  if (date > now) {
    throw new ValidationError('Date cannot be in the future');
  }
}

// Validate number range
export function validateRange(value: number, min: number, max: number, field: string): void {
  if (value < min || value > max) {
    throw new ValidationError(`${field} must be between ${min} and ${max}`);
  }
}

// Validate string length
export function validateStringLength(value: string, maxLength: number, field: string): void {
  if (value.length > maxLength) {
    throw new ValidationError(`${field} must be less than ${maxLength} characters`);
  }
}

// Validate required fields
export function validateRequired(value: any, field: string): void {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${field} is required`);
  }
}

// Validate log data based on type
export function validateLogData(logType: LogType, logData: any): void {
  switch (logType) {
    case 'toilet':
      validateRequired(logData.type, 'Type');
      if (!['ONE', 'TWO', 'BOTH'].includes(logData.type)) {
        throw new ValidationError('Type must be ONE (urination), TWO (defecation), or BOTH');
      }
      validateNotFutureDate(new Date(logData.time));
      validateRequired(logData.success, 'Success');
      validateRequired(logData.health, 'Health');
      if (!['NORMAL', 'SOFT', 'HARD', 'BLOODY', 'OTHER'].includes(logData.health)) {
        throw new ValidationError('Health must be NORMAL, SOFT, HARD, BLOODY, or OTHER');
      }
      if (logData.comment) {
        validateStringLength(logData.comment, 500, 'Comment');
      }
      break;

    case 'food':
      // Support both old and new field names for backward compatibility
      const mealType = logData.mealType || logData.meal_type;
      const amountGrams = logData.amountGrams || logData.amount;
      const eatenAmount = logData.eatenAmount || logData.completion;
      
      validateRequired(mealType, 'Meal type');
      if (!['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].includes(mealType)) {
        throw new ValidationError('Meal type must be BREAKFAST, LUNCH, DINNER, or SNACK');
      }
      if (amountGrams !== undefined && amountGrams !== null) {
        validateRange(amountGrams, 0, 10000, 'Amount (grams)');
      }
      if (logData.time) {
        validateNotFutureDate(new Date(logData.time));
      }
      if (eatenAmount !== undefined && eatenAmount !== null) {
        // Support both old lowercase and new uppercase enum values
        const validValues = ['ALL', 'HALF', 'LITTLE', 'all', 'half', 'little'];
        if (!validValues.includes(eatenAmount)) {
          throw new ValidationError('Eaten amount must be ALL, HALF, LITTLE (or all, half, little)');
        }
      }
      if (logData.comment) {
        validateStringLength(logData.comment, 500, 'Comment');
      }
      break;

    case 'sleep':
      // Support both old and new field names
      const durationMinutes = logData.durationMinutes || logData.duration;
      validateRequired(durationMinutes, 'Duration');
      validateRange(durationMinutes, 0, 1440, 'Duration (minutes)');
      if (logData.startedAt) {
        validateNotFutureDate(new Date(logData.startedAt));
      }
      if (logData.comment) {
        validateStringLength(logData.comment, 500, 'Comment');
      }
      break;

    case 'walk':
      validateRequired(logData.minutes, 'Minutes');
      validateRange(logData.minutes, 0, 600, 'Minutes');
      // Support both old and new field names
      const distanceKm = logData.distanceKm || logData.distance;
      if (distanceKm !== undefined && distanceKm !== null) {
        validateRange(distanceKm, 0, 100, 'Distance (km)');
      }
      if (logData.startedAt) {
        validateNotFutureDate(new Date(logData.startedAt));
      }
      if (logData.comment) {
        validateStringLength(logData.comment, 500, 'Comment');
      }
      break;

    case 'play':
      validateRequired(logData.minutes, 'Minutes');
      validateRange(logData.minutes, 0, 600, 'Minutes');
      validateRequired(logData.playType, 'Play type');
      if (!['RUN', 'PULL', 'CUDDLE', 'LICK', 'OTHER'].includes(logData.playType)) {
        throw new ValidationError('Play type must be RUN, PULL, CUDDLE, LICK, or OTHER');
      }
      if (logData.startedAt) {
        validateNotFutureDate(new Date(logData.startedAt));
      }
      if (logData.comment) {
        validateStringLength(logData.comment, 500, 'Comment');
      }
      break;

    case 'bark':
      validateNotFutureDate(new Date(logData.time));
      // period is optional in DB
      if (logData.period) {
        // Support both old lowercase and new enum values (need to check actual enum values)
        const validPeriods = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'MIDNIGHT', 'morning', 'afternoon', 'evening', 'night', 'midnight'];
        if (!validPeriods.includes(logData.period)) {
          throw new ValidationError('Period must be a valid DayPeriod value');
        }
      }
      // Support both old and new field names
      const difficulty = logData.difficulty || logData.calm_down_difficulty;
      validateRequired(difficulty, 'Difficulty');
      validateRange(difficulty, 1, 5, 'Difficulty');
      break;

    case 'custom':
      validateRequired(logData.title, 'Title');
      validateRequired(logData.content, 'Content');
      if (logData.loggedAt) {
        validateNotFutureDate(new Date(logData.loggedAt));
      }
      break;

    case 'medication':
      validateRequired(logData.medication_name, 'Medication name');
      validateStringLength(logData.medication_name, 200, 'Medication name');
      break;

    case 'consultation':
      if (logData.veterinarian) {
        validateStringLength(logData.veterinarian, 200, 'Veterinarian');
      }
      if (logData.diagnosis) {
        validateStringLength(logData.diagnosis, 500, 'Diagnosis');
      }
      break;
  }
}

// Validate dog profile
export function validateDogProfile(data: any): void {
  // Accept both camelCase (from frontend) and snake_case (legacy)
  const dogName = data.dogName || data.dog_name;
  const stageOfTraining = data.stageOfTraining || data.stage_of_training;
  
  validateRequired(dogName, 'Dog name');
  validateStringLength(dogName, 100, 'Dog name');
  
  // Age, height, weight are optional in the database (nullable)
  if (data.age !== undefined && data.age !== null && !isNaN(Number(data.age))) {
    validateRange(Number(data.age), 0, 600, 'Age (months)');
  }
  if (data.height !== undefined && data.height !== null && !isNaN(Number(data.height))) {
    validateRange(Number(data.height), 0, 200, 'Height (cm)');
  }
  if (data.weight !== undefined && data.weight !== null && !isNaN(Number(data.weight))) {
    validateRange(Number(data.weight), 0, 200, 'Weight (kg)');
  }
  
  // Breed is optional in database
  if (data.breed) {
    validateStringLength(data.breed, 100, 'Breed');
  }
  
  if (data.personality) {
    validateStringLength(data.personality, 1000, 'Personality');
  }
  
  // stageOfTraining is required in database
  validateRequired(stageOfTraining, 'Stage of training');
  if (stageOfTraining) {
    validateStringLength(stageOfTraining, 200, 'Stage of training');
  }
}

