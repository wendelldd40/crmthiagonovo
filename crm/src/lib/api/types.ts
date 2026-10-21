import type { CurrentUser, UserRow } from "@/lib/types";

export type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export type Table = "funnels" | "leads" | "tasks" | "mentorships";

export interface RawSnapshot {
  funnels: Row[];
  leads: Row[];
  tasks: Row[];
  mentorships: Row[];
  settings: { key: string; value: string }[];
}

export interface Backend {
  session(): Promise<CurrentUser | null>;
  signIn(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
  accessToken(): Promise<string | null>;
  getLead(id: string): Promise<Row | null>;
  loadAll(): Promise<RawSnapshot>;
  insert(table: Table, row: Row): Promise<Row>;
  /** insere várias linhas de uma vez (importação) */
  insertMany(table: Table, rows: Row[]): Promise<Row[]>;
  update(table: Table, id: string, patch: Row): Promise<void>;
  remove(table: Table, id: string): Promise<void>;
  removeWhere(table: Table, col: string, value: string): Promise<void>;
  setSetting(key: string, value: string): Promise<void>;
  listUsers(): Promise<UserRow[]>;
  updateUser(id: string, patch: Partial<Pick<UserRow, "name" | "role" | "avatar">>): Promise<void>;
}
