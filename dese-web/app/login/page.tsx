"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
	const router = useRouter();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		const res = await signIn("credentials", {
			username,
			password,
			redirect: false,
		});
		setLoading(false);
		if (res?.ok) {
			router.push("/aiops");
		} else {
			setError("Login failed. Please check your credentials.");
		}
	};

	return (
		<div className="min-h-[60vh] flex items-center justify-center">
			<div className="w-full max-w-md bg-card border rounded-lg p-6">
				<h1 className="text-2xl font-bold mb-1">Sign in</h1>
				<p className="text-sm text-muted-foreground mb-6">Use your credentials to continue.</p>
				<form onSubmit={onSubmit} className="space-y-4">
					<div>
						<label htmlFor="username" className="block text-sm font-medium mb-2">Username</label>
						<input
							id="username"
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							className="w-full p-3 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
							required
						/>
					</div>
					<div>
						<label htmlFor="password" className="block text-sm font-medium mb-2">Password</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full p-3 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
							required
						/>
					</div>
					<button
						type="submit"
						disabled={loading}
						className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
					>
						{loading ? "Signing in..." : "Sign in"}
					</button>
				</form>
				{error && (
					<p className="text-sm text-red-600 mt-3">{error}</p>
				)}
			</div>
		</div>
	);
}
