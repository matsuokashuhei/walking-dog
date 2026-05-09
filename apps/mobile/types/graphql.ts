export type WalkStatus = 'ACTIVE' | 'FINISHED';
export type StatsPeriod = 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';
export type DogMemberRole = 'owner' | 'member';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type WalkEventType = 'pee' | 'poo' | 'sniff' | 'greet' | 'photo';
export type WalkActivityEventType = Exclude<WalkEventType, 'photo'>;
export type ApiWalkEventType = 'PEE' | 'POO' | 'SNIFF' | 'GREET';

export interface BirthDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface WalkPoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

export interface TrackPoint {
  walkId: string;
  trackedAt: string;
  coordinate: Coordinate;
}

export interface WalkStats {
  totalWalks: number;
  totalDistanceM: number;
  totalDurationSec: number;
}

export interface LatestWalk {
  endedAt: string | null;
}

export interface Dog {
  id: string;
  name: string;
  breed: string | null;
  gender: Gender | string | null;
  avatar?: string | null;
  createdAt: string;
  updatedAt?: string;
  birthDate?: BirthDate | null;
  photoUrl?: string | null;
  role?: DogMemberRole;
  latestWalk?: LatestWalk | null;
}

export interface DogMemberUser {
  name?: string | null;
  avatar?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
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
  name?: string | null;
  avatar?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface DogWithStats extends Dog {
  walkStats: WalkStats | null;
  members?: DogMember[];
}

export interface WalkDogEvent {
  id: string;
  walkDogId: string;
  event?: ApiWalkEventType;
  occurredAt: string;
  coordinate?: Coordinate;
  createdAt: string;
  updatedAt: string;
}

export interface WalkPhoto {
  id: string;
  walkId: string;
  occurredAt: string;
  file: string;
  coordinate: Coordinate;
  createdAt: string;
  updatedAt: string;
}

export interface WalkDog {
  id: string;
  walkId: string;
  dogId: string;
  createdAt: string;
  updatedAt: string;
  dog: Dog;
  events: WalkDogEvent[];
}

export interface WalkEvent {
  id: string;
  walkId: string;
  dogId: string | null;
  event?: ApiWalkEventType;
  occurredAt: string;
  coordinate?: Coordinate;
  createdAt?: string;
  updatedAt?: string;
  eventType: WalkEventType;
  lat?: number | null;
  lng?: number | null;
  photoUrl?: string | null;
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
  status: WalkStatus;
  distance?: number | null;
  startedAt: string;
  endedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  walkDogs?: WalkDog[];
  photos?: WalkPhoto[];
  trackPoints?: TrackPoint[];
  walker?: Walker;
  distanceM?: number | null;
  durationSec?: number | null;
  points?: WalkPoint[];
  events?: WalkEvent[];
}

export interface User {
  id: string;
  name?: string | null;
  avatar?: string | null;
  createdAt: string;
  updatedAt?: string;
  dogs: Dog[];
  displayName?: string | null;
  avatarUrl?: string | null;
  encounterDetectionEnabled?: boolean;
}

export interface PresignedUrl {
  url: string;
  key: string;
  expiresAt: string;
}

export interface UpdateProfileInput {
  name?: string;
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
  avatar?: string;
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

export interface ApiDog {
  id: string;
  name: string;
  breed: string | null;
  gender: Gender;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiUser {
  id: string;
  name: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
  dogs: ApiDog[];
}

export interface ApiWalkDogEvent {
  id: string;
  walkDogId: string;
  event: ApiWalkEventType;
  occurredAt: string;
  coordinate: Coordinate;
  createdAt: string;
  updatedAt: string;
}

export interface ApiWalkDog {
  id: string;
  walkId: string;
  dogId: string;
  createdAt: string;
  updatedAt: string;
  dog: ApiDog;
  events: ApiWalkDogEvent[];
}

export interface ApiWalkPhoto {
  id: string;
  walkId: string;
  occurredAt: string;
  file: string;
  coordinate: Coordinate;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTrackPoint {
  walkId: string;
  trackedAt: string;
  coordinate: Coordinate;
}

export interface ApiTrackPointReceipt {
  walkId: string;
  trackedAt: string;
  acceptedAt: string;
}

export interface ApiWalk {
  id: string;
  startedAt: string;
  endedAt: string | null;
  distance: number | null;
  createdAt: string;
  updatedAt: string;
  walkDogs: ApiWalkDog[];
  dogs: ApiDog[];
  photos: ApiWalkPhoto[];
  trackPoints: ApiTrackPoint[];
}

export interface UserResponse {
  user: ApiUser;
}

export interface WalkResponse {
  walk: ApiWalk;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface WalkConnection {
  nodes: ApiWalk[];
  pageInfo: PageInfo;
}

export interface WalksResponse {
  user: {
    walks: WalkConnection;
  };
}

export interface AddDogResponse {
  addDog: ApiDog;
}

export interface UpdateDogResponse {
  updateDog: ApiDog;
}

export interface RemoveDogResponse {
  removeDog: ApiDog;
}

export interface TrackPointResponse {
  trackPoint: ApiTrackPointReceipt;
}

export interface StartWalkResponse {
  startWalk: ApiWalk;
}

export interface EndWalkResponse {
  endWalk: ApiWalk;
}

export interface AddEventResponse {
  addEvent: ApiWalkDogEvent;
}

export interface TakePhotoResponse {
  takePhoto: ApiWalkPhoto;
}

export type MeResponse = UserResponse;
export type MyWalksResponse = WalksResponse;
export type CreateDogResponse = AddDogResponse;
export type DeleteDogResponse = RemoveDogResponse;
export type AddWalkPointsResponse = TrackPointResponse;
export type FinishWalkResponse = EndWalkResponse;
export type RecordWalkEventResponse = AddEventResponse;

export interface FriendDog {
  id: string;
  name: string;
  breed: string | null;
  photoUrl: string | null;
  avatar?: string | null;
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

export interface DogFriendsResponse {
  dogFriends: Friendship[];
}

export interface DogEncountersResponse {
  dogEncounters: Encounter[];
}

export interface FriendshipResponse {
  friendship: Friendship | null;
}

export interface GenerateDogPhotoUploadUrlResponse {
  generateDogPhotoUploadUrl: PresignedUrl;
}

export interface GenerateDogInvitationResponse {
  generateDogInvitation: DogInvitation;
}

export interface AcceptDogInvitationResponse {
  acceptDogInvitation: Dog;
}

export interface RemoveDogMemberResponse {
  removeDogMember: boolean;
}

export interface LeaveDogResponse {
  leaveDog: boolean;
}

export interface RecordEncounterResponse {
  recordEncounter: Encounter[];
}

export interface UpdateEncounterDurationResponse {
  updateEncounterDuration: boolean;
}
export interface GenerateWalkEventPhotoUploadUrlResponse {
  generateWalkEventPhotoUploadUrl: PresignedUrl;
}
