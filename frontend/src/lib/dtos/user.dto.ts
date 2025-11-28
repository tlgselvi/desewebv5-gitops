/**
 * User DTO (Data Transfer Object)
 * Defines the structure of user data in the application
 */

export type UserRole = "Admin" | "User";
export type UserStatus = "Active" | "Passive";

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: string | null; // ISO date string or null
}

