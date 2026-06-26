import { del, get, post, put } from "./client";

export interface Collection {
  id: string;
  name: string;
  color: string;
  game_ids: string[]; // "platform:id" format
}

export const getCollections = () =>
  get<Collection[]>("/collections");

export const createCollection = (name: string, color: string) =>
  post<Collection>("/collections", { name, color });

export const updateCollection = (id: string, data: Omit<Collection, "id">) =>
  put<Collection>(`/collections/${id}`, data);

export const deleteCollection = (id: string) =>
  del<{ status: string }>(`/collections/${id}`);
