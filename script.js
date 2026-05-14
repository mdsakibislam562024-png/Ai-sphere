// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyB1T8RtehtewhrTUWiwTomVv5nwwSzyIdw",
    authDomain: "ai-sphere-2.firebaseapp.com",
    projectId: "ai-sphere-2",
    storageBucket: "ai-sphere-2.firebasestorage.app",
    messagingSenderId: "287882935194",
    appId: "1:287882935194:web:2401447236fb80b26f5823"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let isLoginMode = true;
const $ = id => document.getElementById(id);

// --- Sidebar & Auth ---
const toggleSidebar = () => {
    const active = $('sidebar').classList.toggle('active');
    $('overlay').style.display = active ? 'block' : 'none';
};

const toggleAuthMode = () => {
    isLoginMode = !isLoginMode;
    $('auth-title').innerText = isLoginMode ? "AI SPHERE" : "SIGN UP";
    $('authBtn').innerText = isLoginMode ? "Login" : "Register";
    $('auth-switch').innerText = isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Login";
};

const handleAuth = () => {
    const email = $('email').value, pass = $('password').value, status = $('auth-status');
    if(!email || !pass) return status.innerText = "Email and Password required!";
    
    const action = isLoginMode ? auth.signInWithEmailAndPassword(email, pass) : auth.createUserWithEmailAndPassword(email, pass);
    action.then(() => {
        $('onboarding-wrapper').style.display = 'none';
        $('home-page').style.display = 'flex';
        nav('home', true);
    }).catch(e => status.innerText = e.message);
};

// --- NAVIGATION LOGIC ---
const sections = ['hero-section', 'reels-section', 'messages-section', 'profile-page', 'global-feed-section'];

function nav(page, addHistory = true) {
    sections.forEach(s => $(s) && ($(s).style.display = 'none'));
    
    if (page === 'home') {
        $('hero-section').style.display = 'flex';
    } else {
        const target = page === 'profile' ? 'profile-page' : 
                       page === 'global-feed' ? 'global-feed-section' : page + '-section';
        
        if($(target)) {
            $(target).style.display = 'block';
            if (page === 'global-feed') loadPosts();
            if (page === 'profile') loadMyPosts();
        }
    }

    if (addHistory) history.pushState({page: page}, "", "#" + page);
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    if($('tab-' + page)) $('tab-' + page).classList.add('active');
    if($('sidebar').classList.contains('active')) toggleSidebar();
}

window.onpopstate = (event) => {
    const page = (event.state && event.state.page) ? event.state.page : 'home';
    nav(page, false);
};

// --- POST & INTERACTION SYSTEM ---
const handlePostSubmit = () => {
    const content = $('post-input').value;
    const user = auth.currentUser;
    if (!content.trim()) return alert("কিছু লিখুন!");

    db.collection("posts").add({
        text: content,
        author: user ? user.email.split('@')[0] : 'SAKIB', 
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        likes: 0
    }).then(() => {
        $('post-input').value = ""; 
    });
};

const handleLike = (postId) => {
    db.collection("posts").doc(postId).update({
        likes: firebase.firestore.FieldValue.increment(1)
    });
};

const handleCommentSubmit = (postId) => {
    const input = $(`comment-in-${postId}`);
    const user = auth.currentUser;
    if (!input.value.trim()) return;

    db.collection("posts").doc(postId).collection("comments").add({
        text: input.value,
        author: user ? user.email.split('@')[0] : 'User',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => { input.value = ""; });
};

const toggleCommentBox = (postId) => {
    const box = $(`comment-box-${postId}`);
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
};

const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("লিঙ্ক কপি করা হয়েছে!");
};

