"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout";
import { Plus, Loader2, Key, Trash2 } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({username:"",password:"",role:"staff"}); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState("");
  const [pwForm, setPwForm] = useState({username:"",password:""});
  const [showPwForm, setShowPwForm] = useState(false);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users"); if(res.ok) setUsers((await res.json()).users); setLoading(false);
  },[]);

  useEffect(()=>{fetchUsers();},[fetchUsers]);

  async function handleCreate(e:React.FormEvent){e.preventDefault();setError("");setSubmitting(true);
    try{const res=await fetch("/api/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const data=await res.json();if(!res.ok){setError(data.error||"Failed");return;}setForm({username:"",password:"",role:"staff"});setShowForm(false);fetchUsers();}catch{setError("Network error")}finally{setSubmitting(false);}}

  async function handleChangePw(e:React.FormEvent){e.preventDefault();setError("");setSubmitting(true);
    try{const res=await fetch("/api/users",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(pwForm)});const data=await res.json();if(!res.ok){setError(data.error||"Failed");return;}setPwForm({username:"",password:""});setShowPwForm(false);}catch{setError("Network error")}finally{setSubmitting(false);}}

  async function handleDelete(username:string){if(!confirm(`Delete user "${username}"?`))return;
    try{const res=await fetch(`/api/users?username=${encodeURIComponent(username)}`,{method:"DELETE"});const data=await res.json();if(!res.ok){alert(data.error||"Failed");return;}fetchUsers();}catch{alert("Network error")}}

  return (
    <AppLayout>
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between"><h1 className="text-heading-3 text-fg-primary dark:text-gray-100">Users</h1>
          <div className="flex gap-2">
            <button onClick={()=>{setShowPwForm(!showPwForm);setShowForm(false)}} className="btn-ghost flex items-center gap-1.5"><Key className="w-4 h-4"/>Change PW</button>
            <button onClick={()=>{setShowForm(!showForm);setShowPwForm(false)}} className="btn-primary flex items-center gap-1.5"><Plus className="w-4 h-4"/>Add User</button>
          </div>
        </div>

        {showForm&&<form onSubmit={handleCreate} className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 space-y-3 shadow-sm animate-fade-in">
          <div><label className="block text-label text-fg-tertiary mb-1">Username</label><input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} className="input-linear w-full" required autoFocus/></div>
          <div><label className="block text-label text-fg-tertiary mb-1">Password</label><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="input-linear w-full" required/></div>
          <div><label className="block text-label text-fg-tertiary mb-1">Role</label><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className="select-linear w-full"><option value="staff">Staff</option><option value="admin">Admin</option></select></div>
          {error&&<p className="text-danger text-caption">{error}</p>}
          <div className="flex gap-2"><button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting?"Creating...":"Create"}</button><button type="button" onClick={()=>setShowForm(false)} className="btn-ghost">Cancel</button></div>
        </form>}

        {showPwForm&&<form onSubmit={handleChangePw} className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 space-y-3 shadow-sm animate-fade-in">
          <div><label className="block text-label text-fg-tertiary mb-1">Username</label><input value={pwForm.username} onChange={e=>setPwForm({...pwForm,username:e.target.value})} className="input-linear w-full" required autoFocus/></div>
          <div><label className="block text-label text-fg-tertiary mb-1">New Password</label><input type="password" value={pwForm.password} onChange={e=>setPwForm({...pwForm,password:e.target.value})} className="input-linear w-full" required/></div>
          {error&&<p className="text-danger text-caption">{error}</p>}
          <div className="flex gap-2"><button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting?"Updating...":"Change Password"}</button><button type="button" onClick={()=>setShowPwForm(false)} className="btn-ghost">Cancel</button></div>
        </form>}

        {loading?<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-fg-tertiary animate-spin"/></div>
        :<div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md overflow-hidden shadow-sm"><table className="table-linear"><thead><tr><th>Username</th><th>Role</th><th>Superuser</th><th>Actions</th></tr></thead><tbody>
          {users.map(user=><tr key={user.id}>
            <td className="font-[510] text-fg-primary dark:text-gray-100">{user.username}</td>
            <td><span className={`badge ${user.role==="admin"?"badge-warning":"badge-neutral"}`}>{user.role}</span></td>
            <td>{user.isSuperuser ? <span className="badge badge-danger">🔒 locked</span> : <span className="text-tiny text-fg-quaternary">—</span>}</td>
            <td>
              {!user.isSuperuser && (
                <button onClick={()=>handleDelete(user.username)} className="text-fg-quaternary hover:text-danger text-micro flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5"/>Delete
                </button>
              )}
            </td>
          </tr>)}
        </tbody></table></div>}
      </div>
    </AppLayout>
  );
}
