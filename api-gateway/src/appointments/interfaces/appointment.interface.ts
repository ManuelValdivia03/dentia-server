export interface Appointment {
  id: string;
  patientId: string;
  dentistId: string;
  startAt: string;
  endAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  reason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}