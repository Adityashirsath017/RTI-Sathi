import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { ClerkProfile } from '@/types';

class ClerkAuthService {
  private currentClerk: ClerkProfile | null = null;
  private authSubscribers: ((clerk: ClerkProfile | null) => void)[] = [];
  private isInitialized = false;

  constructor() {
    fbOnAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        let profile = await this.fetchClerkProfile(fbUser.uid);
        if (!profile) {
          const now = new Date().toISOString();
          profile = {
            uid: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0].toUpperCase() || 'Routing Officer',
            email: fbUser.email || '',
            employeeId: `RO-${fbUser.uid.slice(0, 6).toUpperCase()}`,
            department: 'Public Grievance & Central RTI Routing Division',
            state: 'Maharashtra',
            district: 'Pune',
            role: 'clerk',
            isActive: true,
            createdAt: now,
            updatedAt: now,
            lastLoginAt: now,
          };
        }
        await this.ensureClerkDocExists(fbUser.uid, profile);
        this.currentClerk = profile;
      } else {
        this.currentClerk = null;
      }
      this.isInitialized = true;
      this.notify(this.currentClerk);
    });
  }

  private notify(clerk: ClerkProfile | null) {
    this.authSubscribers.forEach((cb) => cb(clerk));
  }

  public onAuthStateChanged(callback: (clerk: ClerkProfile | null) => void): () => void {
    this.authSubscribers.push(callback);
    if (this.isInitialized) {
      callback(this.currentClerk);
    }
    return () => {
      this.authSubscribers = this.authSubscribers.filter((cb) => cb !== callback);
    };
  }

  public getCurrentClerk(): ClerkProfile | null {
    return this.currentClerk;
  }

  public async ensureClerkDocExists(uid: string, profile: ClerkProfile): Promise<void> {
    try {
      const clerkRef = doc(db, 'clerks', uid);
      const snap = await getDoc(clerkRef);
      if (!snap.exists()) {
        await setDoc(clerkRef, {
          uid,
          name: profile.name,
          email: profile.email,
          employeeId: profile.employeeId,
          department: profile.department,
          state: profile.state,
          district: profile.district,
          role: 'clerk',
          isActive: true,
          createdAt: profile.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        });
      } else {
        await updateDoc(clerkRef, { lastLoginAt: new Date().toISOString() });
      }
    } catch (err) {
      console.warn('[ClerkAuth] ensureClerkDocExists notice:', err);
    }
  }

  /**
   * Fetches clerk profile from Firestore
   */
  public async fetchClerkProfile(uid: string): Promise<ClerkProfile | null> {
    // 1. Try Firestore clerks collection
    try {
      const clerkRef = doc(db, 'clerks', uid);
      const snap = await getDoc(clerkRef);
      if (snap.exists()) {
        return snap.data() as ClerkProfile;
      }
    } catch (err) {
      // Rule check
    }

    // 2. Try Firestore users collection
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const uData = userSnap.data();
        const now = new Date().toISOString();
        const profile: ClerkProfile = {
          uid,
          name: uData.fullName || 'Routing Officer',
          email: uData.email || '',
          employeeId: uData.employeeId || `RO-${uid.slice(0, 5).toUpperCase()}`,
          department: uData.department || 'Central RTI Routing Division',
          state: uData.state || 'Maharashtra',
          district: uData.district || 'Pune',
          role: 'clerk',
          isActive: true,
          createdAt: uData.createdAt || now,
          updatedAt: now,
          lastLoginAt: now,
        };
        return profile;
      }
    } catch (err) {
      // Ignore
    }

    if (auth.currentUser) {
      const now = new Date().toISOString();
      const fbUser = auth.currentUser;
      const fallback: ClerkProfile = {
        uid: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0].toUpperCase() || 'Routing Officer',
        email: fbUser.email || '',
        employeeId: `RO-${fbUser.uid.slice(0, 6).toUpperCase()}`,
        department: 'Central RTI Routing Division',
        state: 'Maharashtra',
        district: 'Pune',
        role: 'clerk',
        isActive: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };
      return fallback;
    }

    return null;
  }

  /**
   * Updates clerk profile in Firestore clerks/{uid}
   */
  public async updateClerkProfile(updates: Partial<ClerkProfile>): Promise<void> {
    if (!this.currentClerk) return;
    const uid = this.currentClerk.uid;
    const updated = {
      ...this.currentClerk,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.currentClerk = updated;

    try {
      const clerkRef = doc(db, 'clerks', uid);
      await updateDoc(clerkRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[ClerkAuth] updateClerkProfile error:', err);
    }
    this.notify(this.currentClerk);
  }

  /**
   * Logs in a Clerk with Email and Password
   */
  public async login(email: string, password: string): Promise<ClerkProfile> {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;

    let profile = await this.fetchClerkProfile(uid);

    if (!profile) {
      const now = new Date().toISOString();
      profile = {
        uid,
        name: userCred.user.displayName || email.split('@')[0].toUpperCase(),
        email,
        employeeId: `RO-${uid.slice(0, 6).toUpperCase()}`,
        department: 'RTI Black Hole Routing Division',
        state: 'Maharashtra',
        district: 'Pune',
        role: 'clerk',
        isActive: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };
    }

    await this.ensureClerkDocExists(uid, profile);

    this.currentClerk = profile;
    this.notify(profile);
    return profile;
  }

  /**
   * Register a new Routing Officer account
   */
  public async registerClerk(data: {
    name: string;
    email: string;
    password: string;
    employeeId: string;
    department: string;
    state: string;
    district: string;
  }): Promise<ClerkProfile> {
    const userCred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const uid = userCred.user.uid;
    const now = new Date().toISOString();

    const profile: ClerkProfile = {
      uid,
      name: data.name,
      email: data.email,
      employeeId: data.employeeId,
      department: data.department,
      state: data.state,
      district: data.district,
      role: 'clerk',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    await this.ensureClerkDocExists(uid, profile);

    this.currentClerk = profile;
    this.notify(profile);
    return profile;
  }

  /**
   * 1-Click Demo Clerk Login
   */
  public async loginAsDemoClerk(): Promise<ClerkProfile> {
    const demoEmail = 'clerk.demo@rtisathi.gov.in';
    const demoPass = 'ClerkGov2026!';

    try {
      return await this.login(demoEmail, demoPass);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          return await this.registerClerk({
            name: 'Sanjay Deshmukh',
            email: demoEmail,
            password: demoPass,
            employeeId: 'RO-MH-40192',
            department: 'Public Grievance & Central RTI Routing Division',
            state: 'Maharashtra',
            district: 'Pune',
          });
        } catch (regErr: any) {
          if (regErr.code === 'auth/email-already-in-use') {
            return await this.login(demoEmail, demoPass);
          }
          throw regErr;
        }
      }
      throw err;
    }
  }

  public async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  public async logout(): Promise<void> {
    await signOut(auth);
    this.currentClerk = null;
    this.notify(null);
  }
}

export const clerkAuthService = new ClerkAuthService();
