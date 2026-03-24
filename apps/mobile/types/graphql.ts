export type WalkStatus = 'ACTIVE' | 'FINISHED';
export type StatsPeriod = 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';

export interface BirthDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

export interface WalkPoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

export interface WalkStats {
  totalWalks: number;
  totalDistanceM: number;
  totalDurationSec: number;
}

export interface Dog {
  id: string;
  name: string;
  breed: string | null;
  gender: string | null;
  birthDate: BirthDate | null;
  photoUrl: string | null;
  createdAt: string;
}

export interface DogWithStats extends Dog {
  walkStats: WalkStats | null;
}

export interface Walk {
  id: string;
  dogs: Dog[];
  status: WalkStatus;
  distanceM: number | null;
  durationSec: number | null;
  startedAt: string;
  endedAt: string | null;
  points?: WalkPoint[];
}

export interface User {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  dogs: Dog[];
  createdAt: string;
}

export interface PresignedUrl {
  url: string;
  key: string;
  expiresAt: string;
}

export interface UpdateProfileInput {
  displayName?: string;
}

export interface CreateDogInput {
  name: string;
  breed?: string;
  gender?: string;
  birthDate?: BirthDateInput;
}

export interface UpdateDogInput {
  name?: string;
  breed?: string;
  gender?: string;
  birthDate?: BirthDateInput;
  photoUrl?: string;
}

export interface BirthDateInput {
  year?: number;
  month?: number;
  day?: number;
}

export interface WalkPointInput {
  lat: number;
  lng: number;
  recordedAt: string;
}

export interface MeResponse { me: User; }
export interface DogResponse { dog: DogWithStats | null; }
export interface WalkResponse { walk: Walk | null; }
export interface MyWalksResponse { myWalks: Walk[]; }
export interface UpdateProfileResponse { updateProfile: User; }
export interface CreateDogResponse { createDog: Dog; }
export interface UpdateDogResponse { updateDog: Dog; }
export interface DeleteDogResponse { deleteDog: boolean; }
export interface GenerateDogPhotoUploadUrlResponse { generateDogPhotoUploadUrl: PresignedUrl; }
export interface StartWalkResponse { startWalk: Walk; }
export interface AddWalkPointsResponse { addWalkPoints: boolean; }
export interface FinishWalkResponse { finishWalk: Walk; }
