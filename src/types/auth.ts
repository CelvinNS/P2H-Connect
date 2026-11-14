export type UserRole = 'admin' | 'user';

export interface AppUser {
  id: string; // Unique user ID (e.g. 'usr-adm-001')
  userCode: string; // Unique user code (e.g. 'ADM-001', 'OPR-102')
  name: string; // Full name (e.g. 'Budi Santoso', 'Ahmad Subarjo')
  email?: string; // Optional email (especially for Google login)
  role: UserRole; // 'admin' = full access to all menus; 'user' = regular operator
  department?: string; // e.g. 'PRODUKSI', 'PLANT', 'SHE', 'DPM'
  authProvider: 'google' | 'code'; // Method of registration / sign in
  photoURL?: string; // Avatar URL for Google or custom
  pin?: string; // Optional quick PIN for login
  createdAt: string; // ISO date string
}

export interface AuthState {
  currentUser: AppUser | null;
  users: AppUser[];
  isLoading: boolean;
}
