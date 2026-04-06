/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInAnonymously } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharedProjectId, setSharedProjectId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    if (projectId) {
      setSharedProjectId(projectId);
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser && projectId) {
        // Auto login as guest to view shared project
        try {
          await signInAnonymously(auth);
          return; // onAuthStateChanged will fire again
        } catch (err) {
          console.error("Failed to sign in anonymously for shared project", err);
        }
      }

      setUser(currentUser);
      
      // If a real user logs in, ensure their profile exists
      if (currentUser && !currentUser.isAnonymous) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            const isAdmin = currentUser.email === 'dlaniger.napm.consulting@gmail.com';
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              createdAt: serverTimestamp(),
              role: isAdmin ? 'admin' : 'user',
              tier: isAdmin ? 'Premium' : 'Basic',
              faceAuthEnabled: false
            });
          } else {
            // Force admin upgrade if needed
            if (currentUser.email === 'dlaniger.napm.consulting@gmail.com' && 
                (userSnap.data().role !== 'admin' || userSnap.data().tier !== 'Premium')) {
              await setDoc(userRef, {
                uid: currentUser.uid,
                email: currentUser.email,
                createdAt: userSnap.data().createdAt || serverTimestamp(),
                role: 'admin',
                tier: 'Premium'
              }, { merge: true });
            }
          }
        } catch (error) {
          console.error("Error creating/updating user profile:", error);
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return user ? <Dashboard sharedProjectId={sharedProjectId} /> : <Auth />;
}
