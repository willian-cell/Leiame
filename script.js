/**
 * LEIAME - Ultra Premium Architecture (Vanilla JS)
 * Version 2.1 - Scalable with Multi-user, AI Simulation, and JSON DB Backup
 */

/* ==========================================================================
   1. DATA LAYER E BACKUP JSON
   ========================================================================== */
class DatabaseManager {
    static dbName = "LeiamePremiumDB";
    static dbVersion = 2; 
    static db;

    static init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onerror = (e) => reject(e.target.error);
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("users")) db.createObjectStore("users", { keyPath: "email" });
                if (!db.objectStoreNames.contains("books")) {
                    const bStore = db.createObjectStore("books", { keyPath: "id", autoIncrement: true });
                    bStore.createIndex("author", "author", { unique: false });
                }
                if (!db.objectStoreNames.contains("progress")) db.createObjectStore("progress", { keyPath: "sessionKey" });
            };
        });
    }

    static saveItem(storeName, data) {
        return new Promise((resolve, reject) => {
            const req = this.db.transaction([storeName], "readwrite").objectStore(storeName).put(data);
            req.onsuccess = () => {
                resolve(req.result);
                this.syncToFileBase(); // Chama a sincronização silenciosa automaticamente
            };
            req.onerror = () => reject(req.error);
        });
    }

    static getItem(storeName, key) {
        return new Promise((resolve, reject) => {
            const req = this.db.transaction([storeName], "readonly").objectStore(storeName).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    static getAll(storeName) {
         return new Promise((resolve, reject) => {
            const req = this.db.transaction([storeName], "readonly").objectStore(storeName).getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    // EXPORTAÇÃO BÁSICA
    static async exportToJSON() {
        const users = await this.getAll("users");
        const books = await this.getAll("books");
        const progress = await this.getAll("progress");
        const backup = { users, books, progress, exportDate: new Date().toISOString() };
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], {type: "application/json"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `leiame_database_bkp_${new Date().getTime()}.json`;
        a.click();
        alert("Sistema inteiro empacotado em JSON com sucesso!");
    }

    // REGISTRO DINÂMICO PERMANENTE ("AUTO-SAVE") DIRETO NO ARQUIVO .JSON DA MÁQUINA
    static fileHandle = null;

    static async linkJSONFile() {
        try {
            this.fileHandle = await window.showSaveFilePicker({
                suggestedName: 'leiame_database_autosalvamento.json',
                types: [{ description: 'Arquivo de Banco JSON', accept: { 'application/json': ['.json'] } }]
            });
            alert("Sistema vinculado com sucesso! As próximas edições e leituras vão sobrescrever o arquivo automaticamente.");
            this.syncToFileBase();
        } catch(e) { console.log("Vinculação cancelada", e); }
    }

    static async syncToFileBase() {
        if (!this.fileHandle) return; // Se não houver arquivo real linkado na sessão, opera normal.
        try {
            const users = await this.getAll("users");
            const books = await this.getAll("books");
            const progress = await this.getAll("progress");
            const backup = { users, books, progress, timestamp: new Date().toISOString(), type: "Auto-Gravação Permanente" };
            
            const writable = await this.fileHandle.createWritable();
            await writable.write(JSON.stringify(backup, null, 2));
            await writable.close();
            console.log("Arquivo JSON real sobrescrito nativamente no computador com sucesso.");
        } catch(e) { console.error("Falha ao injetar dados no arquivo permanente da máquina", e); }
    }
}

/* ==========================================================================
   2. AUTHENTICATION & MULTI-USER SESSION
   ========================================================================== */
class AuthManager {
    static currentUser = null;
    static isLoginMode = true;

    static toggleMode() {
        this.isLoginMode = !this.isLoginMode;
        const formIds = { title: "auth-title", sub: "auth-subtitle", btn: "btn-auth-submit", link: "auth-switch-text" };
        document.getElementById(formIds.title).innerText = this.isLoginMode ? "Acessar Reservatório" : "Sua Primeira Chave";
        document.getElementById(formIds.sub).innerText = this.isLoginMode ? "Crie ou informe sua conta para abrir o sistema mágico." : "A magia da inteligência artificial começará no seu repositório vazio.";
        document.getElementById(formIds.btn).innerText = this.isLoginMode ? "Entrar no Banco" : "Formalizar Acesso";
        document.getElementById(formIds.link).innerText = this.isLoginMode ? "Ainda não sou de casa. Criar nova conta!" : "Já pertenço ao círculo. Fazer Login!";
        document.getElementById("group-name").style.display = this.isLoginMode ? "none" : "block";
        if(this.isLoginMode) document.getElementById("auth-name").removeAttribute("required");
        else document.getElementById("auth-name").setAttribute("required", "true");
    }

    static async processAuth() {
        const email = document.getElementById("auth-email").value.trim().toLowerCase();
        const pwd = document.getElementById("auth-password").value;
        const btn = document.getElementById("btn-auth-submit");
        const encrypted = btoa(pwd); // mock encryption
        btn.innerHTML = "Processando..."; btn.disabled = true;

        try {
            if (this.isLoginMode) {
                const u = await DatabaseManager.getItem("users", email);
                if (u && u.password === encrypted) this.loginSuccess(u);
                else alert("A chave não se alinha. Email ou senha incorretos.");
            } else {
                const name = document.getElementById("auth-name").value.trim();
                const existing = await DatabaseManager.getItem("users", email);
                if (existing) alert("O selo de acesso já existe.");
                else {
                    const newUser = { email, name, password: encrypted, role: "leitor", createdAt: new Date() };
                    await DatabaseManager.saveItem("users", newUser);
                    this.loginSuccess(newUser);
                }
            }
        } finally {
            btn.innerHTML = this.isLoginMode ? "Entrar no Banco" : "Formalizar Acesso";
            btn.disabled = false;
        }
    }

    static loginSuccess(u) {
        this.currentUser = u;
        localStorage.setItem("leiameSessionX3", JSON.stringify(u));
        UIManager.closeModal("modal-auth");
        UIManager.updateNavGlobalState();
        UIManager.navigateTo("library");
    }

    static logout() {
        this.currentUser = null;
        localStorage.removeItem("leiameSessionX3");
        UIManager.updateNavGlobalState();
        UIManager.navigateTo("home");
    }

    static hydrateSession() {
        const cached = localStorage.getItem("leiameSessionX3");
        if(cached) this.currentUser = JSON.parse(cached);
    }
}


/* ==========================================================================
   3. MÁGICA DA PENA FLUTUANTE GEOMÉTRICA (FEATHER CURSOR)
   ========================================================================== */
class FeatherCursorEngine {
    static init() {
        this.feather = document.querySelector(".creator-visual img");
        this.visualContainer = document.querySelector(".creator-visual");
        this.section = document.getElementById("secao-sinopse");
        
        if(!this.feather || !this.visualContainer || !this.section) return;
        
        this.feather.style.transition = "transform 0.15s ease-out";
        this.feather.style.willChange = "transform";
        
        document.addEventListener("mousemove", (e) => this.track(e.clientX, e.clientY));
        document.addEventListener("scroll", () => this.track(this.lastX, this.lastY));
    }

    static track(x, y) {
        if(x === undefined || y === undefined) return;
        this.lastX = x; this.lastY = y;

        const contRect = this.visualContainer.getBoundingClientRect();
        const secRect = this.section.getBoundingClientRect();
        
        // Ativa a mágica geométrica a partir do cruzamento do mouse pra baixo das fronteiras superiores
        if(y >= contRect.top && y <= secRect.bottom + 50) {
             const tipNaturalX = contRect.left + (contRect.width * 0.28); // Mirando no X do Canto inferior-esquerdo visual
             const tipNaturalY = contRect.top + (contRect.height * 0.85); // Mirando no Y da ponta de escrita da pena

             let deltaX = x - tipNaturalX;
             let deltaY = y - tipNaturalY;
             
             this.feather.style.animation = "none"; // Congela o floating natural
             this.feather.style.transform = `translate(${deltaX}px, ${deltaY}px)`; // Arrasta a ponta da imagem pro ponteiro do mouse
        } else {
             // Retração suave
             this.feather.style.transform = "translate(0px, 0px)";
             this.feather.style.animation = ""; // Restaura o estilo inline de floating CSS original da DOM
        }
    }
}

/* ==========================================================================
   4. UI E CAROUSEL (HOME MOCK 3D)
   ========================================================================== */
class UIManager {
    static initObservers() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('active'); });
        }, { threshold: 0.1 });
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }

    static openModal(id) { document.getElementById(id).classList.add('open'); }
    static closeModal(id) { document.getElementById(id).classList.remove('open'); }

    static lastActiveLibraryTab = 'mine';

    static updateNavGlobalState(activeFilter = 'mine') {
        const c = document.getElementById("nav-system-links");
        if (AuthManager.currentUser) {
            const primeiroNome = AuthManager.currentUser.name.split(' ')[0];
            const tsAll = activeFilter === 'all' ? 'border-bottom:1px solid var(--color-gold); padding-bottom:2px;' : '';
            const tsRead = activeFilter === 'reading' ? 'border-bottom:1px solid var(--color-gold); padding-bottom:2px;' : '';
            const tsMine = activeFilter === 'mine' ? 'border-bottom:1px solid var(--color-gold); padding-bottom:2px;' : '';

            c.innerHTML = `
                <a href="javascript:LibraryManager.renderGrid('all')" class="nav-link" style="font-size:0.85rem; letter-spacing:1px; text-transform:uppercase; ${tsAll}">Todos os Livros</a>
                <a href="javascript:LibraryManager.renderGrid('reading')" class="nav-link" style="font-size:0.85rem; letter-spacing:1px; text-transform:uppercase; ${tsRead}">Em Leitura</a>
                <a href="javascript:LibraryManager.renderGrid('mine')" class="nav-link" style="font-size:0.85rem; letter-spacing:1px; text-transform:uppercase; ${tsMine}">Sua Estante</a>
                <span class="nav-link" style="color:var(--color-gold-base); font-style: italic;">
                    <i class="ph-fill ph-check-seal"></i> Olá, ${primeiroNome}
                </span>
                <button class="btn btn-outline" style="padding: 0.5rem 1rem;" onclick="AuthManager.logout()"><i class="ph ph-sign-out"></i> Sair</button>
            `;
        } else {
            c.innerHTML = `
                <a href="javascript:UIManager.scrollToId('secao-sinopse')" class="nav-link">A Origem</a>
                <button class="btn btn-gold" onclick="UIManager.openModal('modal-auth')">Possuir Chave</button>
            `;
        }
    }

    static navigateTo(viewId) {
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        const v = document.getElementById(`view-${viewId}`);
        if(v) { v.classList.add('active'); window.scrollTo({top:0, behavior:'smooth'}); }
        else document.getElementById('view-home').classList.add('active');

        if (viewId !== 'home') CarouselManager.stopRotation();

        if(viewId === 'library') LibraryManager.renderGrid(this.lastActiveLibraryTab || 'mine');
        if(viewId === 'home') CarouselManager.buildCoverflow();
    }
    
    static scrollToId(id) {
        this.navigateTo('home');
        setTimeout(() => { const el = document.getElementById(id); if(el) el.scrollIntoView({ behavior:'smooth' }); }, 100);
    }
}

