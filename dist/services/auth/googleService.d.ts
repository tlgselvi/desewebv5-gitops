/**
 * Google OAuth Service
 * Handles Google OAuth 2.0 authentication flow
 */
export declare const googleService: {
    /**
     * Get Google OAuth authorization URL
     * Returns the Google login URL with proper scopes (email, profile)
     */
    getGoogleAuthURL(): string;
    /**
     * Verify Google token and fetch user profile
     * Exchanges the authorization code for tokens and fetches user profile
     */
    verifyGoogleToken(code: string): Promise<{
        email: string;
        name: string;
        given_name?: string;
        family_name?: string;
        picture?: string;
        verified_email: boolean;
    }>;
    /**
     * Handle social login
     * Check if user exists in DB, create if not, return user and JWT token
     */
    handleSocialLogin(email: string, name: string): Promise<{
        user: {
            id: string;
            email: string;
            role: string;
            firstName: string | null;
            lastName: string | null;
        };
        token: string;
    }>;
};
//# sourceMappingURL=googleService.d.ts.map