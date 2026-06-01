const BASE = "https://wqk4qyf5b3hpec5u4hiv7j3qiq0tlcpp.lambda-url.eu-west-1.on.aws/";
const LOCAL = false//["localhost", "127.0.0.1"].includes(window.location.hostname);

const LS_PREFIX = "ohanatv_kv_";

export async function kvRead(token) {
  if (LOCAL) {
    const raw = localStorage.getItem(LS_PREFIX + token);
    return raw ? JSON.parse(raw) : null;
  }
  const res = await fetch(`${BASE}read`, { headers: { "x-write-token": token } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`kvRead ${res.status}`);
  return res.json();
}

export async function kvWrite(token, data) {
  if (LOCAL) {
    localStorage.setItem(LS_PREFIX + token, JSON.stringify(data));
    return;
  }
  const res = await fetch(`${BASE}write`, {
    method: "PUT",
    headers: { "x-write-token": token, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  console.log(res)
  if (!res.ok) throw new Error(`kvWrite ${res.status}`);
}

export function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
}