class CarouselManager {
    static autoRotateTimer = null;
    static positions = [];
    static els = [];

    static async buildCoverflow() {
        const container = document.getElementById("home-3d-carousel");
        if(!container) return;
        const books = await DatabaseManager.getAll("books");
        container.innerHTML = "";
        
        if(books.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding-top: 150px; color: var(--text-secondary); width:300px;">Nenhum livro forjado ainda.</div>`;
            return;
        }

        const top = books.slice(0, Math.min(3, books.length));
        this.els = [];
        this.positions = [];

        top.forEach((b, idx) => {
            const card = document.createElement("div");
            let posClass = top.length === 1 ? "center" : (top.length === 2 ? (idx === 0 ? "left" : "right") : (idx === 0 ? "left" : idx === 1 ? "center" : "right"));
            this.positions.push(posClass);
            
            card.className = "book-card-3d " + posClass;
            card.innerHTML = `<img src="${b.cover}" alt="Capa" onerror="this.src='logos/fundo1_site.jpg'">`;
            
            card.onclick = () => { if(AuthManager.currentUser) ReaderManager.openBook(b.id); else UIManager.openModal('modal-auth'); };
            
            if(top.length >= 3) {
                card.onmouseenter = () => this.triggerFastRotation();
                card.onmouseleave = () => this.triggerSlowRotation();
            }

            this.els.push(card);
            container.appendChild(card);
        });

        if(top.length >= 3) {
            this.triggerSlowRotation();
        }
    }

