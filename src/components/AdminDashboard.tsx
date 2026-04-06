import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, Shield, User as UserIcon, Star, CheckCircle } from 'lucide-react';

interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'user';
  tier: 'Basic' | 'Premium';
  createdAt: any;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const fetchedUsers: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        fetchedUsers.push(doc.data() as UserProfile);
      });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTier = async (uid: string, newTier: 'Basic' | 'Premium', currentRole: 'admin' | 'user') => {
    setUpdating(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { tier: newTier, role: currentRole || 'user' });
      setUsers(users.map(u => u.uid === uid ? { ...u, tier: newTier, role: currentRole || 'user' } : u));
    } catch (error) {
      console.error("Error updating user tier:", error);
      alert("Failed to update user tier.");
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateRole = async (uid: string, newRole: 'admin' | 'user', currentTier: 'Basic' | 'Premium') => {
    setUpdating(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole, tier: currentTier || 'Basic' });
      setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole, tier: currentTier || 'Basic' } : u));
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Failed to update user role.");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const premiumCount = users.filter(u => u.tier === 'Premium').length;
  const basicCount = users.filter(u => u.tier === 'Basic').length;

  const pieData = [
    { name: 'Premium', value: premiumCount },
    { name: 'Basic', value: basicCount }
  ];

  const COLORS = ['#8b5cf6', '#3b82f6']; // Purple for Premium, Blue for Basic

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">User Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-sm text-purple-600 font-medium">Premium Users</p>
              <p className="text-2xl font-bold text-purple-900">{premiumCount}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-600 font-medium">Basic Users</p>
              <p className="text-2xl font-bold text-blue-900">{basicCount}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">All Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm">
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Tier</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(user => (
                  <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <UserIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.displayName || 'Unnamed User'}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.tier === 'Premium' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.tier === 'Premium' && <Star className="w-3 h-3" />}
                        {user.tier}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={user.tier || 'Basic'}
                          onChange={(e) => handleUpdateTier(user.uid, e.target.value as 'Basic' | 'Premium', user.role)}
                          disabled={updating === user.uid}
                          className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="Basic">Basic</option>
                          <option value="Premium">Premium</option>
                        </select>
                        <select
                          value={user.role || 'user'}
                          onChange={(e) => handleUpdateRole(user.uid, e.target.value as 'admin' | 'user', user.tier)}
                          disabled={updating === user.uid || user.email === 'dlaniger.napm.consulting@gmail.com'}
                          className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        {updating === user.uid && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
