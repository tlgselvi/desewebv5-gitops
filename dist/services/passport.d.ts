/**
 * Passport Google OAuth Strategy
 * Handles Google OAuth authentication and user creation/retrieval
 */
interface PassportUser {
    id: string;
    email: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
}
declare global {
    namespace Express {
        interface User extends PassportUser {
        }
    }
}
export {};
//# sourceMappingURL=passport.d.ts.map