    static rotate() {
        if(this.positions.length < 3) return;
        const last = this.positions.pop();
        this.positions.unshift(last);

        this.els.forEach((el, i) => {
            el.className = "book-card-3d " + this.positions[i];
        });
    }

    static triggerSlowRotation() {
        clearInterval(this.autoRotateTimer);
        this.els.forEach(el => el.style.transition = 'all 1.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)');
        this.autoRotateTimer = setInterval(() => {
            this.rotate();
        }, 2500); 
    }

    static triggerFastRotation() {
         clearInterval(this.autoRotateTimer);
         this.els.forEach(el => el.style.transition = 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)');
         this.rotate(); 
         this.autoRotateTimer = setInterval(() => {
             this.rotate();
         }, 600); 
    }

    static stopRotation() {
        if(this.autoRotateTimer) clearInterval(this.autoRotateTimer);
    }
}

/* ==========================================================================
   5. BIBLIOTECA (VISUALIZAR TODOS E OBRAS DO USUÁRIO)
   ========================================================================== */
class LibraryManager {
    static async renderGrid(filterType = 'mine') {
        UIManager.lastActiveLibraryTab = filterType;
        UIManager.updateNavGlobalState(filterType);
        
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        document.getElementById('view-library').classList.add('active');

        const c = document.getElementById("library-container");
        const allBooks = await DatabaseManager.getAll("books");
        const allUsers = await DatabaseManager.getAll("users");
        const progresses = await DatabaseManager.getAll("progress") || [];
        
        const currentUser = AuthManager.currentUser ? AuthManager.currentUser.email : '';
        if(!currentUser) return;

        let filteredBooks = [];
        let h1Title = "";
        let h1Desc = "";

        if (filterType === 'mine') {
            filteredBooks = allBooks.filter(b => b.author === currentUser);
            h1Title = "Sua Estante";
            h1Desc = "Obras guardadas e prontas pra acervo.";
        } else if (filterType === 'all') {
            filteredBooks = allBooks;
            h1Title = "Todos os Livros";
            h1Desc = "Obras já cadastradas e unidas de todos os visionários.";
        } else if (filterType === 'reading') {
            const myProgress = progresses.filter(p => p.sessionKey.startsWith(currentUser + "_") && !p.finished);
            const readingIds = myProgress.map(p => Number(p.bookId));
            filteredBooks = allBooks.filter(b => readingIds.includes(b.id));
            h1Title = "Em Leitura";
            h1Desc = "Aquilo que você não terminou de ler ainda, mas já começou.";
        }

        let gridHtml = ``;
        if (filteredBooks.length === 0) {
            gridHtml = `<p style="color:var(--color-gold-base); font-size:1.2rem; grid-column: 1/-1;">Aqui mostraremos os livros correspondentes. Caso não exista nenhum, aventure-se pelo acervo ou crie sua primeira obra.</p>`;
        } else {
            filteredBooks.forEach(b => {
                const u = allUsers.find(user => user.email === b.author);
                const exactAuthorName = u ? u.name : b.authorName;

                gridHtml += `
                 <div class="glass-panel library-item" style="padding:1.5rem; text-align:center; cursor:pointer; display:flex; flex-direction:column; justify-content:space-between;" onclick="ReaderManager.openBook(${b.id})">
                    <div style="background:#0a0a0a; border-radius:4px; margin-bottom:1.5rem; display:flex; justify-content:center; align-items:center; height:320px; overflow:hidden;">
                        <img src="${b.cover}" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.src='logos/fundo1_site.jpg'">
                    </div>
                    <div>
                        <h3 class="font-hero text-gold" style="font-size:1.3rem; margin-bottom:0.8rem;">${b.title}</h3>
                        <div style="display:flex; justify-content:center; gap: 0.5rem; align-items:center; margin-bottom:1rem;">
                             <span style="background:var(--color-gold-dark); color:#000; padding:0.2rem 0.6rem; border-radius:4px; font-weight:700; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px;">${b.genre}</span>
                             ${b.type === 'ai' ? '<span class="nav-badge" style="background:#5522aa; color:#fff; font-size:0.7rem; border-radius:4px; padding:0.2rem 0.5rem; margin:0;">✨ IA</span>' : ''}
                        </div>
                        <p style="color:#fcfcfc; font-size:0.95rem; font-weight:500; margin-bottom:0.3rem; text-transform:capitalize;"><i class="ph-fill ph-pen-nib"></i> ${exactAuthorName}</p>
                        <p style="color:var(--text-muted); font-size:0.8rem;"><i class="ph ph-calendar-blank"></i> Publicado em: ${new Date(b.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                 </div>
                `;
            });
        }

        c.innerHTML = `
            <div style="padding: 8rem 4rem 4rem 4rem; max-width: 1400px; margin: 0 auto; text-align: center;">
             <h1 class="font-hero text-gradient" style="font-size: 3rem;">${h1Title}</h1>
             <p style="color: var(--text-secondary); margin-top: 1rem;">${h1Desc}</p>
             
             <div style="margin-top:3rem; display:flex; justify-content:center; gap: 1.5rem; align-items:center; flex-wrap:wrap;">
                 <button class="btn btn-gold" onclick="UIManager.navigateTo('admin')" style="height: 52px; padding: 0 2rem;"><i class="ph ph-plus-circle"></i> Criar Livro</button>
                 <div style="position:relative; width: 100%; max-width: 500px;">
                    <i class="ph ph-magnifying-glass" style="position:absolute; left:1.2rem; top:50%; transform:translateY(-50%); color:var(--color-gold); font-size:1.4rem;"></i>
                    <input type="text" onkeyup="LibraryManager.filterSearch(this.value)" placeholder="Pesquisar por título, autor, data ou gênero..." style="width:100%; height:52px; border-radius:4px; border:1px solid rgba(212,175,55,0.4); background:rgba(0,0,0,0.6); padding:0 1rem 0 3.5rem; color:white; font-family:var(--font-body); font-size:1.05rem; outline:none; transition:0.3s;" onfocus="this.style.borderColor='var(--color-gold)'" onblur="this.style.borderColor='rgba(212,175,55,0.4)'">
                 </div>
             </div>
             
             <div id="grid-livros" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 3rem; margin-top: 4rem;">
                ${gridHtml}
             </div>
         </div>
        `;
    }

