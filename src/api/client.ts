import { invoke } from "@tauri-apps/api/core";

let _baseUrl: string | null = null;

async function baseUrl(): Promise<string> {
  if (!_baseUrl) {
    // In dev, use a fixed port; in prod Tauri passes the port via command
    if (import.meta.env.DEV) {
      _baseUrl = "http://127.0.0.1:8743";
    } else {
      const port = await invoke<number>("get_backend_port");
      _baseUrl = `http://127.0.0.1:${port}`;
    }
  }
  return _baseUrl;
}

export async function get<T>(path: string, params?: Record<string, string | string[]>): Promise<T> {
  const url = new URL(path, await baseUrl());
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((item) => url.searchParams.append(k, item));
      } else {
        url.searchParams.set(k, v);
      }
    });
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${await baseUrl()}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json();
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${await baseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${await baseUrl()}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  return res.json();
}
