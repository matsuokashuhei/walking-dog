type WalkStatus = 'ACTIVE' | 'FINISHED';
export type StatsPeriod = 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';
type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type WalkEventType = 'pee' | 'poo' | 'sniff' | 'greet' | 'photo';
export type WalkActivityEventType = Exclude<WalkEventType, 'photo'>;
export type ApiWalkEventType = 'PEE' | 'POO' | 'SNIFF' | 'GREET';

export interface Birthday {
  year: number | null;
  month: number | null;
  day: number | null;
}

interface Coordinate {
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

interface LatestWalk {
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
  birthday?: Birthday | null;
  photoUrl?: string | null;
  role?: 'owner' | 'member';
  latestWalk?: LatestWalk | null;
}

interface Walker {
  id: string;
  name?: string | null;
  avatar?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface DogWithStats extends Dog {
  walkStats: WalkStats | null;
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
}

export interface CreateDogInput {
  name: string;
  breed?: string;
  gender?: string;
  birthday?: BirthdayInput | null;
}

export interface UpdateDogInput {
  name?: string;
  breed?: string;
  gender?: string;
  // `null` clears the stored birthday; omitting it leaves it unchanged.
  birthday?: BirthdayInput | null;
  avatar?: string;
  photoUrl?: string;
}

export interface BirthdayInput {
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
  birthday: Birthday | null;
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

interface ApiTrackPointReceipt {
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

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface WalkConnection {
  nodes: ApiWalk[];
  pageInfo: PageInfo;
}

export interface WalksResponse {
  user: {
    walks: WalkConnection;
  };
}

interface AddDogResponse {
  addDog: ApiDog;
}

export interface UpdateDogResponse {
  updateDog: ApiDog;
}

interface RemoveDogResponse {
  removeDog: ApiDog;
}

interface TrackPointResponse {
  trackPoint: ApiTrackPointReceipt;
}

export interface StartWalkResponse {
  startWalk: ApiWalk;
}

interface EndWalkResponse {
  endWalk: ApiWalk;
}

interface AddEventResponse {
  addEvent: ApiWalkDogEvent;
}

export type CreateDogResponse = AddDogResponse;
export type DeleteDogResponse = RemoveDogResponse;
export type AddWalkPointsResponse = TrackPointResponse;
export type FinishWalkResponse = EndWalkResponse;
export type RecordWalkEventResponse = AddEventResponse;

