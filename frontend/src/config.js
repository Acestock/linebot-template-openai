// 後端 API 基底 URL
// 開發模式：空字串（Vite proxy 自動轉發）
// Production：從環境變數 VITE_API_URL 讀取後端網址
const API_BASE = import.meta.env.VITE_API_URL || '';

export default API_BASE;

// Authenticated fetch — automatically adds Authorization header from localStorage
export function authFetch(url, options = {}) {
  const token = localStorage.getItem('adminToken') || '';
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
}
