"use client";

import { useEffect, useState } from "react";

type UserRow={id:string;name:string;email:string;is_active:boolean;role:string};

const roles=[
  ["ADMIN","Admin"],
  ["VETERINARIAN","Veteriner Hekim"],
  ["VETERINARY_DATA_ENTRY","Veteriner Veri Girişçisi"],
  ["VETERINARY_STUDENT","Veteriner Öğrencisi"],
];

export default function AdminUsers(){
  const [users,setUsers]=useState<UserRow[]>([]);
  const [error,setError]=useState("");
  const [form,setForm]=useState({name:"",email:"",password:"",role:"VETERINARY_STUDENT"});
  const load=async()=>{const r=await fetch("/api/admin/users");const j=await r.json();if(!r.ok){setError(j.error||"Yüklenemedi");return}setUsers(j.data||[])};
  useEffect(()=>{void load()},[]);
  async function create(){const r=await fetch("/api/admin/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const j=await r.json();if(!r.ok){setError(j.error||"Oluşturulamadı");return}setForm({name:"",email:"",password:"",role:"VETERINARY_STUDENT"});await load()}
  async function change(userId:string,payload:Record<string,unknown>){const r=await fetch("/api/admin/users",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,...payload})});const j=await r.json();if(!r.ok){setError(j.error||"Güncellenemedi");return}await load()}
  return <div className="mt-5">
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-bold">Yeni kullanıcı</h3>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <input className="rounded-xl border p-3" placeholder="Ad Soyad" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <input className="rounded-xl border p-3" placeholder="E-posta" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
        <input className="rounded-xl border p-3" placeholder="En az 12 karakter şifre" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
        <select className="rounded-xl border p-3" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{roles.map(r=><option key={r[0]} value={r[0]}>{r[1]}</option>)}</select>
      </div>
      <button onClick={create} className="mt-3 rounded-xl bg-slate-950 px-4 py-3 font-bold text-white">Kullanıcı oluştur</button>
    </div>
    {error&&<div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="mt-5 space-y-3">{users.map(u=><div key={u.id} className="rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div><b>{u.name}</b><div className="text-sm text-slate-500">{u.email}</div></div>
        <div className="flex flex-wrap gap-2">
          <select className="rounded-xl border px-3 py-2 text-sm" value={u.role} onChange={e=>void change(u.id,{role:e.target.value})}>{roles.map(r=><option key={r[0]} value={r[0]}>{r[1]}</option>)}</select>
          <button onClick={()=>void change(u.id,{isActive:!u.is_active})} className={`rounded-xl px-3 py-2 text-sm font-bold ${u.is_active?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700"}`}>{u.is_active?"Aktif":"Pasif"}</button>
        </div>
      </div>
    </div>)}</div>
  </div>
}