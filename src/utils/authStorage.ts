import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { db, auth, cleanForFirestore } from '../firebase';
import { AppUser, UserRole } from '../types/auth';

const USERS_STORAGE_KEY = 'p2h_registered_users_v1';
const CURRENT_USER_KEY = 'p2h_current_user_v1';
const USERS_COLLECTION = 'p2h_users';

export const DEFAULT_ADMIN: AppUser = {
  id: 'usr-adm-celvinns',
  userCode: '30A25517',
  name: 'CelvinNs',
  email: 'celvinnetaniel@gmail.com',
  role: 'admin',
  department: 'HCGS',
  authProvider: 'code',
  pin: '0708',
  createdAt: new Date('2025-01-01').toISOString(),
};

export const INITIAL_USERS: AppUser[] = [
  DEFAULT_ADMIN,
  {
    id: 'usr-opr-102',
    userCode: 'OPR-102',
    name: 'Ahmad Subarjo',
    email: 'ahmad.subarjo@operator.pst',
    role: 'user',
    department: 'PRODUKSI',
    authProvider: 'code',
    pin: '1234',
    createdAt: new Date('2025-01-02').toISOString(),
  },
  {
    id: 'usr-opr-105',
    userCode: 'OPR-105',
    name: 'Doni Pratama',
    email: 'doni.pratama@operator.pst',
    role: 'user',
    department: 'PLANT',
    authProvider: 'code',
    pin: '1234',
    createdAt: new Date('2025-01-03').toISOString(),
  },
];

// Helper to guarantee CelvinNs is registered as the sole administrator and purge legacy demo admin
export function ensureAdminCelvinNs(users: AppUser[]): AppUser[] {
  // Remove legacy demo admin ADM-001 so CelvinNs is the only admin
  let filtered = users.filter((u) => u.userCode !== 'ADM-001' && u.id !== 'usr-adm-001');

  const existingIdx = filtered.findIndex(
    (u) => u.userCode.trim().toUpperCase() === '30A25517' || u.id === 'usr-adm-celvinns'
  );

  if (existingIdx >= 0) {
    filtered[existingIdx] = {
      ...filtered[existingIdx],
      id: 'usr-adm-celvinns',
      userCode: '30A25517',
      name: 'CelvinNs',
      role: 'admin',
      pin: '0708',
      department: 'HCGS',
      email: filtered[existingIdx].email || 'celvinnetaniel@gmail.com',
    };
  } else {
    filtered = [DEFAULT_ADMIN, ...filtered];
  }

  return filtered;
}

// Get cached users from localStorage
export function getLocalUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const ensured = ensureAdminCelvinNs(parsed);
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(ensured));
        return ensured;
      }
    }
  } catch (err) {
    console.error('Failed to parse local users', err);
  }
  // Fallback to initial seed with CelvinNs
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
  return INITIAL_USERS;
}

// Save users to localStorage cache
export function saveLocalUsers(users: AppUser[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users to localStorage', err);
  }
}

export function getCurrentUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      const user = JSON.parse(raw);
      if (user && (user.userCode === '30A25517' || user.id === 'usr-adm-celvinns')) {
        return {
          ...user,
          department: 'HCGS',
        };
      }
      return user;
    }
  } catch (err) {
    console.error('Failed to parse current user', err);
  }
  // Return null when not logged in so users must authenticate first
  return null;
}

// Set current active user session
export function setCurrentUser(user: AppUser | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (err) {
    console.error('Failed to set current user in localStorage', err);
  }
}

// Subscribe to registered users from Firestore with local fallback
export function subscribeToUsers(onUpdate: (users: AppUser[]) => void): () => void {
  const colRef = collection(db, USERS_COLLECTION);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        // Seed initial users into Firestore
        const local = getLocalUsers();
        local.forEach((u) => {
          setDoc(doc(db, USERS_COLLECTION, u.id), cleanForFirestore(u)).catch((e) => {
            console.warn('Initial user seed warning:', e);
          });
        });
        onUpdate(local);
        return;
      }

      const list: AppUser[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as AppUser);
      });

      const ensuredList = ensureAdminCelvinNs(list);
      ensuredList.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (b.role === 'admin' && a.role !== 'admin') return 1;
        return a.userCode.localeCompare(b.userCode);
      });

      // Synchronize CelvinNs to Firestore
      setDoc(doc(db, USERS_COLLECTION, DEFAULT_ADMIN.id), cleanForFirestore(DEFAULT_ADMIN), { merge: true }).catch(() => {});
      deleteDoc(doc(db, USERS_COLLECTION, 'usr-adm-001')).catch(() => {});

      saveLocalUsers(ensuredList);
      onUpdate(ensuredList);
    },
    (err) => {
      console.warn('Firestore user subscription fallback to local cache:', err);
      onUpdate(getLocalUsers());
    }
  );

  return unsubscribe;
}

