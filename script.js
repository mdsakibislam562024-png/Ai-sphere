// --- Firebase & App Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyB1T8RtehtewhrTUWiwTomVv5nwwSzyIdw",
    authDomain: "ai-sphere-2.firebaseapp.com",
    projectId: "ai-sphere-2",
    storageBucket: "ai-sphere-2.firebasestorage.app",
    messagingSenderId: "287882935194",
    appId: "1:287882935194:web:2401447236fb80b26f5823"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(), db = firebase.firestore();
const cloudName = "ddcdcbepv", uploadPreset = "aisphere_preset"; 

let isLoginMode = true, currentPage = 'home', globalPostsCache = [];
const $ = id => document.getElementById(id);
const activeListeners = {}; 

// --- Core Helper Functions ---
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, { method: "POST", body: formData });
        const data = await res.json();
        return data.secure_url;
    } catch (e) { console.error("Cloudinary Error:", e); return null; }
}

const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "এইমাত্র";
    const postDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = Math.floor((new Date() - postDate) / 1000);
    if (diff < 60) return "এইমাত্র";
    const mins = Math.floor(diff / 60); if (mins < 60) return `${mins} মিনিট আগে`;
    const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs} ঘণ্টা আগে`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? "গতকাল" : days < 7 ? `${days} দিন আগে` : postDate.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long' });
};

// --- Initialization & Theme ---
document.addEventListener("DOMContentLoaded", () => {
    ['js-comment-modal', 'js-comment-overlay'].forEach(id => $(id)?.remove());
    const isDark = localStorage.getItem('theme') !== 'light';
    if ($('darkModeCheckbox')) $('darkModeCheckbox').checked = isDark;
    document.body.classList.toggle('light-mode', !isDark);
    
    // ইউজার অলরেডি লগইন থাকলে অটোমেটিক ফ্রেন্ডস ট্র্যাকিং অন রাখার জন্য
    auth.onAuthStateChanged(user => {
        if (user && currentPage === 'friends') loadUsersForFollow();
    });
});

const toggleDarkMode = () => {
    const isChecked = $('darkModeCheckbox').checked;
    document.body.classList.toggle('light-mode', !isChecked);
    localStorage.setItem('theme', isChecked ? 'dark' : 'light');
};

// --- Navigation & Routing ---
const toggleSidebar = () => {
    const active = $('sidebar').classList.toggle('active');
    $('overlay').style.display = active ? 'block' : 'none';
};

window.onpopstate = (e) => {
    const target = e.state?.page || 'home';
    nav(target, false);
    if (target === 'home' && ['dashboard', 'profile-security', 'wallet', 'refer', 'support', 'copyright', 'settings', 'privacy', 'about', 'friends'].includes(currentPage)) {
        if (!$('sidebar').classList.contains('active')) toggleSidebar();
    } else if ($('sidebar').classList.contains('active')) toggleSidebar();
};

// সেকশন লিস্ট
const sections = ['hero-section', 'reels-section', 'messages-section', 'profile-page', 'global-feed-section', 'about-page', 'privacy-page', 'settings-page', 'dashboard-page', 'profile-security-page', 'wallet-page', 'refer-page', 'support-page', 'copyright-page', 'friends-page'];

function nav(page, addHistory = true) {
    sections.forEach(s => $(s) && ($(s).style.display = 'none'));
    if (page === 'home') {
        $('hero-section').style.display = 'flex';
    } else {
        const target = page === 'profile' ? 'profile-page' : page === 'global-feed' ? 'global-feed-section' : page === 'reels' ? 'reels-section' : page === 'about' ? 'about-page' : page === 'privacy' ? 'privacy-page' : page === 'settings' ? 'settings-page' : page === 'friends' ? 'friends-page' : ($(sections.includes(page + '-page')) ? page + '-page' : page + '-section');
        if ($(target)) {
            // যদি মেসেজ পেজ হয় তবে flex ডিসপ্লে হবে ফুল স্ক্রিনের জন্য, অন্যথায় block হবে
            $(target).style.display = page === 'messages' ? 'flex' : 'block';
            
            if (page === 'global-feed') loadPosts();
            if (page === 'profile') { loadUserProfile(); loadMyPosts(); }
            if (page === 'reels') loadReels();
            if (page === 'friends') loadUsersForFollow(); // ফ্রেন্ডস পেজে গেলে ইউজার লিস্ট লোড হবে
        }
    }
    if (addHistory) history.pushState({ page }, "", "#" + page);
    currentPage = page;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    $('tab-' + page)?.classList.add('active');
    if (addHistory && $('sidebar').classList.contains('active')) toggleSidebar();
}

// --- Shortcuts for Sidebar Pages ---
const openDashboard = () => nav('dashboard'), openProfileSecurity = () => nav('profile-security'), openWallet = () => nav('wallet'), openReferral = () => nav('refer'), openCopyright = () => nav('copyright'), openSettings = () => nav('settings'), openPrivacy = () => nav('privacy'), openAbout = () => nav('about'), openLiveSupport = () => nav('support');

// --- Authentication Engine ---
const toggleAuthMode = () => {
    isLoginMode = !isLoginMode;
    $('auth-title').innerText = isLoginMode ? "AI SPHERE" : "SIGN UP";
    $('authBtn').innerText = isLoginMode ? "Login" : "Register";
    $('auth-switch').innerText = isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Login";
};

const handleAuth = () => {
    const email = $('email').value, pass = $('password').value, status = $('auth-status');
    if (!email || !pass) return status.innerText = "Email and Password required!";
    (isLoginMode ? auth.signInWithEmailAndPassword(email, pass) : auth.createUserWithEmailAndPassword(email, pass))
        .then((userCredential) => { 
            const user = userCredential.user;
            if(!isLoginMode) {
                db.collection("users").doc(user.uid).set({
                    email: user.email,
                    username: user.email.split('@')[0],
                    name: user.email.split('@')[0],
                    displayName: user.email.split('@')[0],
                    bio: "AI Sphere User",
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            $('onboarding-wrapper').style.display = 'none'; 
            $('home-page').style.display = 'flex'; 
            nav('home', true); 
        })
        .catch(e => status.innerText = e.message);
};

const changePassword = () => {
    const newPass = prompt("সাকিব, তোমার নতুন পাসওয়ার্ডটি এখানে দাও:");
    if (newPass && newPass.length >= 6) auth.currentUser.updatePassword(newPass).then(() => alert("সফল!")).catch(e => alert(e.message));
};

const handleLogout = () => auth.signOut().then(() => location.reload());

// --- Profile Customization ---
const loadUserProfile = () => {
    const user = auth.currentUser; if (!user) return;
    
    db.collection("users").doc(user.uid).onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            if (data.profilePic) $('my-profile-img').src = data.profilePic;
            if (data.coverPic) $('my-cover-img').src = data.coverPic;
            
            const currentName = data.displayName || data.name || data.username || user.email.split('@')[0];
            $('profile-name').innerText = currentName.toUpperCase();
            $('profile-bio').innerText = data.bio || "Cyber Security Expert | Developer";
        }
    });

    db.collection("users").doc(user.uid).collection("followers").onSnapshot(snap => {
        if ($('follower-count')) $('follower-count').innerText = snap.size;
    });

    db.collection("users").doc(user.uid).collection("following").onSnapshot(snap => {
        if ($('following-count')) $('following-count').innerText = snap.size;
    });
};

const editProfileDetails = () => {
    if ($('edit-profile-modal') && $('edit-profile-overlay')) {
        $('edit-profile-modal').style.display = 'block';
        $('edit-profile-overlay').style.display = 'block';
        if ($('profile-name-input')) $('profile-name-input').value = $('profile-name').innerText;
        if ($('profile-bio-input')) $('profile-bio-input').value = $('profile-bio').innerText;
    }
};

const saveProfileData = () => {
    const user = auth.currentUser; if (!user) return;
    const newName = $('profile-name-input')?.value.trim();
    const newBio = $('profile-bio-input')?.value.trim();

    if (!newName) return alert("সাকিব, নাম খালি রাখা যাবে না!");

    db.collection("users").doc(user.uid).update({
        name: newName,
        displayName: newName, 
        bio: newBio
    })
    .then(() => {
        alert("প্রোফাইল সফলভাবে আপডেট হয়েছে!");
        $('edit-profile-modal').style.display = 'none';
        $('edit-profile-overlay').style.display = 'none';
    })
    .catch(e => alert("সেভ করতে সমস্যা হয়েছে: " + e.message));
};

async function updateProfileMedia(type) {
    const file = $(type === 'profile' ? 'profile-upload' : 'cover-upload').files[0], user = auth.currentUser;
    if (!file || !user) return;
    const url = await uploadToCloudinary(file);
    if (url) {
        db.collection("users").doc(user.uid).set({ [type + "Pic"]: url, email: user.email, username: user.email.split('@')[0] }, { merge: true })
            .then(() => { $(type === 'profile' ? 'my-profile-img' : 'my-cover-img').src = url; alert(`Success: ${type} updated!`); })
            .catch(e => alert("Firestore Error: " + e.message));
    }
}

// --- Post & Like Features ---
const handlePostSubmit = async () => {
    const content = $('post-input').value, file = $('post-image-input')?.files[0];
    if (!content.trim() && !file) return;
    const url = file ? await uploadToCloudinary(file) : null;
    db.collection("posts").add({ text: content, image: url, author: auth.currentUser?.email.split('@')[0] || 'SAKIB', timestamp: firebase.firestore.FieldValue.serverTimestamp(), likes: 0 })
        .then(() => { $('post-input').value = ""; if ($('post-image-input')) $('post-image-input').value = ""; alert("পোস্ট হয়েছে!"); })
        .catch(e => alert("Post Error: " + e.message));
};

const handleLike = (e, id) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    [`like-count-${id}`, `reel-like-count-${id}`].forEach(sel => {
        const el = $(sel); if (el) el.innerText = (parseInt(el.innerText) || 0) + 1;
    });
    db.collection("posts").doc(id).update({ likes: firebase.firestore.FieldValue.increment(1) }).catch(err => console.error(err));
};

const handleShare = () => { navigator.clipboard.writeText(window.location.href); alert("লিঙ্ক কপি হয়েছে!"); };

// --- Feed UI Template Generator ---
const createPostHTML = (id, data) => {
    let media = "";
    if (data.image) {
        const isVid = data.image.match(/\.(mp4|webm|ogg|mov)/i) || data.image.includes("/video/upload/");
        media = isVid ? `<video src="${data.image}" controls style="width:100%; border-radius:12px; margin:10px 0;"></video>` : `<img src="${data.image}" style="width:100%; border-radius:12px; margin:10px 0;">`;
    }
    return `
    <div class="post-card" id="post-card-${id}" style="margin-bottom:15px; padding:15px; background:var(--card-bg); border-radius:15px; border:1px solid var(--border-color); overflow:hidden;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="color:var(--accent); font-size:15px;">@${data.author}</strong>
            <span style="font-size:11px; opacity:0.5; color:var(--text-color);"><i class="far fa-clock" style="margin-right:3px;"></i>${formatTimeAgo(data.timestamp)}</span>
        </div>
        <p style="margin-top:5px; font-size:14px; line-height:1.5; color:var(--text-color);">${data.text}</p>${media}
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px; padding-top:10px; border-top:1px solid var(--border-color); color:var(--text-color);">
            <button onclick="handleLike(event, '${id}')" style="background:transparent; border:none; outline:none; cursor:pointer; display:flex; align-items:center; gap:6px; font-size:14px; color:inherit; padding:0;"><i class="fas fa-heart" style="color:#ff4444;"></i><span id="like-count-${id}">${data.likes || 0}</span></button>
            <button onclick="toggleInlineCommentBox('${id}', false)" style="background:transparent; border:none; outline:none; cursor:pointer; display:flex; align-items:center; gap:6px; font-size:14px; color:inherit; padding:0;"><i class="fas fa-comment"></i><span id="comment-count-${id}">0</span></button>
            <button onclick="handleShare()" style="background:transparent; border:none; outline:none; cursor:pointer; display:flex; align-items:center; gap:6px; font-size:14px; color:inherit; padding:0;"><i class="fas fa-share"></i><span>Share</span></button>
        </div>
        <div id="inline-comment-box-${id}" data-opened="false" style="display:none; margin-top:15px; padding-top:15px; border-top:1px dashed var(--border-color);">
            <div id="inline-comments-list-${id}" style="max-height:200px; overflow-y:auto; margin-bottom:12px;"></div>
            <div style="display:flex; gap:8px; align-items:center;">
                <input type="text" id="inline-input-${id}" placeholder="একটি মন্তব্য লিখুন..." style="flex:1; background:rgba(0,0,0,0.03); border:1px solid var(--border-color); color:var(--text-color); padding:8px 14px; border-radius:20px; outline:none; font-size:13px;">
                <button onclick="handleCommentSubmitData('${id}', false)" style="background:var(--accent); color:#000; border:none; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center;"><i class="fas fa-paper-plane" style="font-size:12px;"></i></button>
            </div>
        </div>
    </div>`;
};

// --- Live Feed & My Posts Feed Controllers ---
const loadPosts = () => {
    db.collection("posts").orderBy("timestamp", "desc").onSnapshot(snap => {
        const area = $('post-display-area'); if (!area) return;
        if (globalPostsCache.length === 0 || snap.docChanges().length > 1) {
            area.innerHTML = "";
            snap.forEach(doc => { area.innerHTML += createPostHTML(doc.id, doc.data()); loadCommentsCount(doc.id); });
        } else {
            snap.docChanges().forEach(change => {
                const id = change.doc.id, data = change.doc.data();
                if (change.type === "modified" && $(`like-count-${id}`)) $(`like-count-${id}`).innerText = data.likes || 0;
                else if (change.type === "added") {
                    const el = document.createElement('div'); el.innerHTML = createPostHTML(id, data);
                    area.insertBefore(el.firstElementChild, area.firstChild); loadCommentsCount(id);
                }
            });
        }
        globalPostsCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });
};

const loadMyPosts = () => {
    const user = auth.currentUser; if (!user) return;
    db.collection("posts").where("author", "==", user.email.split('@')[0]).onSnapshot(snap => {
        $('user-posts-area').innerHTML = "";
        snap.forEach(doc => $('user-posts-area').innerHTML += createPostHTML(doc.id, doc.data()));
    });
};

// --- Real-time Comments Engine ---
const toggleInlineCommentBox = (postId, isReel = false) => {
    const box = $(isReel ? `reel-comment-box-${postId}` : `inline-comment-box-${postId}`); if (!box) return;
    const isOpen = box.dataset.opened === "true";
    if (!isOpen) {
        if (isReel) { box.style.display = 'flex'; setTimeout(() => box.style.transform = 'translateY(0)', 10); } else { box.style.display = 'block'; }
        box.dataset.opened = "true"; loadLiveCommentsData(postId, isReel);
    } else {
        if (isReel) { box.style.transform = 'translateY(100%)'; setTimeout(() => box.style.display = 'none', 300); } else { box.style.display = 'none'; }
        box.dataset.opened = "false";
        if (activeListeners[postId]) { activeListeners[postId](); delete activeListeners[postId]; }
    }
};

const handleCommentSubmitData = async (postId, isReel = false) => {
    const input = $(isReel ? `reel-input-${postId}` : `inline-input-${postId}`), text = input.value.trim();
    if (!text) return;
    db.collection("posts").doc(postId).collection("comments").add({ text, author: auth.currentUser ? auth.currentUser.email.split('@')[0] : 'SAKIB', timestamp: firebase.firestore.FieldValue.serverTimestamp() })
        .then(() => input.value = "").catch(e => console.error(e));
};

const loadLiveCommentsData = (postId, isReel = false) => {
    if (activeListeners[postId]) activeListeners[postId]();
    activeListeners[postId] = db.collection("posts").doc(postId).collection("comments").orderBy("timestamp", "asc")
        .onSnapshot(snap => {
            const list = $(isReel ? `reel-comments-list-${postId}` : `inline-comments-list-${postId}`); if (!list) return;
            list.innerHTML = snap.empty ? `<p style="font-size:12px; opacity:0.5; text-align:center; margin:15px 0; color:${isReel ? '#fff' : 'var(--text-color)'};">কোনো মন্তব্য নেই। প্রথম কমেন্টটি করো!</p>` : "";
            snap.forEach(doc => {
                const d = doc.data();
                list.innerHTML += `<div style="display:flex; gap:8px; margin-bottom:10px; align-items:flex-start;"><div style="width:26px; height:26px; background:rgba(0,229,255,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:10px; color:#00e5ff; flex-shrink:0; border:1px solid rgba(0,229,255,0.2);">${d.author ? d.author.charAt(0).toUpperCase() : 'S'}</div><div style="flex:1; background:${isReel ? 'rgba(255,255,255,0.06)' : 'var(--border-color)'}; padding:8px 12px; border-radius:0 12px 12px 12px; overflow-wrap:break-word;"><span style="color:#00e5ff; font-size:11px; font-weight:600; display:block;">@${d.author}</span><p style="margin:0; font-size:12.5px; color:${isReel ? '#fff' : 'var(--text-color)'}; line-height:1.4;">${d.text}</p></div></div>`;
            });
            list.scrollTop = list.scrollHeight;
        });
};

const loadCommentsCount = (id) => {
    db.collection("posts").doc(id).collection("comments").onSnapshot(snap => {
        if ($(`comment-count-${id}`)) $(`comment-count-${id}`).innerText = snap.size;
        if ($(`reel-comment-count-${id}`)) $(`reel-comment-count-${id}`).innerText = snap.size;
    });
};

// --- Premium Reels Engine ---
const loadReels = () => {
    db.collection("posts").orderBy("timestamp", "desc").onSnapshot(snapshot => {
        const area = $('reels-section'); if (!area) return;
        if (area.children.length === 0) {
            snapshot.forEach(doc => {
                const d = doc.data();
                if (d.image && (d.image.match(/\.(mp4|webm|ogg|mov)/i) || d.image.includes("/video/upload/"))) {
                    area.innerHTML += `
                    <div class="reel-card" id="reel-card-${doc.id}" style="position:relative; width:100%; height:100%; background:#000; scroll-snap-align:start; display:flex; flex-direction:column; overflow:hidden;">
                        <div style="position:relative; width:100%; flex:1; background:#000;">
                            <video src="${d.image}" loop muted playsinline style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0; z-index:1;" onclick="this.paused ? this.play() : this.pause(); this.muted = false;"></video>
                            <div style="position:absolute; bottom:20px; left:15px; color:#fff; z-index:5; text-shadow:2px 2px 8px rgba(0,0,0,0.8); max-width:70%; pointer-events:none;">
                                <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px;"><h4 style="color:#00e5ff; margin:0; font-size:16px; font-weight:bold;">@${d.author}</h4><span style="font-size:11px; opacity:0.7; background:rgba(0,0,0,0.4); padding:2px 6px; border-radius:10px;">${formatTimeAgo(d.timestamp)}</span></div>
                                <p style="font-size:13px; opacity:0.9; margin:0; line-height:1.4;">${d.text}</p>
                            </div>
                            <div style="position:absolute; right:15px; bottom:30px; display:flex; flex-direction:column; gap:22px; color:#fff; z-index:10; text-align:center; background:rgba(0,0,0,0.3); padding:15px 10px; border-radius:30px; backdrop-filter:blur(5px);">
                                <button onclick="handleLike(event, '${doc.id}')" style="background:transparent; border:none; outline:none; cursor:pointer; color:#fff;"><i class="fas fa-heart" style="color:#ff4444; font-size:26px;"></i><div id="reel-like-count-${doc.id}" style="font-weight:bold; font-size:12px; margin-top:4px;">${d.likes || 0}</div></button>
                                <div onclick="toggleInlineCommentBox('${doc.id}', true)" style="cursor:pointer;"><i class="fas fa-comment" style="color:#fff; font-size:26px;"></i><div id="reel-comment-count-${doc.id}" style="font-weight:bold; font-size:12px; margin-top:4px;">0</div></div>
                                <div onclick="handleShare()" style="cursor:pointer;"><i class="fas fa-share" style="color:#fff; font-size:26px;"></i><div style="font-weight:bold; font-size:11px; margin-top:4px;">Share</div></div>
                            </div>
                        </div>
                        <div id="reel-comment-box-${doc.id}" data-opened="false" style="display:none; position:absolute; bottom:0; left:0; width:100%; height:50%; background:rgba(13,13,13,0.95); backdrop-filter:blur(20px); border-top:1px solid rgba(255,255,255,0.15); border-radius:20px 20px 0 0; z-index:99; flex-direction:column; transform:translateY(100%); transition:transform 0.3s ease-out; padding:12px 15px; box-sizing:border-box;">
                            <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1);"><span style="color:#fff; font-size:13px; font-weight:600;">Comments</span><i class="fas fa-chevron-down" onclick="toggleInlineCommentBox('${doc.id}', true)" style="cursor:pointer; color:rgba(255,255,255,0.6); font-size:14px; padding:4px;"></i></div>
                            <div id="reel-comments-list-${doc.id}" style="flex:1; overflow-y:auto; margin:10px 0;"></div>
                            <div style="display:flex; gap:8px; align-items:center; background:#000; padding:6px 12px; border-radius:25px; border:1px solid rgba(255,255,255,0.15);"><input type="text" id="reel-input-${doc.id}" placeholder="মন্তব্য লিখুন..." style="flex:1; background:transparent; border:none; color:#fff; outline:none; font-size:13px;"><button onclick="handleCommentSubmitData('${doc.id}', true)" style="background:#00e5ff; color:#000; border:none; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center;"><i class="fas fa-paper-plane" style="font-size:11px;"></i></button></div>
                        </div>
                    </div>`;
                    loadCommentsCount(doc.id);
                }
            });
        } else {
            snapshot.docChanges().forEach(change => {
                if (change.type === "modified" && $(`reel-like-count-${change.doc.id}`)) $(`reel-like-count-${change.doc.id}`).innerText = change.doc.data().likes || 0;
            });
        }
    });
};

// --- Real-Time Friends & Follow Engine ---
const loadUsersForFollow = () => {
    const container = $('user-list-container'); if (!container) return;
    const currentUser = auth.currentUser; if (!currentUser) return;

    container.innerHTML = `<p style="text-align:center; opacity:0.6; font-size:13px; margin-top:20px;">ইউজার লিস্ট লোড হচ্ছে...</p>`;

    db.collection("users").doc(currentUser.uid).collection("following").onSnapshot(followingSnap => {
        const followingList = followingSnap.docs.map(doc => doc.id);

        db.collection("users").onSnapshot(snapshot => {
            container.innerHTML = "";
            if (snapshot.empty) {
                container.innerHTML = `<p style="text-align:center; opacity:0.5; font-size:12px;">কোনো ইউজার খুঁজে পাওয়া যায়নি।</p>`;
                return;
            }

            snapshot.forEach(doc => {
                const userId = doc.id;
                const userData = doc.data();

                if (userId === currentUser.uid) return; 

                const userName = userData.displayName || userData.name || userData.username || userData.email?.split('@')[0] || "AI User";
                const userBio = userData.bio || "AI Sphere User";
                const userUID = userData.username || "user";
                const isFollowing = followingList.includes(userId);
                
                const btnText = isFollowing ? "Following" : "Follow";
                const btnClass = isFollowing ? "follow-btn following" : "follow-btn";
                const firstLetter = userName.charAt(0).toUpperCase();
                const userAvatar = userData.profilePic ? `<img src="${userData.profilePic}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : firstLetter;

                container.innerHTML += `
                <div class="user-card" style="display: flex; justify-content: space-between; align-items: center; background: var(--card-bg); padding: 12px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; background: var(--accent); border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: bold; color: #000; overflow:hidden;">${userAvatar}</div>
                        <div>
                            <h4 style="margin: 0; font-size: 14px; color: var(--text-color);">${userName.toUpperCase()}</h4>
                            <p style="margin: 0; font-size: 11px; opacity: 0.6; margin-bottom: 2px;">@${userUID.toLowerCase()}</p>
                            <p style="margin: 0; font-size: 11px; color: var(--text-color); opacity: 0.5; font-style: italic;">${userBio}</p>
                        </div>
                    </div>
                    <button class="${btnClass}" data-user-id="${userId}" onclick="handleFollowToggle(this)" style="background: var(--accent); color: black; border: none; padding: 6px 16px; border-radius: 20px; font-weight: bold; cursor: pointer; font-size: 12px;">${btnText}</button>
                </div>`;
            });
            
            if(container.innerHTML === "") {
                container.innerHTML = `<p style="text-align:center; opacity:0.5; font-size:12px;">তুমি ছাড়া আর কোনো ইউজার নেই।</p>`;
            }
        });
    }, err => {
        console.error(err);
        container.innerHTML = `<p style="text-align:center; color:#ff4444; font-size:12px;">ইউজার লোড করতে সমস্যা হয়েছে।</p>`;
    });
};

const handleFollowToggle = (btn) => {
    const targetUserId = btn.getAttribute('data-user-id'); 
    const currentUser = auth.currentUser; 
    if (!currentUser || !targetUserId) return;

    const isFollowing = btn.classList.contains('following');
    const myFollowingRef = db.collection("users").doc(currentUser.uid).collection("following").doc(targetUserId);
    const targetFollowersRef = db.collection("users").doc(targetUserId).collection("followers").doc(currentUser.uid);

    if (isFollowing) {
        Promise.all([myFollowingRef.delete(), targetFollowersRef.delete()])
        .then(() => { btn.classList.remove('following'); btn.innerText = "Follow"; })
        .catch(e => console.error("Unfollow Error:", e));
    } else {
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        Promise.all([myFollowingRef.set({ timestamp: timestamp }), targetFollowersRef.set({ timestamp: timestamp })])
        .then(() => { btn.classList.add('following'); btn.innerText = "Following"; })
        .catch(e => console.error("Follow Error:", e));
    }
};
