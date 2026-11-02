export type MeterStatus = 'active' | 'suspended' | 'inactive';

export interface MeterLastReading {
  value: number;
  date: string; 
}

export interface MeterRecord {
  code: string;               
  address: string;            
  sector: string;             
  accountNumber: string;      
  status: MeterStatus;        
  lastReading: MeterLastReading; 
  averageConsumption: number; 
}

export interface MeterValidationResult {
  isValid: boolean;
  code?: string;
  errorMessage?: string;
}

export interface MonthlyDuplicateCheckResult {
  hasDuplicate: boolean;
  isSubmitted?: boolean;
  message?: string;
  canEditPending?: boolean;
}

export interface CachedMeterEntry {
  record: MeterRecord;
  cachedAt: number; 
}
