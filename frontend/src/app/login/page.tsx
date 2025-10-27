"use client";
import { useState } from "react";
import { login } from "../../lib/auth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const handleLogin = async () => {
    try {
      await login(username, password);
      setStatus("success");
      window.location.href = "/";
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-xl font-bold">Login</h1>
      <input className="border p-2" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input className="border p-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="bg-blue-500 text-white px-4 py-2" onClick={handleLogin}>Login</button>
      {status === "error" && <p className="text-red-500">Login failed</p>}
    </div>
  );
}