    static filterSearch(term) {
        const lowerTerm = term.toLowerCase().trim();
        const items = document.querySelectorAll('.library-item');
        items.forEach(el => {
            const text = el.innerText.toLowerCase();
            if (text.includes(lowerTerm)) el.style.display = 'flex';
            else el.style.display = 'none';
        });
    }
}

/* ==========================================================================
   6. ADMIN / CRIAÇÃO DE LIVRO
   ========================================================================== */
class AdminManager {
    static async startAIBook() {
        const title = document.getElementById("admin-livro-titulo").value.trim();
        const genre = document.getElementById("admin-livro-genero").value;
        if(!title) return alert("Forneça um título encantador para a magia fluir.");

        let baseCover = "logos/fundo1_site.jpg"; 
        
        const b = {
            title, genre, type: 'ai', author: AuthManager.currentUser.email,
            authorName: AuthManager.currentUser.name,
            cover: baseCover, pages: ["Insira seu primeiro capítulo aqui..."],
            createdAt: new Date()
        };

        try {
            const id = await DatabaseManager.saveItem("books", b);
            ReaderManager.openBook(id, true); // Abre e já vai pro modo Editor!
        } catch (e) { alert("Erro ao criar obra."); }
    }

    static processImageUpload(e) {
        const title = document.getElementById("admin-livro-titulo").value.trim();
        const genre = document.getElementById("admin-livro-genero").value;
        if(!title) return alert("Título faltante!");

        const files = Array.from(e.target.files);
        if(files.length === 0) return;

        const promises = files.map(f => {
            return new Promise(res => {
                const reader = new FileReader();
                reader.onload = e => res(e.target.result);
                reader.readAsDataURL(f);
            });
        });

        Promise.all(promises).then(async b64Array => {
            const b = {
                title, genre, type: 'images', author: AuthManager.currentUser.email,
                authorName: AuthManager.currentUser.name, 
                cover: b64Array[0], pages: b64Array, createdAt: new Date()
            };
            await DatabaseManager.saveItem("books", b);
            alert("A compilação de imagens foi costurada com sucesso em nosso acervo!");
            UIManager.navigateTo("library");
        });
    }
}

