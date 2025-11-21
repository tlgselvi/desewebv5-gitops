import { decodeJwt } from "jose";
import { api } from "../api/client";

export async function login(username: string, password: string) {
  const res = await api.post("/auth/login", { username, password });
  // Backend returns { success: true, token: string, user: {...} }
  const token = res.data.token || res.data.access_token;
  if (!token) {
    throw new Error("No token received from server");
  }
  localStorage.setItem("token", token);
  return decodeJwt(token);
}

export function logout() {
  localStorage.removeItem("token");
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getUserRole(): string | null {
  const token = getToken();
  if (!token) return null;
  const decoded: any = decodeJwt(token);
  return decoded?.role || null;
}
