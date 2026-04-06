import React, { useState, useEffect } from 'react';
import { auth, db, logout } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import AmortizationCalculator from './AmortizationCalculator';
import { AmortizationInput } from '../lib/amortization';
import { LogOut, User, FolderOpen, Loader2, Share2, Edit2, Trash2, X, Copy, Check } from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface SavedSchedule {
  id: string;
  name: string;
  data: Partial<AmortizationInput>;
}

export default function Dashboard({ sharedProjectId }: { sharedProjectId?: string | null }) {
  const [savedSchedules, setSavedSchedules] = useState<SavedSchedule[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<Partial<AmortizationInput> | undefined>();
  const [currentScheduleName, setCurrentScheduleName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Modals state
  const [editingProject, setEditingProject] = useState<SavedSchedule | null>(null);
  const [editNameInput, setEditNameInput] = useState('');
  const [deletingProject, setDeletingProject] = useState<SavedSchedule | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Save Modals state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState('');
  const [saveInputData, setSaveInputData] = useState<AmortizationInput | null>(null);
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);
  const [projectToOverwrite, setProjectToOverwrite] = useState<SavedSchedule | null>(null);
  const [guestAlertOpen, setGuestAlertOpen] = useState(false);
  
  const isGuest = auth.currentUser?.isAnonymous;

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      if (sharedProjectId) {
        await loadSharedProject(sharedProjectId);
      }
      if (!isGuest) {
        await loadSchedules();
      }
      setIsLoading(false);
    };
    init();
  }, [isGuest, sharedProjectId]);

  const loadSharedProject = async (id: string) => {
    try {
      const docRef = doc(db, 'schedules', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentSchedule({
          loanAmount: data.loanAmount,
          downPayment: data.downPayment,
          annualInterestRate: data.annualInterestRate,
          loanTermYears: data.loanTermYears,
          paymentsPerYear: data.paymentsPerYear,
          monthlyExtraPayment: data.monthlyExtraPayment || 0,
          extraPayments: data.extraPayments || {},
          startDate: data.startDate ? new Date(data.startDate) : new Date(),
        });
        setCurrentScheduleName(data.name);
      } else {
        console.error("Shared project not found");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `schedules/${id}`);
    }
  };

  const loadSchedules = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(
        collection(db, 'schedules'),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const schedules: SavedSchedule[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        schedules.push({
          id: doc.id,
          name: data.name,
          data: {
            loanAmount: data.loanAmount,
            downPayment: data.downPayment,
            annualInterestRate: data.annualInterestRate,
            loanTermYears: data.loanTermYears,
            paymentsPerYear: data.paymentsPerYear,
            monthlyExtraPayment: data.monthlyExtraPayment || 0,
            extraPayments: data.extraPayments || {},
            startDate: data.startDate ? new Date(data.startDate) : new Date(),
          }
        });
      });
      setSavedSchedules(schedules);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'schedules');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClick = (input: AmortizationInput) => {
    if (!auth.currentUser || isGuest) {
      setGuestAlertOpen(true);
      return;
    }
    
    const defaultName = currentScheduleName ? (sharedProjectId ? `${currentScheduleName} (Copy)` : currentScheduleName) : "My Mortgage";
    setSaveNameInput(defaultName);
    setSaveInputData(input);
    setSaveModalOpen(true);
  };

  const handleSaveSubmit = async () => {
    if (!saveNameInput.trim() || !saveInputData) return;
    
    const existing = savedSchedules.find(s => s.name === saveNameInput.trim());
    if (existing) {
      setProjectToOverwrite(existing);
      setOverwriteConfirmOpen(true);
      setSaveModalOpen(false);
      return;
    }
    
    await performSave(saveNameInput.trim(), saveInputData);
    setSaveModalOpen(false);
  };

  const handleOverwriteConfirm = async () => {
    if (!projectToOverwrite || !saveInputData) return;
    await performSave(projectToOverwrite.name, saveInputData, projectToOverwrite.id);
    setOverwriteConfirmOpen(false);
  };

  const performSave = async (name: string, input: AmortizationInput, existingId?: string) => {
    if (!auth.currentUser) return;

    setIsSaving(true);
    try {
      const scheduleData = {
        userId: auth.currentUser.uid,
        name,
        loanAmount: input.loanAmount,
        downPayment: input.downPayment,
        annualInterestRate: input.annualInterestRate,
        loanTermYears: input.loanTermYears,
        paymentsPerYear: input.paymentsPerYear,
        monthlyExtraPayment: input.monthlyExtraPayment,
        extraPayments: input.extraPayments,
        startDate: input.startDate.toISOString(),
        updatedAt: serverTimestamp()
      };

      if (existingId) {
        await updateDoc(doc(db, 'schedules', existingId), scheduleData);
      } else {
        await addDoc(collection(db, 'schedules'), {
          ...scheduleData,
          createdAt: serverTimestamp()
        });
      }
      
      await loadSchedules();
      if (sharedProjectId) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      setCurrentScheduleName(name);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'schedules');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditName = async () => {
    if (!editingProject || !editNameInput.trim()) return;
    try {
      await updateDoc(doc(db, 'schedules', editingProject.id), {
        name: editNameInput.trim(),
        updatedAt: serverTimestamp()
      });
      setSavedSchedules(prev => prev.map(s => s.id === editingProject.id ? { ...s, name: editNameInput.trim() } : s));
      if (currentScheduleName === editingProject.name) {
        setCurrentScheduleName(editNameInput.trim());
      }
      setEditingProject(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `schedules/${editingProject.id}`);
    }
  };

  const handleDelete = async () => {
    if (!deletingProject) return;
    try {
      await deleteDoc(doc(db, 'schedules', deletingProject.id));
      setSavedSchedules(prev => prev.filter(s => s.id !== deletingProject.id));
      setDeletingProject(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `schedules/${deletingProject.id}`);
    }
  };

  const openShareModal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}?project=${id}`;
    setShareLink(url);
    setCopied(false);
  };

  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Custom Amortize</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                {isGuest ? 'Guest User' : auth.currentUser?.email}
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isGuest && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800">Guest Mode Active</h3>
              <p className="mt-1 text-sm text-blue-600">
                You are test-driving the app. You can use all calculator features, but saving schedules is disabled.
              </p>
            </div>
          </div>
        )}

        {sharedProjectId && currentScheduleName && (
          <div className="mb-8 bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Share2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-indigo-800">Viewing Shared Project: {currentScheduleName}</h3>
              <p className="mt-1 text-sm text-indigo-600">
                You are viewing a shared amortization schedule. {isGuest ? "Log in to save your own copy." : "You can save a copy to your account."}
              </p>
            </div>
          </div>
        )}

        {!isGuest && savedSchedules.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Saved Schedules
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {savedSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  onClick={() => {
                    setCurrentSchedule(schedule.data);
                    setCurrentScheduleName(schedule.name);
                    if (sharedProjectId) {
                      window.history.replaceState({}, document.title, window.location.pathname);
                    }
                  }}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all text-left cursor-pointer group relative"
                >
                  <div className="pr-20">
                    <h3 className="font-medium text-gray-900 truncate">{schedule.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      ${schedule.data.loanAmount?.toLocaleString()} @ {schedule.data.annualInterestRate}%
                    </p>
                  </div>
                  
                  <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => openShareModal(schedule.id, e)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Share"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProject(schedule);
                        setEditNameInput(schedule.name);
                      }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      title="Edit Name"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingProject(schedule);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <AmortizationCalculator 
            key={currentSchedule ? 'loaded' : 'new'} 
            initialData={currentSchedule} 
            onSave={handleSaveClick}
            isGuest={isGuest}
          />
        )}
      </main>

      {/* Guest Alert Modal */}
      {guestAlertOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Sign In Required</h3>
            <p className="text-gray-600 mb-6">Please sign in to save your schedule.</p>
            <div className="flex justify-end">
              <button
                onClick={() => setGuestAlertOpen(false)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Save Schedule</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
              <input
                type="text"
                value={saveNameInput}
                onChange={(e) => setSaveNameInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="My Mortgage"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubmit}
                disabled={!saveNameInput.trim() || isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overwrite Confirm Modal */}
      {overwriteConfirmOpen && projectToOverwrite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Overwrite Project?</h3>
            <p className="text-gray-600 mb-6">
              A schedule named "{projectToOverwrite.name}" already exists. Do you want to overwrite it with your current changes?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setOverwriteConfirmOpen(false);
                  setSaveModalOpen(true);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleOverwriteConfirm}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Overwrite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Name Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Project Name</h3>
              <button onClick={() => setEditingProject(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={editNameInput}
              onChange={(e) => setEditNameInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-6"
              placeholder="Project Name"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingProject(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditName}
                disabled={!editNameInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Project</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{deletingProject.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingProject(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Share Project</h3>
              <button onClick={() => setShareLink(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Anyone with this link can view this amortization schedule.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600 text-sm focus:outline-none"
              />
              <button
                onClick={copyShareLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
