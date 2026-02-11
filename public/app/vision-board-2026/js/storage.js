const STORAGE_KEY = 'vision_board_2026_data';

const Storage = {
    getData: function () {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {
            users: {}, // { "id": "hashed_pw" } (Simplified for demo: { "id": "4digit" })
            projects: [], // Array of project objects
            settings: {
                bgColor: '#ffffff'
            }
        };
    },

    saveData: function (data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Storage Error:', e);
            if (e.name === 'QuotaExceededError') {
                alert('저장 공간이 부족합니다! 너무 많은 이미지가 등록되어 있을 수 있습니다. 기존 프로젝트를 삭제하거나 작은 이미지 파일을 사용해주세요.');
            }
        }
    },

    // User Methods
    registerUser: function (id, password) {
        const data = this.getData();
        if (!data.users[id]) {
            data.users[id] = password;
            this.saveData(data);
            return true;
        }
        return false;
    },

    validateUser: function (id, password) {
        const data = this.getData();
        return data.users[id] === password;
    },

    // Project Methods
    addProject: function (project) {
        const data = this.getData();
        data.projects.push({
            id: Date.now().toString(),
            userId: sessionStorage.getItem('vboard_user'),
            ...project,
            todos: [],
            x: Math.max(50, Math.min(window.innerWidth - 250, Math.random() * (window.innerWidth - 300) + 150)),
            y: Math.max(150, Math.min(window.innerHeight - 250, Math.random() * (window.innerHeight - 300) + 200))
        });
        this.saveData(data);
    },

    getProjects: function () {
        const data = this.getData();
        const currentUserId = sessionStorage.getItem('vboard_user');
        return data.projects.filter(p => p.userId === currentUserId);
    },

    updateProject: function (projectId, updates) {
        const data = this.getData();
        const index = data.projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
            data.projects[index] = { ...data.projects[index], ...updates };
            this.saveData(data);
        }
    },

    savePosition: function (projectId, x, y) {
        this.updateProject(projectId, { x, y });
    },

    deleteProject: function (projectId) {
        const data = this.getData();
        data.projects = data.projects.filter(p => p.id !== projectId);
        this.saveData(data);
    },

    // Settings
    getSettings: function () {
        return this.getData().settings;
    },

    saveSettings: function (settings) {
        const data = this.getData();
        data.settings = { ...data.settings, ...settings };
        this.saveData(data);
    }
};
