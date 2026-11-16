import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, isLocalPreview } from '../firebase';
import { createId } from './utils';

const STORAGE_KEY = 'qlcv.local-preview.v1';
const CHANGE_EVENT = 'qlcv-preview-change';
export const QUICK_TASKS = ['HSCV', 'Mạng', 'Máy in'];

function initialTasks() {
  const now = Date.now();
  const minutesAgo = (minutes) => new Date(now - minutes * 60000).toISOString();
  return [
    { id: 'demo-1', customerName: 'Chị Thu Hà', address: 'Phòng Hành chính · Tầng 2', categories: ['HSCV'], details: 'Không đăng nhập được hệ thống, cần hỗ trợ trước cuộc họp.', content: 'HSCV — Không đăng nhập được hệ thống, cần hỗ trợ trước cuộc họp.', isUrgent: true, status: 'pending', createdAt: minutesAgo(24) },
    { id: 'demo-2', customerName: 'Anh Minh', address: 'Phòng Kế toán · Tầng 3', categories: ['Máy in'], details: 'Máy in báo kẹt giấy, không in được chứng từ.', content: 'Máy in — Máy in báo kẹt giấy, không in được chứng từ.', isUrgent: false, status: 'pending', createdAt: minutesAgo(42) },
    { id: 'demo-3', customerName: 'Chị Ngọc Anh', address: 'Bộ phận Một cửa · Tầng 1', categories: ['Mạng', 'HSCV'], details: 'Kết nối chập chờn khi xử lý hồ sơ.', content: 'Mạng · HSCV — Kết nối chập chờn khi xử lý hồ sơ.', isUrgent: false, status: 'pending', createdAt: minutesAgo(12) },
    { id: 'demo-4', customerName: 'Anh Hoàng', address: 'Phòng Kỹ thuật · Tầng 2', categories: ['Mạng'], details: '', content: 'Mạng', isUrgent: false, status: 'pending', createdAt: minutesAgo(5) },
    { id: 'demo-5', customerName: 'Chị Mai', address: 'Phòng Nhân sự · Tầng 2', categories: ['Máy in'], details: 'Cài máy in cho máy tính mới.', content: 'Máy in — Cài máy in cho máy tính mới.', isUrgent: false, status: 'completed', createdAt: minutesAgo(80), completedAt: minutesAgo(65) },
  ];
}

function readLocalTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  const tasks = initialTasks();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  return tasks;
}

function writeLocalTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeTasks(onData, onError) {
  if (!isLocalPreview) {
    return onSnapshot(query(collection(db, 'tasks'), orderBy('createdAt', 'desc')), { includeMetadataChanges: true }, (snapshot) => {
      onData(snapshot.docs.map((item) => ({ ...item.data(), id: item.id })), snapshot.metadata);
    }, onError);
  }
  const emit = () => {
    try { onData(readLocalTasks(), { fromCache: false, hasPendingWrites: false }); }
    catch (error) { onError(error); }
  };
  emit();
  window.addEventListener(CHANGE_EVENT, emit);
  window.addEventListener('storage', emit);
  return () => {
    window.removeEventListener(CHANGE_EVENT, emit);
    window.removeEventListener('storage', emit);
  };
}

export async function createTask(data) {
  if (!isLocalPreview) return addDoc(collection(db, 'tasks'), { ...data, createdAt: serverTimestamp() });
  const task = { ...data, id: createId(), createdAt: new Date().toISOString() };
  writeLocalTasks([task, ...readLocalTasks()]);
  return task;
}

export async function editTask(id, data) {
  if (!isLocalPreview) return updateDoc(doc(db, 'tasks', id), data);
  writeLocalTasks(readLocalTasks().map((task) => task.id === id ? { ...task, ...data } : task));
}

export async function completeTask(id) {
  return editTask(id, { status: 'completed', completedAt: isLocalPreview ? new Date().toISOString() : serverTimestamp() });
}

export async function removeTask(id) {
  if (!isLocalPreview) return deleteDoc(doc(db, 'tasks', id));
  writeLocalTasks(readLocalTasks().filter((task) => task.id !== id));
}
