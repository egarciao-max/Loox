// 1. Initialize Supabase
let supabase;
try {
    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    console.log("Supabase connected");
} catch(e) {
    console.error("Supabase failed to load:", e);
}

let isLoginMode = true;
let currentUser = null;

// 2. Auth Logic
function switchAuth(mode) {
    isLoginMode = mode;
    document.getElementById('tab-login').classList.toggle('active', mode);
    document.getElementById('tab-signup').classList.toggle('active', !mode);
    document.getElementById('submit-btn').innerText = mode ? "LOGIN" : "SIGN UP";
    document.getElementById('auth-msg').innerText = "";
}

async function handleAuth() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    const msg = document.getElementById('auth-msg');

    if(!email || !pass) { msg.innerText = "Please fill all fields"; return; }
    
    msg.style.color = "var(--accent)";
    msg.innerText = isLoginMode ? "Verifying..." : "Creating Account...";

    try {
        let res;
        if(isLoginMode) {
            res = await supabase.auth.signInWithPassword({ email, password: pass });
        } else {
            res = await supabase.auth.signUp({ email, password: pass });
            if(!res.error) { msg.innerText = "Check your email to confirm!"; return; }
        }

        if(res.error) throw res.error;
        
        currentUser = res.data.user;
        enterApp();
    } catch (err) {
        msg.style.color = "#ff4d4d";
        msg.innerText = err.message;
    }
}

// 3. Navigation
function enterApp() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('nav').style.display = 'flex';
    // Default to home
    showPage('home-screen', document.querySelector('.nav-item'));
}

function showPage(pageId, navEl) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(navEl) navEl.classList.add('active');
    
    if(pageId === 'community-screen') loadPosts();
}

// 4. AI Coach Logic
async function sendAI() {
    const input = document.getElementById('ai-input');
    const chat = document.getElementById('ai-chat');
    const text = input.value.trim();
    if(!text) return;

    // Add User Message
    const uB = document.createElement('div');
    uB.className = 'chat-bubble user';
    uB.innerText = text;
    chat.appendChild(uB);
    input.value = '';
    chat.scrollTop = chat.scrollHeight;

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${CONFIG.OPENAI_KEY}` 
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    {role: "system", content: "You are Max, an elite performance coach. Keep answers short and punchy."}, 
                    {role: "user", content: text}
                ]
            })
        });
        const data = await res.json();
        const aiText = data.choices[0].message.content;
        
        const aB = document.createElement('div');
        aB.className = 'chat-bubble ai';
        aB.innerText = aiText;
        chat.appendChild(aB);
        chat.scrollTop = chat.scrollHeight;
    } catch(e) {
        console.error(e);
        const errB = document.createElement('div');
        errB.className = 'chat-bubble ai';
        errB.innerText = "Connection error. Check console.";
        chat.appendChild(errB);
    }
}

// 5. Community Logic
async function loadPosts() {
    const container = document.getElementById('feed-container');
    const { data, error } = await supabase.from('community_posts').select('*').order('created_at', {ascending: false});
    
    if(error || !data) {
        container.innerHTML = "<p class='loading-text'>No posts found or DB error.</p>";
        return;
    }
    
    container.innerHTML = data.map(p => `
        <div class="post-card">
            <div class="user-tag">@${p.username || 'User'}</div>
            <div class="post-content">${p.content}</div>
        </div>
    `).join('');
}

function openPostModal() { document.getElementById('modal-overlay').classList.add('open'); }
function closePostModal() { document.getElementById('modal-overlay').classList.remove('open'); }

async function submitPost() {
    const txt = document.getElementById('new-post-content').value;
    if(!txt) return;

    const { error } = await supabase.from('community_posts').insert([
        { user_id: currentUser.id, username: currentUser.email.split('@')[0], content: txt }
    ]);

    if(!error) {
        closePostModal();
        document.getElementById('new-post-content').value = '';
        loadPosts();
    } else {
        alert("Error posting: " + error.message);
    }
}