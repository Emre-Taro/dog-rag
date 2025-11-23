// User Types
export interface User {
  id: string;
  user_name: string;
  email: string;
  hashed_password: string;
  created_at: Date;
  updated_at: Date;
}

// Dog Profile Types
export type TrainingStage =
  | 'PUPPY'
  | 'BASIC'
  | 'INTERMEDIATE'
  | 'ADVANCED'
  | 'OTHER';

export interface DogProfile {
  id: number;
  ownerId: number;
  dogName: string;
  gender: string; // MALE or FEMALE
  age: number | null; // in months
  height: number | null; // in cm
  weight: number | null; // in kg
  breed: string | null;
  personality: string | null;
  stageOfTraining: TrainingStage; // NOT NULL in database
  createdAt: Date;
  updatedAt: Date;
}

// Dog Log Types
export type LogType = 'toilet' | 'food' | 'sleep' | 'walk' | 'play' | 'bark' | 'custom' | 'medication' | 'consultation';

export type ToiletType = 'ONE' | 'TWO' | 'BOTH';

export type ToiletHealth = 'NORMAL' | 'SOFT' | 'HARD' | 'BLOODY' | 'OTHER';

export interface ToiletLog {
  type: ToiletType; // ONE = urination, TWO = defecation, BOTH = both
  time: Date;
  success: boolean;
  health: ToiletHealth;
  comment?: string;
}

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export type EatenAmount = 'ALL' | 'HALF' | 'LITTLE'; // 後でenum値を確認して調整

export interface FoodLog {
  mealType: MealType;
  amountGrams?: number; // in grams (nullable in DB)
  time: Date;
  eatenAmount?: EatenAmount; // nullable in DB
  comment?: string;
}

export interface SleepLog {
  durationMinutes: number; // in minutes
  startedAt?: Date;
  comment?: string;
}

export interface WalkLog {
  minutes: number;
  distanceKm?: number; // in km (nullable in DB)
  weather?: string; // Weather enum (nullable in DB)
  startedAt?: Date;
  comment?: string;
}

export type PlayType = 'RUN' | 'PULL' | 'CUDDLE' | 'LICK' | 'OTHER';

export interface PlayLog {
  minutes: number;
  playType: PlayType;
  startedAt?: Date;
  comment?: string;
}

export interface BarkLog {
  time: Date;
  period?: string; // DayPeriod enum (nullable in DB)
  before?: string; // what happened before
  after?: string; // what happened after
  difficulty: number; // how hard it was to calm down (1-5)
}

export interface CustomLog {
  title: string;
  content: string;
  loggedAt?: Date;
}

export type LogData = 
  | ({ log_type: 'toilet' } & ToiletLog)
  | ({ log_type: 'food' } & FoodLog)
  | ({ log_type: 'sleep' } & SleepLog)
  | ({ log_type: 'walk' } & WalkLog)
  | ({ log_type: 'play' } & PlayLog)
  | ({ log_type: 'bark' } & BarkLog)
  | ({ log_type: 'custom' } & CustomLog)
  | ({ log_type: 'medication'; medication_name: string; amount?: string; method?: string; comment?: string })
  | ({ log_type: 'consultation'; veterinarian?: string; diagnosis?: string; treatment?: string; next_date?: Date; comment?: string });

export interface DogLog {
  id: string;
  dogId: string;
  userId: string;
  log_type: LogType;
  log_data: LogData;
  created_at: Date;
  updated_at: Date;
}

// Weekly and Daily Comments
export interface WeeklyComment {
  id: string;
  dog_id: string;
  user_id: string;
  week_start_date: Date;
  comment: string;
  created_at: Date;
  updated_at: Date;
}

export interface DailyComment {
  id: string;
  dog_id: string;
  user_id: string;
  date: Date;
  comment: string;
  created_at: Date;
  updated_at: Date;
}

// Dashboard Types
export interface DashboardStats {
  total_records: number;
  average_walk_time: number;
  meal_completion_rate: number;
  anomaly_detections: number;
  period_comparison?: {
    records_change: number; // percentage
    walk_time_change: number;
    meal_rate_change: number;
  };
}

export interface ActivityRecord {
  date: string;
  count: number;
  types: { [key: string]: number };
}

export interface HealthIndicator {
  date: string;
  weight?: number;
  temperature?: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Filter and Search Types
export interface LogFilter {
  log_type?: LogType;
  start_date?: Date;
  end_date?: Date;
  dog_id?: string;
}

// RAG Types (placeholder for future implementation)
export interface RagMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  dogId?: string;
  evaluation?: 'good' | 'bad';
}

