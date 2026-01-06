
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  writeBatch,
  doc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { Song } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyDqwwbv3V0mvuf--u9W50owR87ijVAoPjg",
  authDomain: "hi360-4c2de.firebaseapp.com",
  projectId: "hi360-4c2de",
  storageBucket: "hi360-4c2de.firebasestorage.app",
  messagingSenderId: "894609924976",
  appId: "1:894609924976:android:a783b416bbe70774fd25b5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const firebaseService = {
  // Authentication
  loginOrSignUp: async (username: string, pass: string) => {
    // We append a domain to use standard Email/Pass auth as "Username/Pass"
    const email = `${username.toLowerCase().trim()}@hi360.app`;
    
    try {
      // Try to sign in
      const result = await signInWithEmailAndPassword(auth, email, pass);
      return result.user;
    } catch (error: any) {
      // If user doesn't exist, create them (Auto-signup)
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          const result = await createUserWithEmailAndPassword(auth, email, pass);
          await updateProfile(result.user, { displayName: username });
          return result.user;
        } catch (createError: any) {
          console.error("Creation Error:", createError);
          throw new Error("Could not create or access account. Password might be too short or username taken.");
        }
      }
      console.error("Login Error:", error);
      throw error;
    }
  },

  logout: () => signOut(auth),

  onAuthChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  // Song Data Operations
  getApprovedSongs: (callback: (songs: Song[]) => void) => {
    const q = query(
      collection(db, 'songs'),
      where('approved', '==', true)
    );

    return onSnapshot(q, (snapshot) => {
      const songs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Song[];

      const sortedSongs = songs.sort((a, b) => {
        const timeA = a.created_at?.toMillis?.() || 0;
        const timeB = b.created_at?.toMillis?.() || 0;
        return timeB - timeA;
      });

      callback(sortedSongs);
    }, (error) => {
      console.error("Firestore connection error:", error);
    });
  },

  submitSongs: async (songsData: Omit<Song, 'id' | 'approved' | 'created_at'>[]) => {
    try {
      const batch = writeBatch(db);
      const songsRef = collection(db, 'songs');

      songsData.forEach((song) => {
        const newDocRef = doc(songsRef);
        batch.set(newDocRef, {
          ...song,
          approved: true,
          created_at: serverTimestamp(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error("Batch submission failed:", error);
      throw error;
    }
  },

  deleteSong: async (songId: string) => {
    try {
      await deleteDoc(doc(db, 'songs', songId));
    } catch (error) {
      console.error("Delete failed:", error);
      throw error;
    }
  },

  updateSong: async (songId: string, updates: Partial<Song>) => {
    try {
      const songRef = doc(db, 'songs', songId);
      await updateDoc(songRef, { ...updates });
    } catch (error) {
      console.error("Update failed:", error);
      throw error;
    }
  }
};
