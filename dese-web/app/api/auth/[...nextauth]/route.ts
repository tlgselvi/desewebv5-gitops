import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
	providers: [
		CredentialsProvider({
			name: "Credentials",
			credentials: {
				username: { label: "Username", type: "text" },
				password: { label: "Password", type: "password" },
			},
			async authorize(creds) {
				if (!creds?.username || !creds?.password) return null;
				
				try {
					const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
					const res = await fetch(`${apiUrl}/auth/login`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ username: creds.username, password: creds.password }),
					});
					
					if (!res.ok) return null;
					const user = await res.json();
					return user ?? null;
				} catch (error) {
					console.error('Auth error:', error);
					return null;
				}
			},
		}),
	],
	session: { strategy: "jwt" },
	jwt: { 
		secret: process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-key-change-in-production'
	},
	pages: {
		signIn: '/login',
	},
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.role = (user as any).role;
			}
			return token;
		},
		async session({ session, token }) {
			if (token) {
				(session.user as any).role = token.role;
			}
			return session;
		},
	},
})

export { handler as GET, handler as POST };