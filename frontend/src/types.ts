export interface User {
  _id: string;   // 👈 ADD THIS
  id?: string;   // optional if needed
  name: string;
  email: string;
  role: string;
  faceEnrolled?: boolean;
}

export interface Participant {
  _id: string;
  user: User;
  isActive: boolean;
}

export interface Session {
  _id: string;
  title: string;
  instructor: User;
  roomId: string;
  isActive: boolean;
  participants: Participant[];
}

