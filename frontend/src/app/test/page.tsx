"use client";

export default function TestPage() {
  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-4xl font-bold text-black mb-4">
        ✅ Test Sayfası Çalışıyor!
      </h1>
      <p className="text-gray-700 text-lg">
        Eğer bu sayfayı görüyorsanız, Next.js çalışıyor demektir.
      </p>
      <div className="mt-8 p-4 bg-blue-100 rounded-lg">
        <p className="text-blue-900">
          <strong>Durum:</strong> Frontend aktif
        </p>
      </div>
      <div className="mt-4">
        <a
          href="/"
          className="text-blue-600 hover:underline"
        >
          ← Ana Sayfaya Dön
        </a>
      </div>
    </div>
  );
}

