import { decodeJwt } from "jose";
import { api } from "../api/client";

export async function login(username: string, password: string) {
  const res = await api.post("/auth/login", { username, password });
  localStorage.setItem("token", res.data.access_token);
  return decodeJwt(res.data.access_token);
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
