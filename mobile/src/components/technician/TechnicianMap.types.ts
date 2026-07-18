import type { ForegroundCoordinates } from '@/lib/use-foreground-location';
import type { Technician } from '@/types/api';

export interface TechnicianMapProps {
  technicians: Technician[];
  selectedTechnicianId: string | null;
  userCoordinates: ForegroundCoordinates | null;
  isLocating: boolean;
  locationMessage?: string | null;
  onBookTechnician: (technician: Technician) => void;
  onOpenTechnician: (technician: Technician) => void;
  onRequestLocation: () => void;
  onSelectTechnician: (technicianId: string | null) => void;
  onSwitchToList: () => void;
}
