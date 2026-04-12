export type WalkStatus = 'ACTIVE' | 'FINISHED';
export type StatsPeriod = 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';
export type DogMemberRole = 'owner' | 'member';

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
  role?: DogMemberRole;
  createdAt: string;
}

export interface DogMemberUser {
  displayName: string | null;
  avatarUrl: string | null;
}

export interface DogMember {
  id: string;
  userId: string;
  role: DogMemberRole;
  user: DogMemberUser;
  createdAt: string;
}

export interface DogInvitation {
  id: string;
  token: string;
  expiresAt: string;
}

export interface Walker {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface DogWithStats extends Dog {
  walkStats: WalkStats | null;
  members?: DogMember[];
}

export type WalkEventType = 'pee' | 'poo' | 'photo';

export interface WalkEvent {
  id: string;
  walkId: string;
  dogId: string | null;
  eventType: WalkEventType;
  occurredAt: string;
  lat: number | null;
  lng: number | null;
  photoUrl: string | null;
}

export interface RecordWalkEventInput {
  walkId: string;
  dogId?: string;
  eventType: WalkEventType;
  occurredAt: string;
  lat?: number;
  lng?: number;
  photoKey?: string;
}

export interface Walk {
  id: string;
  dogs: Dog[];
  walker?: Walker;
  status: WalkStatus;
  distanceM: number | null;
  durationSec: number | null;
  startedAt: string;
  endedAt: string | null;
  points?: WalkPoint[];
  events?: WalkEvent[];
}

export interface User {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  encounterDetectionEnabled: boolean;
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
export interface GenerateDogInvitationResponse { generateDogInvitation: DogInvitation; }
export interface AcceptDogInvitationResponse { acceptDogInvitation: Dog; }
export interface RemoveDogMemberResponse { removeDogMember: boolean; }
export interface LeaveDogResponse { leaveDog: boolean; }
export interface UpdateEncounterDetectionResponse { updateEncounterDetection: User; }
export interface RecordEncounterResponse { recordEncounter: Encounter[]; }
export interface UpdateEncounterDurationResponse { updateEncounterDuration: boolean; }

export interface FriendDog {
  id: string;
  name: string;
  breed: string | null;
  photoUrl: string | null;
}

export interface Friendship {
  id: string;
  encounterCount: number;
  totalInteractionSec: number;
  firstMetAt: string;
  lastMetAt: string;
  friend: FriendDog;
}

export interface Encounter {
  id: string;
  durationSec: number;
  metAt: string;
  dog1: FriendDog;
  dog2: FriendDog;
}

export interface DogFriendsResponse { dogFriends: Friendship[]; }
export interface DogEncountersResponse { dogEncounters: Encounter[]; }
export interface FriendshipResponse { friendship: Friendship | null; }

export interface StartWalkResponse { startWalk: Walk; }
export interface AddWalkPointsResponse { addWalkPoints: boolean; }
export interface FinishWalkResponse { finishWalk: Walk; }
export interface RecordWalkEventResponse { recordWalkEvent: WalkEvent; }
export interface GenerateWalkEventPhotoUploadUrlResponse {
  generateWalkEventPhotoUploadUrl: PresignedUrl;
}