/* ==========================================================================
   7. MOTOR DE IA (DeepSeek & Gerador de Imagens Integrados)
   ========================================================================== */
class AIAssistant {
    static getApiKey() {
        let key = localStorage.getItem("DS_API_KEY");
        if (!key) {
            key = prompt("Abra os cofres: Insira sua chave definitiva da API DeepSeek para conjurar esta magia.");
            if (key) localStorage.setItem("DS_API_KEY", key);
        }
        return key;
    }

    static async callDeepSeek(promptMsg, systemMsg) {
        const key = this.getApiKey();
        if(!key) return null;

        try {
            const resp = await fetch("https://api.deepseek.com/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [
                        { role: "system", content: systemMsg },
                        { role: "user", content: promptMsg }
                    ],
                    temperature: 0.8
                })
            });
            const data = await resp.json();
            if(data.error) throw new Error(data.error.message);
            return data.choices[0].message.content;
        } catch(e) {
            alert("Aura Obscura Detectada (Verifique sua API Key de acesso DeepSeek!): " + e.message);
            return null;
        }
    }

    static async generateText(book, currentText) {
        const sys = `Você é o maior escritor co-autor fantasma do mundo. O livro que o autor cadastra chama-se '${book.title}' do gênero de ${book.genre}. Seu papel: Continue imediatamente a história parando exatamente do ponto onde o usuário travou, e se estiver vazia inicie o capítulo 1 focado no gênero e título descritos, e nunca perca o tom cinematográfico. Não dê saudações, apenas produza o conteúdo orgânico e continue a história baseando com coerência lógica literária.`;
        const prmt = `Abaixo a escritura atual deste autor nas páginas.\nContinue a narração a partir daqui:\n\n${currentText}`;
        return await this.callDeepSeek(prmt, sys);
    }

    static async correctGrammar(text) {
        const sys = `Você é o mais frio Roteirista e Professor de Gramática de Língua Portuguesa da academia Real, sua função é capturar erros cruéis: Acentuação, Letras minúsculas e maiúsculas nos lugares equivocados, concordância verbal, gramática maluca e polir até que tudo esteja sublime. NUNCA resuma ou tire o sentido do texto original, mude APENAS a concordância! Retorne puramente e 100% o resultado corrigido final para substituição bruta no editor (sem falar "Aqui está seu texto" ou explicações).`;
        const prmt = `Corrija isto minúciosamente:\n\n${text}`;
        return await this.callDeepSeek(prmt, sys);
    }

    static async generateImageURL(book) {
        const prmtText = `Epic detailed book cover artwork for a novel styled ${book.genre} named ${book.title}, perfect cinematic lighting, no text, beautiful, pure illustration design 8k octane`;
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(prmtText)}?width=1000&height=1400&nologo=true`;
    }
}

/* ==========================================================================
   8. EDITOR INLINE E LEITOR MAGICO
   ========================================================================== */
class ReaderManager {
    static currentBook = null;
    static currentPageIndex = 0;
    static isEditing = false;

    static async openBook(bookId, forceEdit = false) {
        const b = await DatabaseManager.getItem("books", Number(bookId));
        if(!b) return alert("Livro queimado nas chamas do esquecimento.");
        this.currentBook = b;
        
        const pKey = `${AuthManager.currentUser.email}_${b.id}`;
        const prog = await DatabaseManager.getItem("progress", pKey);
        this.currentPageIndex = prog && prog.page !== undefined ? prog.page : 0;
        
        this.isEditing = forceEdit || (b.author === AuthManager.currentUser.email && b.type === 'ai');
        
        UIManager.navigateTo("reader");
        this.renderPage();
        this.logProgress();
    }

    static logProgress() {
         const pKey = `${AuthManager.currentUser.email}_${this.currentBook.id}`;
         const isFinished = (this.currentPageIndex >= this.currentBook.pages.length - 1);
         DatabaseManager.saveItem("progress", { sessionKey: pKey, bookId: this.currentBook.id, page: this.currentPageIndex, finished: isFinished, lastRead: new Date() });
    }

    static renderPage() {
        const c = document.getElementById("reader-pages-container");
        const idx = this.currentPageIndex;
        let content = this.currentBook.pages[idx];

        document.getElementById("reader-page-indicator").innerText = `Pág ${idx+1} / ${this.currentBook.pages.length}`;

        if (this.currentBook.type === 'images' && !this.isEditing) {
            c.innerHTML = `<img src="${content}" style="max-width:100%; height:auto; border-radius:4px; max-height:65vh; object-fit:contain; margin:0 auto;">`;
        } else {
            // Visualização Modo Texto ou Editor Inline
            if(this.isEditing) {
                // Modo Edição Plena via IA
                c.innerHTML = `
                    <div style="display:flex; gap:1rem; margin-bottom: 2rem; border-bottom: 1px solid rgba(212,175,55,0.2); padding-bottom: 1rem;">
                       <button class="btn btn-outline" style="padding:0.4rem 1rem; font-size:0.8rem;" onclick="ReaderManager.generateAIText()"><i class="ph-fill ph-magic-wand"></i> Gerar Textos IA</button>
                       <button class="btn btn-outline" style="padding:0.4rem 1rem; font-size:0.8rem;" onclick="ReaderManager.correctAIText()"><i class="ph ph-check-square"></i> Correção/Gramática IA</button>
                       <button class="btn btn-outline" style="padding:0.4rem 1rem; font-size:0.8rem;" onclick="ReaderManager.insertImageAIPage()"><i class="ph ph-image"></i> Gerar Imagem IA Capa</button>
                       
                       <div style="flex:1"></div>
                       <button class="btn btn-gold" style="padding:0.4rem 1rem; font-size:0.8rem;" onclick="ReaderManager.saveInlineEdits()"><i class="ph ph-floppy-disk"></i> Salvar Edições DB</button>
                       <button class="btn btn-outline" style="padding:0.4rem 1rem; font-size:0.8rem;" onclick="ReaderManager.addNewPage()"><i class="ph ph-plus"></i> Add Nova Pág</button>
                    </div>
                    <!-- Editor de Texto -->
                    <textarea id="inline-editor-text" style="width:100%; flex:1; background:transparent; color:#fff; border:none; font-size:1.1rem; line-height:2; resize:none; font-family:var(--font-body);" placeholder="Comece a ditar ou deixe a magia escrever...">${content}</textarea>
                `;
            } else {
                c.innerHTML = `<div style="font-size:1.2rem; line-height:2.2; text-align:justify; margin: 0 auto; max-width:800px;">${content}</div>`;
            }
        }
    }

    // EDITOR INLINE COMMANDS & PAGINATION
    static saveLocalTextMemory() {
         if(this.isEditing) {
             const area = document.getElementById("inline-editor-text");
             if(area) this.currentBook.pages[this.currentPageIndex] = area.value;
         }
    }

    static nextPage() {
        this.saveLocalTextMemory(); 
        if (this.currentPageIndex < this.currentBook.pages.length - 1) {
            this.currentPageIndex++; this.renderPage(); this.logProgress();
        } else if (this.isEditing) {
            this.addNewPage();
        }
    }
    static prevPage() {
        this.saveLocalTextMemory();
        if (this.currentPageIndex > 0) {
            this.currentPageIndex--; this.renderPage(); this.logProgress();
        }
    }

    static addNewPage() {
        this.saveLocalTextMemory();
        this.currentBook.pages.push("");
        this.currentPageIndex = this.currentBook.pages.length - 1;
        this.renderPage();
        this.logProgress();
    }

    static async saveInlineEdits() {
        this.saveLocalTextMemory();
        await DatabaseManager.saveItem("books", this.currentBook);
        alert("Progressões e contornos de magia guardados com sucesso no Banco.");
    }

    static generateAIText(event) {
        const area = document.getElementById("inline-editor-text");
        const btn = event.currentTarget;
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Ocupando as nuvens...`; btn.disabled = true;
        
        AIAssistant.generateText(this.currentBook, area.value).then(res => {
            btn.innerHTML = originalContent; btn.disabled = false;
            if(res) area.value += (area.value ? "\n\n" : "") + res;
        });
    }

    static correctAIText(event) {
        const area = document.getElementById("inline-editor-text");
        if(area.value.length < 5) return alert("Escreva algo para poder lapidar as bordas!");
        
        const btn = event.currentTarget;
        const org = btn.innerHTML;
        btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Desconstruindo e Lapidando...`; btn.disabled = true;

        AIAssistant.correctGrammar(area.value).then(res => {
            btn.innerHTML = org; btn.disabled = false;
            if(res) area.value = res.trim();
        });
    }

    static insertImageAIPage() {
        this.saveLocalTextMemory();
        UIManager.openModal("modal-cover-ai");
        const preview = document.getElementById("cover-ai-preview");
        if(preview) preview.style.display = "none";
    }

    static handleCoverUpload(e) {
        const f = e.target.files[0];
        if(!f) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            this.currentBook.cover = ev.target.result;
            await this.saveInlineEdits();
            UIManager.closeModal("modal-cover-ai");
        };
        reader.readAsDataURL(f);
    }

    static async handleCoverAI() {
        const btn = document.getElementById("btn-cover-ai");
        const org = btn.innerHTML;
        btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Pintando Ideias...`; btn.disabled = true;
        
        const imgUrl = await AIAssistant.generateImageURL(this.currentBook);
        
        // Puxa a Imagem na IA e transforma em Base64 pra persistência local
        try {
            const resp = await fetch(imgUrl);
            const blob = await resp.blob();
            const reader = new FileReader();
            reader.onload = () => {
                this.tempCoverAI = reader.result;
                document.getElementById("cover-ai-img").src = reader.result;
                document.getElementById("cover-ai-preview").style.display = "block";
                btn.innerHTML = `<i class="ph-fill ph-magic-wand"></i> Gerar Outra Arte`; btn.disabled = false;
            };
            reader.readAsDataURL(blob);
        } catch(err) {
            alert("A tinta falhou."); btn.innerHTML = org; btn.disabled = false;
        }
    }

    static async acceptCoverAI() {
        this.currentBook.cover = this.tempCoverAI;
        await this.saveInlineEdits();
        UIManager.closeModal("modal-cover-ai");
    }
}

/* ==========================================================================
   9. BOOTSTRAP INITIALIZATION
   ========================================================================== */
window.onload = async () => {
    document.addEventListener("scroll", () => {
        const nav = document.getElementById("main-nav");
        if(window.scrollY > 50) nav.classList.add("scrolled");
        else nav.classList.remove("scrolled");
    });

    UIManager.initObservers();
    AuthManager.hydrateSession();
    UIManager.updateNavGlobalState();
    FeatherCursorEngine.init();

    try {
        await DatabaseManager.init();
        if (AuthManager.currentUser) UIManager.navigateTo('library');
        else UIManager.navigateTo('home');
    } catch (e) {
        console.error("DB Error:", e);
    }
};

window.navigateTo = (v) => UIManager.navigateTo(v);
window.openModal = (id) => UIManager.openModal(id);
window.closeModal = (id) => UIManager.closeModal(id);
