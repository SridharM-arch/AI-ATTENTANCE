export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: 'host' | 'instructor' | 'student';
  hostId?: string;
  studentId?: string;
  imagePath?: string;
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
  status?: 'active' | 'ended';
  participants: Participant[];
  duration?: number;
  endTime?: string;
  minAttendanceType?: 'minutes' | 'percentage';
  minAttendanceValue?: number;
}

export interface AttendanceRequest {
  _id: string;
  studentId: string;
  sessionId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  studentName?: string;
}

