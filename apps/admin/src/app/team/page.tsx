'use client';
import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api';

const ROLES = [
  { key: 'super_admin', label: 'Super Admin', desc: 'Full control, can assign any role', color: 'text-red-400' },
  { key: 'admin', label: 'Admin', desc: 'Full control except assigning super_admin', color: 'text-emerald-400' },
  { key: 'content_manager', label: 'Content Manager', desc: 'Reports, elections, livestreams, moderation, academy', color: 'text-blue-400' },
  { key: 'finance_admin', label: 'Finance Admin', desc: 'Revenue, tips, campaigns, businesses, challenges', color: 'text-yellow-400' },
  { key: 'support_admin', label: 'Support Admin', desc: 'Users, notifications, moderation queue', color: 'text-purple-400' },
];

export default function TeamPage() {
  const [team, setTeam] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin');
  const [message, setMessage] = useState('');
  const [myRole, setMyRole] = useState('');

  const load = () => {
    adminAPI.getTeam().then(d => setTeam(d.team || [])).catch(() => {});
    adminAPI.getMe().then(d => setMyRole(d.role)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async () => {
    if (!email.trim()) { setMessage('Enter an email'); return; }
    try {
      await adminAPI.inviteAdmin(email.trim(), role);
      setMessage('✅ Admin invited successfully!');
      setEmail('');
      load();
    } catch (e: any) { setMessage('❌ ' + (e.message || 'Failed')); }
    setTimeout(() => setMessage(''), 4000);
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await adminAPI.changeRole(userId, newRole);
      load();
    } catch (e: any) { setMessage('❌ ' + (e.message || 'Failed')); setTimeout(() => setMessage(''), 3000); }
  };

  const handleRevoke = async (userId: string) => {
    if (!confirm('Revoke admin access? They will become a regular citizen.')) return;
    try {
      await adminAPI.revokeAccess(userId);
      load();
    } catch (e: any) { setMessage('❌ ' + (e.message || 'Failed')); setTimeout(() => setMessage(''), 3000); }
  };

  const canManage = ['super_admin', 'admin'].includes(myRole);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">👥 Admin Team</h1>

      {/* Invite Form */}
      {canManage && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6 max-w-lg">
          <h2 className="font-semibold mb-4">Invite New Admin</h2>
          <p className="text-xs text-gray-400 mb-4">User must have a ReportAfrica account first. Enter their email and assign a role.</p>
          <div className="space-y-3">
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="User's email address"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 outline-none focus:border-emerald-500" />
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 outline-none">
              {ROLES.map(r => (
                <option key={r.key} value={r.key}>{r.label} — {r.desc}</option>
              ))}
            </select>
            {message && <p className="text-sm">{message}</p>}
            <button onClick={handleInvite} className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-500">
              ➕ Invite Admin
            </button>
          </div>
        </div>
      )}

      {/* Role Legend */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {ROLES.map(r => (
            <div key={r.key} className="flex items-start gap-2">
              <span className={`text-xs font-bold ${r.color}`}>{r.label}</span>
              <span className="text-xs text-gray-500">{r.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Team List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-750 border-b border-gray-700">
            <tr className="text-left text-gray-400">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
              {canManage && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {team.map((m: any) => (
              <tr key={m.id} className="hover:bg-gray-750">
                <td className="px-4 py-3 font-medium">{m.displayName || m.username}</td>
                <td className="px-4 py-3 text-gray-400">{m.email}</td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <select value={m.role} onChange={e => handleChangeRole(m.id, e.target.value)}
                      className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-gray-200 outline-none">
                      {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                  ) : (
                    <span className={`text-xs font-bold ${ROLES.find(r => r.key === m.role)?.color || 'text-gray-400'}`}>{m.role}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(m.createdAt).toLocaleDateString()}</td>
                {canManage && (
                  <td className="px-4 py-3">
                    <button onClick={() => handleRevoke(m.id)} className="text-xs text-red-400 hover:text-red-300">Revoke</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-4">Total admins: {team.length}</p>
    </div>
  );
}
