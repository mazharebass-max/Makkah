const mem = new Map<string, string>();

export async function setItemAsync(key: string, value: string) {
  mem.set(key, value);
}

export async function getItemAsync(key: string) {
  return mem.get(key) ?? null;
}

export async function deleteItemAsync(key: string) {
  mem.delete(key);
}
