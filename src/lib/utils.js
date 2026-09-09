import { supabase } from './supabaseClient.js'

export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]))
}

export function sanitizeSearch(str) {
  return str.replace(/[%_\\]/g, '\\$&')
}

export function debounce(fn, ms) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}

const CACHE_TTL = 5 * 60 * 1000

function getCached(key) {
  const item = localStorage.getItem(key)
  if (!item) return null
  const { data, timestamp } = JSON.parse(item)
  if (Date.now() - timestamp > CACHE_TTL) {
    localStorage.removeItem(key)
    return null
  }
  return data
}

function setCached(key, data) {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
}

export async function getClasses() {
  const cached = getCached('classes_cache')
  if (cached) return cached
  const { data } = await supabase.from("classes").select("*").order("name")
  if (data) setCached('classes_cache', data)
  return data || []
}

export function clearClassesCache() {
  localStorage.removeItem('classes_cache')
}

export function toast(msg, type = "info") {
  let el = document.getElementById("toast")
  if (!el) {
    el = document.createElement("div")
    el.id = "toast"
    el.className = "toast"
    document.body.appendChild(el)
  }
  el.textContent = msg
  el.className = "toast " + type
  el.style.display = "block"
  setTimeout(() => { el.style.display = "none" }, 3000)
}