// কমেন্ট লোড করার ফাংশন (উন্নত সংস্করণ)
const loadComments = (postId) => {
    db.collection("posts").doc(postId).collection("comments").orderBy("timestamp", "asc").onSnapshot((snap) => {
        const list = $(`comments-list-${postId}`);
        const countSpan = $(`comment-count-${postId}`);
        
        if (list) {
            list.innerHTML = "";
            snap.forEach(cDoc => {
                const cData = cDoc.data();
                list.innerHTML += `<div style="background: #1a1a1a; padding: 8px; border-radius: 10px; margin-bottom: 5px; border: 1px solid #222;">
                    <strong style="font-size: 10px; color: var(--accent);">${cData.author}</strong>
                    <p style="font-size: 11px; color: #bbb; margin: 2px 0;">${cData.text}</p>
                </div>`;
            });
        }
        
        if (countSpan) {
            countSpan.innerText = snap.size;
        }
    });
};

// কার্ড তৈরি করার ফাংশন
const createPostHTML = (id, data) => {
    return `
        <div class="post-card" style="background: #111; padding: 15px; border-radius: 15px; margin-bottom: 15px; border: 1px solid #222;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <img src="https://i.postimg.cc/85zXp9mX/user-placeholder.png" style="width: 30px; height: 30px; border-radius: 50%;">
                <div>
                    <h4 style="font-size: 13px; color: var(--accent); text-transform: uppercase;">${data.author}</h4>
                    <p style="font-size: 9px; color: #555;">${data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : 'Just now'}</p>
                </div>
            </div>
            <p style="font-size: 14px; color: #ccc; margin-bottom: 15px;">${data.text}</p>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #222; padding-top: 10px;">
                <div style="display: flex; gap: 20px;">
                    <span onclick="handleLike('${id}')" style="cursor: pointer; color: #777; font-size: 13px;"><i class="fas fa-heart"></i> ${data.likes || 0}</span>
                    <span onclick="toggleCommentBox('${id}')" style="cursor: pointer; color: #777; font-size: 13px;"><i class="fas fa-comment"></i> <span id="comment-count-${id}">0</span></span>
                </div>
                <span onclick="handleShare()" style="cursor: pointer; color: #777; font-size: 13px;"><i class="fas fa-share"></i> Share</span>
            </div>
            <div id="comment-box-${id}" style="display: none; margin-top: 15px; border-top: 1px dashed #333; padding-top: 10px;">
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <input type="text" id="comment-in-${id}" placeholder="কমেন্ট লিখুন..." style="background: #1a1a1a; border: 1px solid #333; color: white; border-radius: 20px; padding: 5px 15px; flex: 1; outline: none; font-size: 12px;">
                    <button onclick="handleCommentSubmit('${id}')" style="background: var(--accent); border: none; color: black; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;"><i class="fas fa-paper-plane"></i></button>
                </div>
                <div id="comments-list-${id}"></div>
            </div>
        </div>`;
};

const loadPosts = () => {
    db.collection("posts").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        const displayArea = $('post-display-area');
        if(!displayArea) return;
        displayArea.innerHTML = ""; 
        snapshot.forEach((doc) => {
            displayArea.innerHTML += createPostHTML(doc.id, doc.data());
            loadComments(doc.id);
        });
    });
};

const loadMyPosts = () => {
    const user = auth.currentUser;
    if (!user) return;
    const authorName = user.email.split('@')[0];
    
    db.collection("posts").where("author", "==", authorName).orderBy("timestamp", "desc").onSnapshot((snap) => {
        const area = $('user-posts-area');
        if(!area) return;
        area.innerHTML = "";
        
        snap.forEach(doc => {
            area.innerHTML += createPostHTML(doc.id, doc.data());
            loadComments(doc.id);
        });
    });
};

const openEdit = () => { $('i-name').value = $('d-name').innerText; $('i-bio').value = $('d-bio').innerText; $('edit-page').style.display = 'flex'; };
const closeEdit = () => $('edit-page').style.display = 'none';
const saveAll = () => { $('d-name').innerText = $('i-name').value; $('d-bio').innerText = $('i-bio').value; closeEdit(); };
function switchVideoMode(mode) { const isShorts = mode === 'shorts'; $('btn-short-reels').classList.toggle('active', isShorts); $('btn-long-videos').classList.toggle('active', !isShorts); }