// Check if user code is already taken by another user
export function isUserCodeTaken(code: string, excludeUserId?: string): boolean {
  const cleanCode = code.trim().toUpperCase();
  const users = getLocalUsers();
  return users.some(
    (u) => u.userCode.trim().toUpperCase() === cleanCode && u.id !== excludeUserId
  );
}

// Generate unique code: e.g. OPR-108, ADM-003, USR-489
export function generateUniqueCode(role: UserRole): string {
  const users = getLocalUsers();
  const prefix = role === 'admin' ? 'ADM' : 'OPR';

  // Find max existing number for prefix
  let maxNum = 0;
  users.forEach((u) => {
    const code = u.userCode.trim().toUpperCase();
    if (code.startsWith(`${prefix}-`)) {
      const numPart = parseInt(code.replace(`${prefix}-`, ''), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  });

  const nextNum = maxNum > 0 ? maxNum + 1 : (role === 'admin' ? 1 : 101);
  const formattedCode = `${prefix}-${String(nextNum).padStart(3, '0')}`;

  if (isUserCodeTaken(formattedCode)) {
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${rand}`;
  }

  return formattedCode;
}

// Register a brand new user
export async function registerNewUser(
  userData: Omit<AppUser, 'id' | 'createdAt'>
): Promise<AppUser> {
  const normalizedCode = userData.userCode.trim().toUpperCase();

  if (isUserCodeTaken(normalizedCode)) {
    throw new Error(`NRP/NIK "${normalizedCode}" sudah terdaftar. Silakan masukkan NRP/NIK yang valid.`);
  }

  const id = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newUser: AppUser = {
    ...userData,
    id,
    userCode: normalizedCode,
    role: 'user', // Registrasi umum hanya untuk Operator P2H
    createdAt: new Date().toISOString(),
  };

  // Update local cache
  const current = getLocalUsers();
  const updated = [...current, newUser];
  saveLocalUsers(updated);

  // Sync to Firestore
  try {
    const payload = cleanForFirestore(newUser);
    await setDoc(doc(db, USERS_COLLECTION, newUser.id), payload);
  } catch (error) {
    console.warn('Failed to sync new user to Firestore online, cached locally:', error);
  }

  return newUser;
}

// Login with User Code + optional PIN
export function loginWithCode(
  userCode: string,
  pin?: string
): { success: boolean; user?: AppUser; message?: string } {
  const cleanCode = userCode.trim().toUpperCase();
  const users = getLocalUsers();
  const user = users.find((u) => u.userCode.trim().toUpperCase() === cleanCode);

  if (!user) {
    return {
      success: false,
      message: `Kode user "${userCode}" tidak ditemukan. Silakan periksa kembali atau daftarkan akun baru.`,
    };
  }

  // If user has a set PIN and PIN was entered, verify
  if (user.pin && pin && pin.trim().length > 0 && user.pin !== pin.trim()) {
    return {
      success: false,
      message: 'PIN / Sandi salah. Silakan coba kembali.',
    };
  }

  setCurrentUser(user);
  return { success: true, user };
}

// Handle Google Auth sign in / sign up
export async function signInWithGoogleFlow(): Promise<{
  success: boolean;
  user?: AppUser;
  needsRegistration?: boolean;
  googleProfile?: { email: string; name: string; photoURL?: string };
  message?: string;
}> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const gUser = result.user;

    const email = gUser.email || '';
    const name = gUser.displayName || 'Google User';
    const photoURL = gUser.photoURL || undefined;

    // Check if user already registered by email
    const users = getLocalUsers();
    const existing = users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase());

    if (existing) {
      setCurrentUser(existing);
      return { success: true, user: existing };
    }

    // New Google user, auto create
    const uniqueCode = generateUniqueCode('user');
    const newUser = await registerNewUser({
      userCode: uniqueCode,
      name,
      email,
      role: 'user', // Default to operator user, admin can upgrade
      department: 'PRODUKSI',
      authProvider: 'google',
      photoURL,
    });

    setCurrentUser(newUser);
    return { success: true, user: newUser };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn('Google Auth popup error (or restricted environment):', errMsg);

    return {
      success: false,
      message: 'Koneksi Google Auth via pop-up tidak dapat dibuka di lingkungan ini. Silakan gunakan opsi Masuk dengan Email Google atau Kode User Unik.',
    };
  }
}

// Google direct sign-in for iframe/restricted environments
export async function registerOrLoginSimulatedGoogle(
  name: string,
  email: string,
  role: UserRole = 'user'
): Promise<AppUser> {
  const users = getLocalUsers();
  const existing = users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase());

  if (existing) {
    setCurrentUser(existing);
    return existing;
  }

  const uniqueCode = generateUniqueCode(role);
  const newUser = await registerNewUser({
    userCode: uniqueCode,
    name,
    email,
    role,
    department: role === 'admin' ? 'SHE / PENGELOLA' : 'PRODUKSI',
    authProvider: 'google',
    photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
  });

  setCurrentUser(newUser);
  return newUser;
}

// Update existing user data (ID code, Name, Role, Department, Email, PIN)
export async function updateUserOnline(
  userId: string,
  updates: Partial<AppUser>
): Promise<AppUser> {
  const users = getLocalUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) {
    throw new Error('User tidak ditemukan.');
  }

  // If userCode is being updated, check that it's unique
  if (updates.userCode) {
    const cleanCode = updates.userCode.trim().toUpperCase();
    if (!cleanCode) {
      throw new Error('NRP/NIK tidak boleh kosong.');
    }
    if (isUserCodeTaken(cleanCode, userId)) {
      throw new Error(`NRP/NIK "${cleanCode}" sudah terdaftar oleh pengguna lain.`);
    }
    updates.userCode = cleanCode;
  }

  const updatedUser: AppUser = {
    ...users[index],
    ...updates,
  };

  users[index] = updatedUser;
  saveLocalUsers(users);

  // If current active session is the updated user, update session as well
  const current = getCurrentUser();
  if (current && current.id === userId) {
    setCurrentUser(updatedUser);
  }

  // Sync to Firestore online
  try {
    const payload = cleanForFirestore(updatedUser);
    await setDoc(doc(db, USERS_COLLECTION, userId), payload, { merge: true });
  } catch (err) {
    console.warn('Failed to sync updated user to Firestore online, updated locally:', err);
  }

  return updatedUser;
}

// Delete user account (with safeguards)
export async function deleteUserOnline(userId: string): Promise<void> {
  const users = getLocalUsers();
  const current = getCurrentUser();

  if (current && current.id === userId) {
    throw new Error('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.');
  }

  const target = users.find((u) => u.id === userId);
  if (!target) {
    throw new Error('User tidak ditemukan.');
  }

  if (target.userCode.trim().toUpperCase() === '30A25517' || target.id === 'usr-adm-celvinns') {
    throw new Error('Akun Administrator utama CelvinNs (30A25517) diproteksi dan tidak dapat dihapus.');
  }

  if (target.role === 'admin') {
    const adminCount = users.filter((u) => u.role === 'admin').length;
    if (adminCount <= 1) {
      throw new Error('Tidak dapat menghapus admin ini. Sistem harus memiliki minimal satu akun Administrator aktif.');
    }
  }

  const filtered = users.filter((u) => u.id !== userId);
  saveLocalUsers(filtered);

  // Delete from Firestore online
  try {
    await deleteDoc(doc(db, USERS_COLLECTION, userId));
  } catch (err) {
    console.warn('Failed to delete user in Firestore online, deleted locally:', err);
  }
}

// Reset user PIN / password helper
export async function resetUserPinOnline(userId: string, newPin: string): Promise<AppUser> {
  const cleanPin = newPin.trim();
  if (cleanPin.length > 0 && cleanPin.length < 4) {
    throw new Error('PIN minimal harus terdiri dari 4 digit angka/karakter.');
  }
  return updateUserOnline(userId, { pin: cleanPin });
}
