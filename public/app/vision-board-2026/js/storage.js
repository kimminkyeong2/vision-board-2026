
import { db } from './firebase-init.js';
import {
    collection, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// === Firebase Collection Names ===
// Using unique names to avoid conflict with other apps in the same project
const COLLECTIONS = {
    USERS: 'vb_users',
    PROJECTS: 'vb_projects'
};

// Global variables to mimic synchronous state from localStorage
let LOCAL_CACHE = {
    users: {},
    projects: [],
    settings: { bgColor: '#ffffff' }
};

// Helper: Sync Cache (Optional, mostly we fetch fresh or use listeners)
const syncCache = async () => {
    // For now, we will rely on direct async calls or listeners
};

const Storage = {
    // --- Initialization ---
    // Start listening to real-time updates for projects
    init: function (onUpdateCallback) {
        const userId = sessionStorage.getItem('vboard_user');
        if (!userId) return;

        // Listen to user's projects in real-time
        const q = query(
            collection(db, COLLECTIONS.PROJECTS),
            where("userId", "==", userId)
        );

        onSnapshot(q, (querySnapshot) => {
            const projects = [];
            querySnapshot.forEach((doc) => {
                projects.push(doc.data());
            });
            LOCAL_CACHE.projects = projects;
            if (onUpdateCallback) onUpdateCallback(projects);
        });
    },

    // --- User Methods (Async) ---
    // Returns true if login successful
    validateUser: async function (id, password) {
        // Here we store password in plain text or simple hash as per original design.
        // In production, use Firebase Authentication.
        // For this task, we migrate the localStorage structure to Firestore documents.
        try {
            const userRef = doc(db, COLLECTIONS.USERS, id);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();
                return userData.password === password;
            } else {
                return false; // User not found
            }
        } catch (e) {
            console.error("Login Error", e);
            return false;
        }
    },

    registerUser: async function (id, password) {
        try {
            const userRef = doc(db, COLLECTIONS.USERS, id);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                return false; // Already exists
            }

            // Create new user document
            await setDoc(userRef, {
                id: id,
                password: password,
                createdAt: new Date().toISOString()
            });
            return true;
        } catch (e) {
            console.error("Register Error", e);
            return false;
        }
    },

    // --- Project Methods ---
    // To minimize app.js refactoring, we keep getProjects sync reading from cache,
    // but actions (add/update) are async fire-and-forget or awaited.

    getProjects: function () {
        // Return from local cache which is kept in sync via init listener
        // Filter just in case, though listener already filters by userId
        const currentUserId = sessionStorage.getItem('vboard_user');
        return LOCAL_CACHE.projects.filter(p => p.userId === currentUserId);
    },

    addProject: async function (project) {
        try {
            const newProject = {
                id: Date.now().toString(),
                userId: sessionStorage.getItem('vboard_user'),
                ...project, // includes image dataURL
                todos: [],
                x: Math.max(50, Math.min(window.innerWidth - 250, Math.random() * (window.innerWidth - 300) + 150)),
                y: Math.max(150, Math.min(window.innerHeight - 250, Math.random() * (window.innerHeight - 300) + 200)),
                zIndex: 10 // Default safely above background
            };

            // Save to Firestore
            await setDoc(doc(db, COLLECTIONS.PROJECTS, newProject.id), newProject);

            // Optimistic update (optional since listener will catch it)
            // But dragging feels better if immediate. We let listener handle it for consistency.
        } catch (e) {
            console.error("Add Project Error", e);
            alert("저장 중 오류가 발생했습니다: " + e.message);
        }
    },

    updateProject: async function (projectId, updates) {
        try {
            const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId);
            await updateDoc(projectRef, updates);
        } catch (e) {
            console.error("Update Error", e);
        }
    },

    deleteProject: async function (projectId) {
        try {
            await deleteDoc(doc(db, COLLECTIONS.PROJECTS, projectId));
        } catch (e) {
            console.error("Delete Error", e);
        }
    },

    savePosition: function (projectId, x, y) {
        // Fire and forget update for dragging to avoid blocking UI
        this.updateProject(projectId, { x, y });
    },

    // --- Settings (Local for now or User Doc) ---
    getSettings: function () {
        return LOCAL_CACHE.settings;
    },

    saveSettings: function (settings) {
        LOCAL_CACHE.settings = { ...LOCAL_CACHE.settings, ...settings };
        // Ideally save to user doc, skip for now to keep simple
    }
};

export { Storage };
