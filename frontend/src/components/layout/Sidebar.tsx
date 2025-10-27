"use client";

export default function Sidebar() {
  return (
    <aside className="w-56 h-screen bg-gray-100 border-r p-4 space-y-4">
      <nav className="flex flex-col gap-2 text-sm">
        <a href="/" className="hover:font-semibold">Dashboard</a>
        <a href="/optimization" className="hover:font-semibold">Optimization</a>
        <a href="/aiops" className="hover:font-semibold">AIOps</a>
      </nav>
    </aside>
  );
}
