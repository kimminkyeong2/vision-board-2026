document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const authOverlay = document.getElementById('auth-overlay');
    const mainApp = document.getElementById('main-app');
    const loginId = document.getElementById('login-id');
    const loginPw = document.getElementById('login-pw');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const board = document.getElementById('board');
    const bgColorPicker = document.getElementById('bg-color-picker');
    const addProjectBtn = document.getElementById('add-project-btn');
    const projectModal = document.getElementById('project-modal');
    const detailModal = document.getElementById('detail-modal');
    const projectForm = document.getElementById('project-form');
    const closeModals = document.querySelectorAll('.close-modal');
    const manageModal = document.getElementById('manage-modal');
    const manageBtn = document.getElementById('manage-btn');
    const manageProjectList = document.getElementById('manage-project-list');

    let currentProjectId = null;

    // --- Authentication Logic ---
    const checkAuth = () => {
        const user = sessionStorage.getItem('vboard_user');
        if (user) {
            authOverlay.classList.add('hidden');
            mainApp.classList.remove('hidden');
            document.getElementById('user-title').innerText = `'${user}'님의 2026 VISION BOARD`;
            loadBoard();
        } else {
            authOverlay.classList.remove('hidden');
            mainApp.classList.add('hidden');
        }
    };

    loginBtn.addEventListener('click', () => {
        const id = loginId.value.trim();
        const pw = loginPw.value.trim();

        if (!id || pw.length !== 4) {
            alert('아이디와 4자리 비밀번호를 입력해주세요.');
            return;
        }

        // Simulating Registration & Login (If new user, register them)
        const data = Storage.getData();
        if (!data.users[id]) {
            Storage.registerUser(id, pw);
        }

        if (Storage.validateUser(id, pw)) {
            sessionStorage.setItem('vboard_user', id);
            checkAuth();
        } else {
            alert('비밀번호가 일치하지 않습니다.');
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('vboard_user');
        checkAuth();
    });

    // --- Vision Board Logic ---
    const loadBoard = () => {
        const settings = Storage.getSettings();
        document.body.style.backgroundColor = settings.bgColor;
        bgColorPicker.value = settings.bgColor;

        const projects = Storage.getProjects();
        renderStickers(projects);
    };

    bgColorPicker.addEventListener('input', (e) => {
        const color = e.target.value;
        document.body.style.backgroundColor = color;
    });

    bgColorPicker.addEventListener('change', (e) => {
        Storage.saveSettings({ bgColor: e.target.value });
    });

    const renderStickers = (projects) => {
        board.innerHTML = '';
        projects.forEach(project => {
            const sticker = document.createElement('div');
            sticker.className = 'sticker';
            sticker.style.left = `${project.x || 0}px`;
            sticker.style.top = `${project.y || 0}px`;
            sticker.style.width = `${project.size || 200}px`; // Added size
            sticker.style.zIndex = project.zIndex || 1; // Added z-index
            sticker.dataset.id = project.id;

            const total = project.todos.length;
            const completed = project.todos.filter(t => t.completed).length;
            const isExpired = new Date(project.endDate) < new Date() && completed < total;
            const isFinished = total > 0 && completed === total;

            let progress = total === 0 ? 0 : (completed / total);
            let opacity = 0.2 + (progress * 0.8);
            let filter = isFinished ? 'none' : `grayscale(${1 - progress})`;

            if (isExpired) {
                sticker.classList.add('expired');
                filter = 'grayscale(1) contrast(0.8)';
                opacity = 0.5;
            }
            if (isFinished) sticker.classList.add('finished');

            sticker.innerHTML = `
                <img src="${project.image}" alt="${project.name}" style="opacity: ${opacity}; filter: ${filter}" draggable="false">
                <div class="badge">${project.name}${isFinished ? ' ✨' : ''}</div>
                <div class="quick-tools">
                    <div class="tool-row">
                        <label>Size</label>
                        <input type="range" class="size-slider" min="100" max="400" step="1" value="${project.size || 200}">
                    </div>
                    <div class="tool-row">
                        <label>Layer</label>
                        <div class="tool-btn-group">
                            <button class="tool-btn front-btn">▲ Front</button>
                            <button class="tool-btn back-btn">▼ Back</button>
                            <button class="tool-btn delete-tool-btn" style="background: #fee2e2; color: #ef4444;">✕ Delete</button>
                        </div>
                    </div>
                </div>
            `;

            // Drag and Drop Logic
            let isDragging = false;
            let startX, startY, initialX, initialY;

            sticker.addEventListener('mousedown', (e) => {
                if (e.target.closest('.quick-tools')) return;

                // Bring to front on any click/mousedown
                const projects = Storage.getProjects();
                const maxZ = Math.max(...projects.map(p => p.zIndex || 1), 0);
                Storage.updateProject(project.id, { zIndex: maxZ + 1 });
                sticker.style.zIndex = maxZ + 1;

                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                initialX = project.x || 0;
                initialY = project.y || 0;
                sticker.style.transition = 'none';

                // Track if actually moved to distinguish click from drag
                sticker.dataset.moved = 'false';
            });

            const onMouseMove = (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    sticker.dataset.moved = 'true';
                }

                const newX = initialX + dx;
                const newY = initialY + dy;
                sticker.style.left = `${newX}px`;
                sticker.style.top = `${newY}px`;
            };

            const onMouseUp = () => {
                if (isDragging) {
                    isDragging = false;
                    sticker.style.transition = 'transform 0.3s ease, filter 0.5s ease, opacity 0.5s ease, width 0s';
                    const x = parseInt(sticker.style.left);
                    const y = parseInt(sticker.style.top);
                    Storage.savePosition(project.id, x, y);
                    project.x = x;
                    project.y = y;

                    // If it wasn't a drag, it's a click to open detail
                    if (sticker.dataset.moved === 'false') {
                        openProjectDetail(project.id);
                    }
                }
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);

            // Quick Tools Event Listeners
            const sizeSlider = sticker.querySelector('.size-slider');
            const frontBtn = sticker.querySelector('.front-btn');
            const backBtn = sticker.querySelector('.back-btn');

            sizeSlider.addEventListener('mousedown', () => {
                sticker.classList.add('resizing');
            });

            sizeSlider.addEventListener('input', (e) => {
                const size = e.target.value;
                sticker.style.width = `${size}px`;
            });

            sizeSlider.addEventListener('change', (e) => {
                const size = e.target.value;
                Storage.updateProject(project.id, { size: parseInt(size) });
                sticker.classList.remove('resizing');
            });

            // Handle potential mouseup outside the slider
            sizeSlider.addEventListener('mouseup', () => {
                sticker.classList.remove('resizing');
            });

            frontBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const projects = Storage.getProjects();
                const maxZ = Math.max(...projects.map(p => p.zIndex || 1), 0);
                Storage.updateProject(project.id, { zIndex: maxZ + 1 });
                loadBoard();
            });

            backBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const projects = Storage.getProjects();
                const minZ = Math.min(...projects.map(p => p.zIndex || 1), 0);
                Storage.updateProject(project.id, { zIndex: minZ - 1 });
                loadBoard();
            });

            const deleteBtn = sticker.querySelector('.delete-tool-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('이 프로젝트(스티커)를 삭제하시겠습니까?')) {
                    Storage.deleteProject(project.id);
                    loadBoard();
                }
            });

            sticker.addEventListener('dblclick', () => openProjectDetail(project.id));
            board.appendChild(sticker);
        });
    };

    // --- Year-long Checkbox Logic ---
    const setupYearLong = (checkboxId, startId, endId) => {
        const cb = document.getElementById(checkboxId);
        const start = document.getElementById(startId);
        const end = document.getElementById(endId);
        cb.addEventListener('change', () => {
            if (cb.checked) {
                start.value = '2026-01-01';
                end.value = '2026-12-31';
            }
        });
    };
    setupYearLong('proj-year-long', 'proj-start', 'proj-end');
    setupYearLong('edit-proj-year-long', 'edit-proj-start', 'edit-proj-end');

    addProjectBtn.addEventListener('click', () => {
        projectModal.classList.remove('hidden');
    });

    // --- Image Compression ---
    const compressImage = (imgData, maxWidth = 800, maxHeight = 800) => {
        return new Promise((resolve) => {
            // If it's a raw URL (not base64), we check if we can actually draw it to compress
            // But Pinterest often blocks this, so we might just return the raw URL
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                } catch (e) {
                    resolve(imgData); // Fallback to raw data/URL if canvas export fails
                }
            };
            img.onerror = () => resolve(imgData);
            img.src = imgData;
        });
    };

    // --- Source Selection Logic ---
    const sourceTabs = document.querySelectorAll('.source-tab');
    const sourceContents = document.querySelectorAll('.source-content');
    let currentSource = 'file';

    sourceTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            currentSource = tab.dataset.source;
            sourceTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            sourceContents.forEach(content => {
                content.classList.add('hidden');
                if (content.id === `source-${currentSource}`) {
                    content.classList.remove('hidden');
                }
            });
        });
    });

    // Emoji Presets Click
    document.querySelectorAll('.emoji-preset-panel span').forEach(span => {
        span.addEventListener('click', () => {
            document.getElementById('proj-emoji').value = span.innerText;
        });
    });

    const generateEmojiSticker = (emoji) => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 400, 400); // Transparent background
        ctx.font = '280px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji || '✨', 200, 215);

        return canvas.toDataURL('image/png');
    };

    const generateTextSticker = (text, color) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        ctx.font = 'bold 60px Outfit, Noto Sans KR';
        const lines = text.split('\n');
        let maxWidth = 0;
        lines.forEach(line => {
            const metrics = ctx.measureText(line);
            if (metrics.width > maxWidth) maxWidth = metrics.width;
        });

        canvas.width = Math.max(300, maxWidth + 60);
        canvas.height = (lines.length * 75) + 40;

        ctx.font = 'bold 60px Outfit, Noto Sans KR';
        ctx.fillStyle = color;
        ctx.textBaseline = 'top';

        lines.forEach((line, i) => {
            ctx.fillText(line, 30, 20 + (i * 75));
        });

        return canvas.toDataURL('image/png');
    };

    projectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        let imageData = '';

        try {
            if (currentSource === 'file') {
                const file = document.getElementById('proj-image').files[0];
                if (!file) throw new Error('파일을 선택해주세요.');
                imageData = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            } else if (currentSource === 'url') {
                const url = document.getElementById('proj-url').value;
                if (!url) throw new Error('이미지 주소를 입력해주세요.');

                // Try to convert to DataURL for local storage, but fallback to raw URL if CORS fails
                imageData = await new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.onload = () => {
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                            resolve(canvas.toDataURL('image/png'));
                        } catch (e) {
                            resolve(url); // CORS failure on canvas export
                        }
                    };
                    img.onerror = () => resolve(url); // Just use the raw URL if loading fails initially
                    img.src = url;
                });
            } else if (currentSource === 'emoji') {
                const emoji = document.getElementById('proj-emoji').value;
                imageData = generateEmojiSticker(emoji);
            } else if (currentSource === 'text') {
                const text = document.getElementById('proj-text-content').value;
                const color = document.getElementById('proj-text-color').value;
                if (!text) throw new Error('텍스트를 입력해주세요.');
                imageData = generateTextSticker(text, color);
            }

            const finalImage = (currentSource === 'emoji' || currentSource === 'text') ? imageData : await compressImage(imageData);

            const project = {
                name: document.getElementById('proj-name').value,
                startDate: document.getElementById('proj-start').value,
                endDate: document.getElementById('proj-end').value,
                goal: document.getElementById('proj-goal').value,
                image: finalImage
            };

            Storage.addProject(project);
            projectForm.reset();

            // Reset to default source
            currentSource = 'file';
            sourceTabs.forEach(t => t.classList.remove('active'));
            sourceTabs[0].classList.add('active');
            sourceContents.forEach(c => c.classList.add('hidden'));
            sourceContents[0].classList.remove('hidden');

            projectModal.classList.add('hidden');
            loadBoard();
        } catch (error) {
            console.error('Project addition failed:', error);
            alert(error.message || '등록 실패');
        }
    });

    // --- Dynamic Theme Logic ---
    const getDominantColor = (imgSrc) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = imgSrc;
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = 10;
                    canvas.height = 10;
                    ctx.drawImage(img, 0, 0, 10, 10);
                    const data = ctx.getImageData(0, 0, 10, 10).data;

                    let r = 0, g = 0, b = 0;
                    for (let i = 0; i < data.length; i += 4) {
                        r += data[i];
                        g += data[i + 1];
                        b += data[i + 2];
                    }
                    const count = data.length / 4;
                    r = Math.floor(r / count);
                    g = Math.floor(g / count);
                    b = Math.floor(b / count);

                    // Darken slightly for better text contrast if it's too bright
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    if (brightness > 200) {
                        r *= 0.8; g *= 0.8; b *= 0.8;
                    }

                    resolve(`rgb(${r}, ${g}, ${b})`);
                } catch (e) {
                    console.warn('CORS restricted image, using default theme color.');
                    resolve('#6366f1'); // Default fallback for CORS restricted images
                }
            };
            img.onerror = () => resolve('#6366f1'); // Default fallback
        });
    };

    // --- Project Detail & Todo ---
    const openProjectDetail = async (projectId) => {
        currentProjectId = projectId;
        const project = Storage.getProjects().find(p => p.id === projectId);
        if (!project) return;

        // Dynamic Tinting
        const themeColor = await getDominantColor(project.image);
        detailModal.style.setProperty('--theme-color', themeColor);

        // Modal UI is now handled by Premium CSS
        document.getElementById('detail-title').innerText = project.name;
        document.getElementById('detail-goal').innerText = project.goal;

        const periodDisplay = document.getElementById('detail-period-display');
        const periodText = document.getElementById('detail-period-text');
        const editSection = document.getElementById('detail-edit-section');
        const showEditBtn = document.getElementById('show-edit-dates-btn');

        const editStart = document.getElementById('edit-proj-start');
        const editEnd = document.getElementById('edit-proj-end');
        const editYearLong = document.getElementById('edit-proj-year-long');
        const saveDatesBtn = document.getElementById('save-dates-btn');
        const cancelDatesBtn = document.getElementById('cancel-dates-btn');

        // Initial Display State
        periodText.innerText = `${project.startDate.replace(/-/g, '.')} ~ ${project.endDate.replace(/-/g, '.')}`;
        periodDisplay.classList.remove('hidden');
        editSection.classList.add('hidden');

        editStart.value = project.startDate;
        editEnd.value = project.endDate;
        editYearLong.checked = (project.startDate === '2026-01-01' && project.endDate === '2026-12-31');

        showEditBtn.onclick = () => {
            periodDisplay.classList.add('hidden');
            editSection.classList.remove('hidden');
        };

        cancelDatesBtn.onclick = () => {
            periodDisplay.classList.remove('hidden');
            editSection.classList.add('hidden');
            // Reset values
            editStart.value = project.startDate;
            editEnd.value = project.endDate;
            editYearLong.checked = (project.startDate === '2026-01-01' && project.endDate === '2026-12-31');
        };

        saveDatesBtn.onclick = () => {
            Storage.updateProject(currentProjectId, {
                startDate: editStart.value,
                endDate: editEnd.value
            });

            project.startDate = editStart.value;
            project.endDate = editEnd.value;

            periodText.innerText = `${project.startDate.replace(/-/g, '.')} ~ ${project.endDate.replace(/-/g, '.')}`;
            periodDisplay.classList.remove('hidden');
            editSection.classList.add('hidden');

            loadBoard();
        };

        editYearLong.onchange = () => {
            if (editYearLong.checked) {
                editStart.value = '2026-01-01';
                editEnd.value = '2026-12-31';
            }
        };

        renderTodos(project.todos);
        detailModal.classList.remove('hidden');
    };

    const renderTodos = (todos) => {
        const list = document.getElementById('todo-list');
        list.innerHTML = '';

        // Sort: Incomplete first, then Completed
        const sortedTodos = [...todos].sort((a, b) => a.completed - b.completed);

        sortedTodos.forEach((todo) => {
            // Find the original index in project.todos if needed, 
            // but for simple checkbox we can find by object or text
            const originalIndex = todos.findIndex(t => t === todo);
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            li.innerHTML = `
                <input type="checkbox" ${todo.completed ? 'checked' : ''} data-index="${originalIndex}">
                <div class="todo-text-container">
                    <span>${todo.text}</span>
                    ${todo.completedDate ? `<span class="completed-date">완료: ${todo.completedDate}</span>` : ''}
                </div>
                <span class="delete-todo" data-index="${originalIndex}">&times;</span>
            `;
            list.appendChild(li);
        });

        // Event Listeners for Checkbox and Delete
        list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', (e) => toggleTodo(e.target.dataset.index));
        });
        list.querySelectorAll('.delete-todo').forEach(btn => {
            btn.addEventListener('click', (e) => deleteTodo(e.target.dataset.index));
        });
    };

    const addTodo = () => {
        const input = document.getElementById('new-todo');
        const text = input.value.trim();
        if (!text) return;

        const project = Storage.getProjects().find(p => p.id === currentProjectId);
        project.todos.push({ text, completed: false });
        Storage.updateProject(currentProjectId, { todos: project.todos });

        input.value = '';
        renderTodos(project.todos);
        loadBoard();
    };

    document.getElementById('add-todo-btn').addEventListener('click', addTodo);
    document.getElementById('new-todo').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    const toggleTodo = (index) => {
        const project = Storage.getProjects().find(p => p.id === currentProjectId);
        const wasFinishedBefore = project.todos.length > 0 && project.todos.every(t => t.completed);

        const todo = project.todos[index];
        todo.completed = !todo.completed;

        if (todo.completed) {
            const now = new Date();
            todo.completedDate = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
        } else {
            delete todo.completedDate;
        }

        const isFinishedNow = project.todos.length > 0 && project.todos.every(t => t.completed);

        Storage.updateProject(currentProjectId, { todos: project.todos });
        renderTodos(project.todos);
        loadBoard();

        // If it just became finished, close modal and trigger intense celebration
        if (!wasFinishedBefore && isFinishedNow) {
            const detailModal = document.getElementById('detail-modal');
            const themeColor = detailModal.style.getPropertyValue('--theme-color');
            detailModal.classList.add('hidden');

            const sticker = document.querySelector(`.sticker[data-id="${currentProjectId}"]`);
            if (sticker) {
                setTimeout(() => {
                    // 1. Intense Sticker Animation
                    sticker.classList.add('celebrating');

                    // 2. Large Celebration Text
                    const celebration = document.createElement('div');
                    celebration.className = 'celebration-text';
                    celebration.style.setProperty('--theme-color', themeColor || '#4ade80');
                    celebration.innerHTML = `GOAL ACHIEVED!<br><span style="font-size: 0.6em; opacity: 0.9;">${project.name}</span>`;
                    document.body.appendChild(celebration);

                    // Cleanup
                    setTimeout(() => {
                        sticker.classList.remove('celebrating');
                        celebration.remove();
                    }, 2200);
                }, 300);
            }
        }
    };

    const deleteTodo = (index) => {
        const project = Storage.getProjects().find(p => p.id === currentProjectId);
        project.todos.splice(index, 1);
        Storage.updateProject(currentProjectId, { todos: project.todos });
        renderTodos(project.todos);
        loadBoard();
    };

    document.getElementById('delete-project-btn').addEventListener('click', () => {
        if (confirm('정말 이 프로젝트를 삭제하시겠습니까?')) {
            Storage.deleteProject(currentProjectId);
            detailModal.classList.add('hidden');
            loadBoard();
        }
    });

    // --- Modal Closing ---
    closeModals.forEach(btn => {
        btn.addEventListener('click', () => {
            projectModal.classList.add('hidden');
            detailModal.classList.add('hidden');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === projectModal) projectModal.classList.add('hidden');
        if (e.target === detailModal) detailModal.classList.add('hidden');
        if (e.target === manageModal) manageModal.classList.add('hidden');
    });

    // --- Manage Modal Logic ---
    const renderManageTable = () => {
        const projects = Storage.getProjects();
        manageProjectList.innerHTML = '';

        projects.forEach(project => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${project.image}" class="manage-img"></td>
                <td style="font-weight: 600;">${project.name}</td>
                <td style="font-size: 0.85rem; color: #64748b;">${project.startDate} ~ ${project.endDate}</td>
                <td>
                    <div class="manage-actions">
                        <button class="mini-btn edit" data-id="${project.id}">수정</button>
                        <button class="mini-btn delete" data-id="${project.id}">삭제</button>
                    </div>
                </td>
            `;

            tr.querySelector('.edit').onclick = () => {
                manageModal.classList.add('hidden');
                openProjectDetail(project.id);
            };

            tr.querySelector('.delete').onclick = () => {
                if (confirm(`'${project.name}' 프로젝트를 삭제하시겠습니까?`)) {
                    Storage.deleteProject(project.id);
                    renderManageTable();
                    loadBoard();
                }
            };

            manageProjectList.appendChild(tr);
        });

        if (projects.length === 0) {
            manageProjectList.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 2rem;">등록된 프로젝트가 없습니다.</td></tr>';
        }
    };

    manageBtn.addEventListener('click', () => {
        renderManageTable();
        manageModal.classList.remove('hidden');
    });

    // Initial Check
    checkAuth();
});
