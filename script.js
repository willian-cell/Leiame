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
            req.onsuccess = () => resolve(req.result);
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

    // BACKUP EM ARQUIVO .JSON
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
   3. UI E CAROUSEL (HOME MOCK 3D)
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

    static updateNavGlobalState() {
        const c = document.getElementById("nav-system-links");
        if (AuthManager.currentUser) {
            // Req 1: Tryment apenas com primeiro nome
            const primeiroNome = AuthManager.currentUser.name.split(' ')[0];
            c.innerHTML = `
                <a href="javascript:UIManager.navigateTo('library')" class="nav-link">Sua Estante</a>
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

        if(viewId === 'library') LibraryManager.renderGrid();
        if(viewId === 'home') CarouselManager.buildCoverflow();
    }
    
    static scrollToId(id) {
        this.navigateTo('home');
        setTimeout(() => { const el = document.getElementById(id); if(el) el.scrollIntoView({ behavior:'smooth' }); }, 100);
    }
}

class CarouselManager {
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
        top.forEach((b, idx) => {
            const card = document.createElement("div");
            card.className = "book-card-3d " + (top.length===1 ? "center" : (idx===0?"left":idx===1?"center":"right"));
            card.innerHTML = `<img src="${b.cover}" alt="Capa" onerror="this.src='logos/fundo1_site.jpg'">`;
            card.onclick = () => { if(AuthManager.currentUser) ReaderManager.openBook(b.id); else UIManager.openModal('modal-auth'); };
            container.appendChild(card);
        });
    }
}

/* ==========================================================================
   4. BIBLIOTECA (VISUALIZAR TODOS E OBRAS DO USUÁRIO)
   ========================================================================== */
class LibraryManager {
    static async renderGrid() {
        const c = document.getElementById("library-container");
        const allBooks = await DatabaseManager.getAll("books");
        
        // Req 2 e 4 Lógica
        let userHasBooks = false;
        if(AuthManager.currentUser) {
            userHasBooks = allBooks.some(b => b.author === AuthManager.currentUser.email);
        }

        const h1Title = userHasBooks ? "O Grande Salão Literário" : "Sua Primeira Obra";
        const h1Desc = userHasBooks ? "Obras guardadas e prontas pra acervo." : "Crie sua primeira obra aqui e preencha este vazio.";

        let gridHtml = ``;
        if (allBooks.length === 0) {
            gridHtml = `<p style="color:var(--color-gold-base); font-size:1.2rem; grid-column: 1/-1;">Aqui mostraremos os livros já cadastrados. O acervo mundial está em paz.</p>`;
        } else {
            allBooks.forEach(b => {
                gridHtml += `
                 <div class="glass-panel" style="padding:1.5rem; text-align:left; cursor:pointer;" onclick="ReaderManager.openBook(${b.id})">
                    <img src="${b.cover}" style="width:100%; height:250px; object-fit:cover; border-radius:4px; margin-bottom:1rem;" onerror="this.src='logos/fundo1_site.jpg'">
                    <h3 class="font-hero text-gold" style="font-size:1.3rem;">${b.title}</h3>
                    <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:0.5rem;">${b.genre} • Por: ${b.authorName}</p>
                    ${b.type === 'ai' ? '<span class="nav-badge" style="background:#5522aa; color:#fff;">✨ Gerado por IA</span>' : ''}
                 </div>
                `;
            });
        }

        c.innerHTML = `
            <div style="padding: 8rem 4rem 4rem 4rem; max-width: 1400px; margin: 0 auto; text-align: center;">
             <h1 class="font-hero text-gradient" style="font-size: 3rem;">${h1Title}</h1>
             <p style="color: var(--text-secondary); margin-top: 1rem;">${h1Desc}</p>
             
             <!-- Req 3: troque anexar novo tomo por Criar Livro -->
             <div style="margin-top:2rem; display:flex; gap:1rem; justify-content:center;">
                 <button class="btn btn-gold" onclick="UIManager.navigateTo('admin')"><i class="ph ph-plus-circle"></i> Criar Livro</button>
                 <!-- Req Salvar em DB Json Back-up -->
                 <button class="btn btn-outline" title="Baixar toda database (.json)" onclick="DatabaseManager.exportToJSON()"><i class="ph ph-download-simple"></i> Exportar DB</button>
             </div>
             
             <div id="grid-livros" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 3rem; margin-top: 4rem;">
                ${gridHtml}
             </div>
         </div>
        `;
    }
}

/* ==========================================================================
   5. ADMIN / CRIAÇÃO DE LIVRO
   ========================================================================== */
class AdminManager {
    static async startAIBook() {
        const title = document.getElementById("admin-livro-titulo").value.trim();
        const genre = document.getElementById("admin-livro-genero").value;
        if(!title) return alert("Forneça um título encantador para a magia fluir.");

        let baseCover = "logos/fundo1_site.jpg"; 
        
        const b = {
            title, genre, type: 'ai', author: AuthManager.currentUser.email,
            authorName: AuthManager.currentUser.name.split(' ')[0],
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
                authorName: AuthManager.currentUser.name.split(' ')[0], 
                cover: b64Array[0], pages: b64Array, createdAt: new Date()
            };
            await DatabaseManager.saveItem("books", b);
            alert("A compilação de imagens foi costurada com sucesso em nosso acervo!");
            UIManager.navigateTo("library");
        });
    }
}

/* ==========================================================================
   6. EDITOR INLINE E LEITOR MAGICO (Com Inteligência Artificial Simulada)
   ========================================================================== */
class ReaderManager {
    static currentBook = null;
    static currentPageIndex = 0;
    static isEditing = false;

    static async openBook(bookId, forceEdit = false) {
        const b = await DatabaseManager.getItem("books", Number(bookId));
        if(!b) return alert("Livro queimado nas chamas do esquecimento.");
        this.currentBook = b;
        this.currentPageIndex = 0;
        this.isEditing = forceEdit || (b.author === AuthManager.currentUser.email && b.type === 'ai');
        
        document.getElementById("reader-title").innerText = b.title;
        document.getElementById("reader-author").innerText = `Escrito por: ${b.authorName}`;
        UIManager.navigateTo("reader");
        this.renderPage();
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

    static nextPage() {
        if (this.currentPageIndex < this.currentBook.pages.length - 1) {
            this.currentPageIndex++; this.renderPage();
        } else if (this.isEditing) {
            this.addNewPage();
        }
    }
    static prevPage() {
        if (this.currentPageIndex > 0) {
            this.currentPageIndex--; this.renderPage();
        }
    }

    // EDITOR INLINE COMMANDS:
    static addNewPage() {
        this.currentBook.pages.push("");
        this.currentPageIndex = this.currentBook.pages.length - 1;
        this.renderPage();
    }

    static async saveInlineEdits() {
        // Pega texto custom e salva
        const raw = document.getElementById("inline-editor-text").value;
        this.currentBook.pages[this.currentPageIndex] = raw;
        await DatabaseManager.saveItem("books", this.currentBook);
        alert("Encantamentos persistidos no IndexedDB!");
    }

    static generateAIText() {
        const area = document.getElementById("inline-editor-text");
        area.value = "Gerando conexões neurais com os servidores da Inteligência...";
        
        // Simulação Mágica de Backend Gen-AI
        setTimeout(() => {
            const suggestions = [
                "A neblina cortava a floresta densa como se a própria luz do sol tivesse medo de penetrar a mata.",
                "E foi lá, nas ruínas do império perdido de Andrômeda, que o detetive encontrou o artefato brilhante.",
                "Seu coração parou por uma fração de segundo. Não havia retorno, apenas o abismo cintilante das fadas à sua frente."
            ];
            area.value = "... " + suggestions[Math.floor(Math.random()*suggestions.length)] + " [Continue escrevendo...]";
        }, 1500);
    }

    static correctAIText() {
        const area = document.getElementById("inline-editor-text");
        if(area.value.length < 5) return alert("Escreva um pouco para eu corrigir!");
        const antes = area.value;
        area.value = "Analisando semântica e gramática (Modo Corretor)...";
        setTimeout(() => {
            area.value = antes + "\n\n(A inteligência revisou seu texto. Nenhuma crase ou vírgula escapou de forma irregular! A escrita está limpa e formalizada.)";
        }, 1000);
    }

    static async insertImageAIPage() {
        alert("A IA forjará uma capa única. Isso substituirá as definições da capa original.");
        // Mock Gen-Imagem Unsplash source baseada em Genero Histórico/Luxo
        const genImageLink = `https://source.unsplash.com/random/800x600/?${this.currentBook.genre},luxo,art`;
        this.currentBook.cover = genImageLink;
        await DatabaseManager.saveItem("books", this.currentBook);
    }
}

/* ==========================================================================
   7. BOOTSTRAP INITIALIZATION
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
