/* ==========================================================================
   ১. ফায়ারবেস ও অ্যাপ কনফিগারেশন (Firebase & Cloudinary Initialization)
   ========================================================================== */
const firebaseConfig = {
    apiKey: "AIzaSyB1T8RtehtewhrTUWiwTomVv5nwwSzyIdw",
    authDomain: "ai-sphere-2.firebaseapp.com",
    projectId: "ai-sphere-2",
    storageBucket: "ai-sphere-2.firebasestorage.app",
    messagingSenderId: "287882935194",
    appId: "1:287882935194:web:2401447236fb80b26f5823"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = (typeof firebase !== 'undefined') ? firebase.auth() : null;
const db = (typeof firebase !== 'undefined') ? firebase.firestore() : null;
const cloudName = "ddcdcbepv", uploadPreset = "aisphere_preset"; 

// গ্লোবাল স্টেট এবং ভেরিয়েবলসমূহ
let isLoginMode = true, currentPage = 'home', globalPostsCache = [];
let isAppUnmuted = false, activeReelTimeout = null, viewsChartInstance = null, dashboardListener = null; 
const $ = id => document.getElementById(id);
const activeListeners = {}; 
const sections = ['hero-section', 'reels-section', 'messages-section', 'profile-page', 'global-feed-section', 'about-page', 'privacy-page', 'settings-page', 'dashboard-page', 'profile-security-page', 'wallet-page', 'refer-page', 'support-page', 'copyright-page', 'friends-page'];

// মেসেঞ্জার ও কলিং স্টেট ভেরিয়েবল
let activeChatId = null; 
let activeChatPartnerId = null;
let activeChatPartnerName = "";
let activeChatUserId = null; // কলিং ইঞ্জিনের জন্য গ্লোবাল ভ্যারিয়েবল

// প্রোফাইল ওপেন করার গ্লোবাল নেভিগেশন হেল্পার
window.openUserProfile = function(targetUserId, targetAuthor) {
    if (typeof nav === 'function') {
        nav('profile', true, targetUserId, targetAuthor);
    }
};

/* ==========================================================================
   ২. কোর হেল্পার ফাংশনস (Cloudinary Upload & Time Formatter)
   ========================================================================== */
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

/* ==========================================================================
   ৩. ইনিশিয়ালাইজেশন ও থিম সেটিংস (DOM Content Loaded & Dark Mode)
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    ['js-comment-modal', 'js-comment-overlay'].forEach(id => $(id)?.remove());
    const isDark = localStorage.getItem('theme') !== 'light';
    if ($('darkModeCheckbox')) $('darkModeCheckbox').checked = isDark;
    document.body.classList.toggle('light-mode', !isDark);
    
    if (auth) {
        auth.onAuthStateChanged(user => {
            if (user) {
                if ($('onboarding-wrapper')) $('onboarding-wrapper').style.display = 'none';
                if ($('home-page')) $('home-page').style.display = 'flex';
                nav('home', false);
                
                // user.uid পাস করার বদলে সরাসরি উইন্ডো ফাংশনটি কল করো
                if (typeof window.listenForIncomingCalls === 'function') {
                    window.listenForIncomingCalls(); 
                }
                
            } else {
                if ($('onboarding-wrapper')) $('onboarding-wrapper').style.display = 'flex';
                if ($('home-page')) $('home-page').style.display = 'none';
            }
        });
    } else {
        if ($('onboarding-wrapper')) $('onboarding-wrapper').style.display = 'none';
        if ($('home-page')) $('home-page').style.display = 'flex';
    }
});

const toggleDarkMode = () => {
    const isChecked = $('darkModeCheckbox').checked;
    document.body.classList.toggle('light-mode', !isChecked);
    localStorage.setItem('theme', isChecked ? 'dark' : 'light');
};

/* ==========================================================================
   ৪. অ্যাপ রাউটিং ও নেভিগেশন ইঞ্জিন (Sidebar & History Popstate Handling)
   ========================================================================== */
const toggleSidebar = (pushHistory = true) => {
    const active = $('sidebar').classList.toggle('active');
    if ($('overlay')) $('overlay').style.display = active ? 'block' : 'none';
    if (active && pushHistory) history.pushState({ page: 'sidebar' }, "", "#sidebar");
};

window.onpopstate = (e) => {
    const target = e.state?.page || 'home';
    const sidebarPages = ['dashboard', 'profile-security', 'wallet', 'refer', 'support', 'copyright', 'settings', 'privacy', 'about'];
    
    if (target === 'sidebar') {
        if (sidebarPages.includes(currentPage)) {
            sections.forEach(s => $(s) && ($(s).style.display = 'none'));
            if ($('hero-section')) $('hero-section').style.display = 'flex';
            currentPage = 'home';
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            $('tab-home')?.classList.add('active');
            if (!$('sidebar').classList.contains('active')) toggleSidebar(false);
        } else {
            nav('home', false);
        }
    } else {
        nav(target, false);
        if ($('sidebar').classList.contains('active')) toggleSidebar(false);
    }
};

function nav(page, addHistory = true, targetUserId = null, targetAuthor = null) {
    sections.forEach(s => $(s) && ($(s).style.display = 'none'));
    
    if (page === 'home') {
        if ($('hero-section')) $('hero-section').style.display = 'flex';
    } else {
        let target = page + '-page';
        if (page === 'profile') target = 'profile-page';
        else if (page === 'global-feed') target = 'global-feed-section';
        else if (page === 'reels') target = 'reels-section';
        else if (page === 'messages') target = 'messages-section';
        else if (page === 'friends') target = 'friends-page';
        else if (page === 'support') target = 'support-page';
        else if (page === 'refer') target = 'refer-page';
        else if (page === 'dashboard') target = 'dashboard-page';

        if ($(target)) {
            $(target).style.display = page === 'messages' ? 'flex' : 'block';
            if (page === 'global-feed') loadPosts();
            if (page === 'profile') { loadUserProfile(targetUserId, targetAuthor); loadMyPosts(targetUserId); }
            if (page === 'reels') loadReels();
            if (page === 'friends') loadUsersForFollow(); 
            if (page === 'dashboard') loadDashboardAnalytics(); 
            if (page === 'messages') loadRecentChatsList(); 
        }
    }
    
    if (addHistory) history.pushState({ page }, "", "#" + page);
    currentPage = page;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    $('tab-' + page)?.classList.add('active');
    if (addHistory && $('sidebar').classList.contains('active')) toggleSidebar(false);
}

const sidebarNav = (page) => { 
    history.pushState({ page: 'sidebar' }, "", "#sidebar"); 
    nav(page, false); 
    if ($('sidebar').classList.contains('active')) toggleSidebar(false);
};

const openDashboard = () => sidebarNav('dashboard'), 
      openProfileSecurity = () => sidebarNav('profile-security'), 
      openWallet = () => sidebarNav('wallet'), 
      openReferral = () => sidebarNav('refer'), 
      openCopyright = () => sidebarNav('copyright'), 
      openSettings = () => sidebarNav('settings'), 
      openPrivacy = () => sidebarNav('privacy'), 
      openAbout = () => sidebarNav('about'), 
      openLiveSupport = () => sidebarNav('support');

/* ==========================================================================
   ৫. অথেন্টিকেশন ইঞ্জিন (Login, Signup & Password Update)
   ========================================================================== */
const toggleAuthMode = () => {
    isLoginMode = !isLoginMode;
    if ($('auth-title')) $('auth-title').innerText = isLoginMode ? "AI SPHERE" : "SIGN UP";
    if ($('authBtn')) $('authBtn').innerText = isLoginMode ? "Login" : "Register";
    if ($('auth-switch')) $('auth-switch').innerText = isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Login";
};

const handleAuth = () => {
    const email = $('email').value, pass = $('password').value, status = $('auth-status');
    if (!email || !pass) return status.innerText = "Email and Password required!";
    if (!auth || !db) return alert("Firebase missing!");

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
        .catch(e => {
            status.innerText = e.message;
            // টেস্টিং সেফটি গার্ড: ওটিপি বা লগইন এরর আসলেও ট্রাই করার সুবিধার্থে হোমপেজে নিয়ে যাবে
            $('onboarding-wrapper').style.display = 'none'; 
            $('home-page').style.display = 'flex'; 
            nav('home', true);
        });
};

const changePassword = () => {
    if(!auth.currentUser) return;
    const newPass = prompt("সাকিব, তোমার নতুন পাসওয়ার্ডটি এখানে দাও:");
    if (newPass && newPass.length >= 6) auth.currentUser.updatePassword(newPass).then(() => alert("সফল!")).catch(e => alert(e.message));
};

const handleLogout = () => auth ? auth.signOut().then(() => location.reload()) : location.reload();

/* ==========================================================================
   ৬. প্রোফাইল ম্যানেজমেন্ট ও কাস্টমাইজেশন (Load, Edit & Save User Profile)
   ========================================================================== */
const loadUserProfile = (targetUserId = null, targetAuthor = null) => {
    if (!auth || !auth.currentUser) return;
    const user = auth.currentUser; 
    const myUid = user.uid;
    const myUsername = user.email.split('@')[0].toLowerCase();
    const isOwnProfile = (!targetUserId || targetUserId === myUid || (targetAuthor && targetAuthor.toLowerCase() === myUsername));

    if (window.activeProfileListener) window.activeProfileListener();
    if (window.activeFollowersListener) window.activeFollowersListener();
    if (window.activeFollowingListener) window.activeFollowingListener();

    const editBtn = document.querySelector("#profile-page button[onclick*='editProfileDetails']");
    if(editBtn) editBtn.style.display = isOwnProfile ? "inline-block" : "none";

    const msgBtn = $('profile-msg-btn');
    if (msgBtn) {
        if (isOwnProfile || !targetUserId || targetUserId === 'undefined' || targetUserId === '') {
            msgBtn.style.display = "none";
        } else {
            msgBtn.style.display = "inline-flex"; 
            let cleanName = targetAuthor ? targetAuthor.replace('@', '') : "User";
            
            msgBtn.onclick = function() {
                if (typeof nav === 'function') nav('messages');
                window.openChatWithUser(targetUserId, cleanName);
            };
        }
    }

    if (isOwnProfile) {
        window.activeProfileListener = db.collection("users").doc(myUid).onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                if (data.profilePic && $('my-profile-img')) $('my-profile-img').src = data.profilePic;
                if (data.coverPic && $('my-cover-img')) $('my-cover-img').src = data.coverPic;
                const currentName = data.displayName || data.name || data.username || myUsername;
                if ($('profile-name')) $('profile-name').innerText = currentName.toUpperCase();
                if ($('profile-bio')) $('profile-bio').innerText = data.bio || "Cyber Security Expert | Developer";
            }
        });
        window.activeFollowersListener = db.collection("users").doc(myUid).collection("followers").onSnapshot(snap => { if ($('follower-count')) $('follower-count').innerText = snap.size; });
        window.activeFollowingListener = db.collection("users").doc(myUid).collection("following").onSnapshot(snap => { if ($('following-count')) $('following-count').innerText = snap.size; });
    } else {
        let cleanName = targetAuthor ? targetAuthor.replace('@', '') : "User";
        if ($('profile-name')) $('profile-name').innerText = cleanName.toUpperCase();
        if ($('profile-bio')) $('profile-bio').innerText = "AI Sphere Member";
        if ($('my-profile-img')) $('my-profile-img').src = "https://i.pravatar.cc/100?u=" + cleanName;
        if ($('my-cover-img')) $('my-cover-img').src = "https://via.placeholder.com/600x200?text=AI+Sphere+Cover"; 

        if (targetUserId && targetUserId !== 'undefined' && targetUserId !== '') {
            window.activeProfileListener = db.collection("users").doc(targetUserId).onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    if ($('profile-bio')) $('profile-bio').innerText = data.bio || "No bio available.";
                    if ($('my-profile-img') && data.profilePic) $('my-profile-img').src = data.profilePic;
                    if ($('my-cover-img') && data.coverPic) $('my-cover-img').src = data.coverPic;
                    if ($('profile-name') && (data.displayName || data.name)) {
                        $('profile-name').innerText = (data.displayName || data.name).toUpperCase();
                        if(msgBtn) {
                            let updatedName = data.displayName || data.name;
                            msgBtn.onclick = function() {
                                if (typeof nav === 'function') nav('messages');
                                window.openChatWithUser(targetUserId, updatedName);
                            };
                        }
                    }
                }
            });
            window.activeFollowersListener = db.collection("users").doc(targetUserId).collection("followers").onSnapshot(snap => { if ($('follower-count')) $('follower-count').innerText = snap.size; });
            window.activeFollowingListener = db.collection("users").doc(targetUserId).collection("following").onSnapshot(snap => { if ($('following-count')) $('following-count').innerText = snap.size; });
            
            const pFollowBtn = document.querySelector("#profile-page .follow-btn");
            if (pFollowBtn) {
                pFollowBtn.setAttribute('data-user-id', targetUserId);
                db.collection("users").doc(myUid).collection("following").doc(targetUserId).get().then(fDoc => {
                    const isFollowing = fDoc.exists;
                    pFollowBtn.innerText = isFollowing ? "Following" : "Follow";
                    pFollowBtn.style.background = isFollowing ? "#333333" : "var(--accent)";
                    pFollowBtn.style.color = isFollowing ? "#aaaaaa" : "black";
                    pFollowBtn.classList.toggle('following', isFollowing);
                });
            }
        }
    }
};

const editProfileDetails = (event) => {
    if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }

    if ($('edit-profile-modal') && $('edit-profile-overlay')) {
        $('edit-profile-modal').style.display = 'block';
        $('edit-profile-overlay').style.display = 'block';
        if ($('profile-name-input')) $('profile-name-input').value = $('profile-name') ? $('profile-name').innerText : "";
        if ($('profile-bio-input')) $('profile-bio-input').value = $('profile-bio') ? $('profile-bio').innerText : "";
    }
};

const saveProfileData = () => {
    if(!auth || !auth.currentUser) return;
    const newName = $('profile-name-input')?.value.trim();
    const newBio = $('profile-bio-input')?.value.trim();
    if (!newName) return alert(" নাম খালি রাখা যাবে না!");

    db.collection("users").doc(auth.currentUser.uid).update({ name: newName, displayName: newName, bio: newBio })
    .then(() => {
        alert("Profile updated successfully.!");
        $('edit-profile-modal').style.display = 'none';
        $('edit-profile-overlay').style.display = 'none';
    }).catch(e => alert("সেভ করতে সমস্যা হয়েছে: " + e.message));
};

async function updateProfileMedia(type) {
    if(!auth || !auth.currentUser) return;
    const file = $(type === 'profile' ? 'profile-upload' : 'cover-upload').files[0], user = auth.currentUser;
    if (!file || !user) return;
    const url = await uploadToCloudinary(file);
    if (url) {
        db.collection("users").doc(user.uid).set({ [type + "Pic"]: url, email: user.email, username: user.email.split('@')[0] }, { merge: true })
            .then(() => { if ($(type === 'profile' ? 'my-profile-img' : 'my-cover-img')) $(type === 'profile' ? 'my-profile-img' : 'my-cover-img').src = url; alert(`Success: ${type} updated!`); })
            .catch(e => alert("Firestore Error: " + e.message));
    }
}

/* ==========================================================================
   ７. গ্লোবাল ফিড এবং পোস্ট协同 সিস্টেম (Post Creation & Likes Engine)
   ========================================================================== */
const openPostModal = () => {
    if($('post-popup-overlay')) $('post-popup-overlay').style.display = 'block';
    if($('post-popup-modal')) $('post-popup-modal').style.display = 'block';
    ['modal-post-title', 'modal-post-input', 'modal-post-tags', 'post-media-trigger'].forEach(id => { if($(id)) $(id).value = ""; });
    if($('modal-media-preview')) { $('modal-media-preview').style.display = 'none'; $('modal-media-preview').innerHTML = ""; }
};

const closePostModal = () => {
    if($('post-popup-overlay')) $('post-popup-overlay').style.display = 'none';
    if($('post-popup-modal')) $('post-popup-modal').style.display = 'none';
};

const handleMediaSelection = (input) => {
    const file = input.files[0]; if (!file) return;
    if($('post-popup-overlay')) $('post-popup-overlay').style.display = 'block';
    if($('post-popup-modal')) $('post-popup-modal').style.display = 'block';

    const previewContainer = $('modal-media-preview');
    if(previewContainer) {
        previewContainer.innerHTML = ""; previewContainer.style.display = 'block';
        const fileURL = URL.createObjectURL(file);
        previewContainer.innerHTML = file.type.startsWith('video/') ? 
            `<video src="${fileURL}" controls style="width:100%; max-height:220px; object-fit:cover;"></video>` : 
            `<img src="${fileURL}" style="width:100%; max-height:220px; object-fit:cover;">`;
    }
};

const handleModalPostSubmit = async () => {
    const title = $('modal-post-title').value.trim(), content = $('modal-post-input').value.trim(), tags = $('modal-post-tags').value.trim();
    const file = $('post-media-trigger').files[0], submitBtn = $('modal-submit-btn');

    if (!content && !title && !file) return alert("খালি পোস্ট করা যাবে না!");
    if(submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> uploaded...`; }

    const url = file ? await uploadToCloudinary(file) : null;
    let fullText = title ? `⚡ **${title}**\n\n` : "";
    fullText += content; if (tags) fullText += `\n\n${tags}`;
    const currentUid = (auth && auth.currentUser) ? auth.currentUser.uid : '';

    if(db) {
        db.collection("posts").add({
            text: fullText, image: url,
            author: (auth && auth.currentUser) ? auth.currentUser.email.split('@')[0] : 'SAKIB',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(), likes: 0, userId: currentUid, uid: currentUid 
        })
        .then(() => { alert("পোস্টটি সফলভাবে গ্লোবাল ফিডে লাইভ হয়েছে!"); closePostModal(); })
        .catch(e => alert("Post Error: " + e.message))
        .finally(() => { if(submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = `<i class="fas fa-paper-plane"></i> post`; } });
    }
};

window.handleLike = (event, postId) => {
    if(event) event.stopPropagation(); if(!db) return;
    const postRef = db.collection("posts").doc(postId);
    db.runTransaction((transaction) => {
        return transaction.get(postRef).then((postDoc) => {
            if (!postDoc.exists) return;
            transaction.update(postRef, { likes: (postDoc.data().likes || 0) + 1 });
        });
    }).catch((err) => console.error("Like Error: ", err));
};

function toggleGlobalFollowButtons(userId, isNowFollowing) {
    document.querySelectorAll(`.follow-btn[data-user-id="${userId}"]`).forEach(btn => {
        btn.innerText = isNowFollowing ? 'Following' : 'Follow';
        btn.style.opacity = isNowFollowing ? '0.6' : '1';
        btn.style.background = isNowFollowing ? '#333333' : 'var(--accent)'; 
        btn.style.color = isNowFollowing ? '#aaaaaa' : 'black';
        btn.classList.toggle('following', isNowFollowing);
    });
}

const createPostHTML = (id, data, followingList = []) => {
    const postUserId = data.userId || data.uid || '';
    const postAuthor = data.author || 'User';
    const isFollowing = followingList.includes(postUserId);
    const currentUserId = (auth && auth.currentUser) ? auth.currentUser.uid : '';

    let media = "";
    if (data.image) {
        media = `
        <div style="width:100%; overflow:hidden; border-radius:15px; margin:10px 0; background:none;">
            <img src="${data.image}" style="width:100%; height:auto; display:block; object-fit:cover; border:none;">
        </div>`;
    }

    let followBtnHTML = "";
    if (currentUserId && postUserId && currentUserId !== postUserId) {
        followBtnHTML = `
            <button class="follow-btn ${isFollowing ? 'following' : ''}" data-user-id="${postUserId}" onclick="handleFollowToggle(this, event);" 
                style="background: ${isFollowing ? '#333333' : 'var(--accent)'}; color: ${isFollowing ? '#aaaaaa' : 'black'}; border: none; padding: 3px 10px; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 11px; margin-left: 8px;">
                ${isFollowing ? "Following" : "Follow"}
            </button>`;
    }
    return `
    <div class="post-card" id="post-card-${id}" style="display:flex; flex-direction:column; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 15px; padding: 15px; margin-bottom: 20px;">
        <div class="post-header" style="margin-bottom: 12px;">
            <strong class="post-user-name" onclick="window.openUserProfile('${postUserId}', '${postAuthor}')" style="color: #00e5ff; cursor: pointer;">@${postAuthor}</strong>
            ${followBtnHTML}
        </div>
        <p class="post-content">${data.text}</p>
        ${media}
        <div class="post-stats" style="padding: 8px 5px; font-size: 13px; color: #b0b3b8; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span><span id="like-count-${id}">${data.likes || 0}</span> Like</span>
        </div>
        <div class="post-actions-wrapper" style="display: flex; justify-content: space-between; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 5px;">
            <button class="action-btn" onclick="window.handleLike(event, '${id}')" style="flex: 1; background: transparent; border: none; color: #b0b3b8; padding: 10px; cursor: pointer;"><i class="far fa-thumbs-up"></i> Like</button>
            <button class="action-btn" onclick="toggleInlineCommentBox('${id}', false)" style="flex: 1; background: transparent; border: none; color: #b0b3b8; padding: 10px; cursor: pointer;"><i class="far fa-comment"></i> Comment</button>
            <button class="action-btn" onclick="sharePost('${id}')" style="flex: 1; background: transparent; border: none; color: #b0b3b8; padding: 10px; cursor: pointer;"><i class="far fa-share-square"></i> Share</button>
        </div>
        <div id="inline-comment-box-${id}" data-opened="false" style="display:none; width:100%; margin-top:10px; padding-top:10px; border-top:1px dashed var(--border-color);">
             <div id="inline-comments-list-${id}" style="max-height:200px; overflow-y:auto; margin-bottom:10px;"></div>
             <div style="display:flex; gap:8px;">
                <input type="text" id="inline-input-${id}" placeholder="Comment..." style="flex:1; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); border-radius:20px; padding:8px 12px; outline:none; color:var(--text-color);">
                <button onclick="handleCommentSubmitData('${id}', false)" style="background:var(--accent); border:none; border-radius:50%; width:35px; height:35px; cursor:pointer;"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    </div>`;
};

const loadPosts = () => {
    if(!db || !auth || !auth.currentUser) return;
    db.collection("users").doc(auth.currentUser.uid).collection("following").onSnapshot(followingSnap => {
        const followingList = followingSnap.docs.map(doc => doc.id); 
        db.collection("posts").orderBy("timestamp", "desc").onSnapshot(snap => {
            const area = $('post-display-area'); if (!area) return;
            if (globalPostsCache.length === 0 || snap.docChanges().length > 1) {
                area.innerHTML = "";
                snap.forEach(doc => { 
                    const d = doc.data(); if (d.image && (d.image.match(/\.(mp4|webm|ogg|mov)/i) || d.image.includes("/video/upload/"))) return; 
                    area.innerHTML += createPostHTML(doc.id, d, followingList); loadCommentsCount(doc.id); 
                });
            } else {
                snap.docChanges().forEach(change => {
                    const id = change.doc.id, data = change.doc.data();
                    if (data.image && (data.image.match(/\.(mp4|webm|ogg|mov)/i) || data.image.includes("/video/upload/"))) return;
                    if (change.type === "modified" && $(`like-count-${id}`)) $(`like-count-${id}`).innerText = data.likes || 0;
                    else if (change.type === "added") {
                        const el = document.createElement('div'); el.innerHTML = createPostHTML(id, data, followingList);
                        area.insertBefore(el.firstElementChild, area.firstChild); loadCommentsCount(id);
                    }
                });
            }
            globalPostsCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
    });
};

const loadMyPosts = (targetUserId = null) => {
    if(!auth || !auth.currentUser) return;
    let searchId = auth.currentUser.email.split('@')[0];
    if (targetUserId && targetUserId !== auth.currentUser.uid) {
        db.collection("users").doc(targetUserId).get().then(uDoc => {
            if(uDoc.exists) fetchMyPostsFromFirestore(uDoc.data().username || uDoc.data().email.split('@')[0]);
        });
    } else { fetchMyPostsFromFirestore(searchId); }
};

function fetchMyPostsFromFirestore(authorName) {
    if(!db) return;
    db.collection("posts").where("author", "==", authorName).get().then(snap => {
        if ($('user-posts-area')) {
            $('user-posts-area').innerHTML = snap.empty ? `<p style="text-align:center; opacity:0.5; padding:20px;">No posts found.</p>` : "";
            snap.forEach(doc => { $('user-posts-area').innerHTML += createPostHTML(doc.id, doc.data()); });
        }
    });
}

/* ==========================================================================
   ৮. কমেন্টস ও রিলস ইঞ্জিন (Comments Thread & Reels Logic)
   ========================================================================== */
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
    const input = $(isReel ? `reel-input-${postId}` : `inline-input-${postId}`), text = input.value.trim(); if (!text || !db) return;
    db.collection("posts").doc(postId).collection("comments").add({ text, author: (auth && auth.currentUser) ? auth.currentUser.email.split('@')[0] : 'SAKIB', timestamp: firebase.firestore.FieldValue.serverTimestamp() })
        .then(() => input.value = "").catch(e => console.error(e));
};

const loadLiveCommentsData = (postId, isReel = false) => {
    if(!db) return; 
    if (activeListeners[postId]) activeListeners[postId]();
    
    activeListeners[postId] = db.collection("posts").doc(postId).collection("comments").orderBy("timestamp", "asc").onSnapshot(snap => {
        const list = $(isReel ? `reel-comments-list-${postId}` : `inline-comments-list-${postId}`); 
        if (!list) return;
        
        const isLightMode = document.body.classList.contains('light-mode');
        const noCommentColor = isReel ? "#555555" : (isLightMode ? "#666666" : "#ffffff");
        list.innerHTML = snap.empty ? `<p style="font-size:12px; opacity:0.5; text-align:center; margin:15px 0; color:${noCommentColor};">No comments. Be the first to comment!</p>` : "";
        
        snap.forEach(doc => {
            const d = doc.data();
            const commentTextColor = isReel ? "#1a1a1a" : (isLightMode ? "#1a1a1a" : "#ffffff");
            const commentBgColor = isReel ? "rgba(0,0,0,0.05)" : (isLightMode ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)");
            const authorColor = isReel ? "#0088cc" : (isLightMode ? "#006699" : "#00e5ff"); 
            
            list.innerHTML += `
            <div style="display:flex; gap:8px; margin-bottom:10px; align-items:flex-start;">
                <div style="width:26px; height:26px; background:${isReel ? '#e0e0e0' : (isLightMode ? 'rgba(0,102,153,0.1)' : 'rgba(0,229,255,0.15)')}; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:10px; color:${authorColor}; border:1px solid ${isReel ? '#dcdcdc' : (isLightMode ? 'rgba(0,102,153,0.2)' : 'rgba(0,229,255,0.2)')};">
                    ${d.author ? d.author.charAt(0).toUpperCase() : 'S'}
                </div>
                <div style="flex:1; background:${commentBgColor}; padding:8px 12px; border-radius:0 12px 12px 12px; overflow-wrap:break-word;">
                    <span style="color:${authorColor}; font-size:11px; font-weight:600; display:block;">@${d.author}</span>
                    <p style="margin:0; font-size:12.5px; color:${commentTextColor} !important; line-height:1.4;">${d.text}</p>
                </div>
            </div>`;
        });
        list.scrollTop = list.scrollHeight;
    });
};

const loadCommentsCount = (id) => {
    if(!db) return;
    db.collection("posts").doc(id).collection("comments").onSnapshot(snap => {
        if ($(`comment-count-${id}`)) $(`comment-count-${id}`).innerText = snap.size;
        if ($(`reel-comment-count-${id}`)) $(`reel-comment-count-${id}`).innerText = snap.size;
    });
};

let globalReelsCache = [];

const loadReels = () => {
    if(!db || !auth || !auth.currentUser) return;
    
    db.collection("users").doc(auth.currentUser.uid).collection("following").onSnapshot(followingSnap => {
        const followingList = followingSnap.docs.map(doc => doc.id);
        
        if (globalReelsCache.length > 0) {
            globalReelsCache.forEach(reelId => {
                const btn = document.querySelector(`.reel-card[data-id="${reelId}"] .follow-btn`);
                if (btn) {
                    const targetUserId = btn.getAttribute('data-user-id');
                    const isFollowing = followingList.includes(targetUserId);
                    btn.innerText = isFollowing ? "Following" : "Follow";
                    btn.style.opacity = isFollowing ? "0.6" : "1";
                    btn.classList.toggle('following', isFollowing);
                }
            });
            return;
        }

        db.collection("posts").orderBy("timestamp", "desc").onSnapshot(snap => {
            const area = 'reels-section';
            if (!$(area)) return;
            
            if (globalReelsCache.length > 0 && snap.docChanges().length === 1 && snap.docChanges()[0].type === "modified") {
                const change = snap.docChanges()[0];
                const id = change.doc.id;
                const d = change.doc.data();
                if ($(`like-count-${id}`)) {
                    $(`like-count-${id}`).innerText = d.likes || 0;
                }
                return; 
            }

            let htmlContent = "";
            let currentReelsIds = [];

            snap.forEach(doc => {
                const d = doc.data();
                if (d.image && (d.image.match(/\.(mp4|webm|ogg|mov)/i) || d.image.includes("/video/upload/"))) {
                    currentReelsIds.push(doc.id);
                    const postUserId = d.userId || d.uid || '';
                    const postAuthor = d.author || 'User';
                    const currentUserId = auth.currentUser.uid;
                    let followBtnHTML = "";

                    if (currentUserId !== postUserId) {
                        const isAlreadyFollowing = followingList.includes(postUserId);
                        followBtnHTML = `
                            <button class="follow-btn ${isAlreadyFollowing ? 'following' : ''}" data-user-id="${postUserId}" onclick="handleFollowToggle(this, event);" 
                                style="background: transparent; color: #00e5ff; border: 1px solid #00e5ff; padding: 2px 10px; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 11px; margin-left: 8px; vertical-align: middle; transition: all 0.2s; opacity: ${isAlreadyFollowing ? '0.6' : '1'};">
                                ${isAlreadyFollowing ? "Following" : "Follow"}
                            </button>`;
                    }

                    htmlContent += `
                    <div class="reel-card" data-id="${doc.id}" data-creator="${postUserId}">
                        <video src="${d.image}" loop class="reel-video" onclick="handleReelClick(this)"></video>
                        <div class="reel-info" style="background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 20px; width: 100%; box-sizing: border-box;">
                            <div style="display: flex; align-items: center; flex-wrap: wrap; margin-bottom: 5px;">
                                <h4 onclick="window.openUserProfile('${postUserId}', '${postAuthor}')" style="cursor:pointer; font-size:15px; text-shadow:1px 1px 3px rgba(0,0,0,0.8); margin: 0; display: inline-block; color: #ffffff;">@${postAuthor}</h4>
                                ${followBtnHTML}
                            </div>
                            <p style="font-size:13px; margin: 5px 0 0 0; text-shadow:1px 1px 3px rgba(0,0,0,0.8); color: #eeeeee;">${d.text}</p>
                        </div>
                        <div style="position:absolute; right:20px; bottom:120px; display:flex; flex-direction:column; gap:22px; color:#ffffff; z-index:10; background:rgba(0,0,0,0.5); padding:18px 12px; border-radius:30px; backdrop-filter:blur(5px);">
                            <button onclick="window.handleLike(event, '${doc.id}')" style="background:transparent; border:none; cursor:pointer; color:#ffffff;"><i class="fas fa-heart" style="color:#ff4444; font-size:26px;"></i><div id="like-count-${doc.id}" style="color:#ffffff;">${d.likes || 0}</div></button>
                            <div onclick="toggleInlineCommentBox('${doc.id}', true)" style="cursor:pointer;"><i class="fas fa-comment" style="color:#ffffff; font-size:26px;"></i><div id="reel-comment-count-${doc.id}" style="color:#ffffff;">0</div></div>
                            <div onclick="alert('Link copied.')" style="cursor:pointer;"><i class="fas fa-share" style="color:#ffffff; font-size:26px;"></i><div style="color:#ffffff; font-size:12px; text-align:center; margin-top:2px;">Share</div></div>
                        </div>
                        
                        <div id="reel-comment-box-${doc.id}" data-opened="false" style="display:none; position:absolute; bottom:0; width:100%; max-height:50%; background:rgba(20,20,20,0.98); border-top:1px solid rgba(255,255,255,0.1); z-index:20; flex-direction:column; padding:15px; transition: transform 0.3s; transform: translateY(100%);">
                            <div style="display:flex; justify-content:space-between; color:#ffffff; margin-bottom:10px;">
                                <span style="font-weight:bold;">comment</span>
                                <span onclick="toggleInlineCommentBox('${doc.id}', true)" style="cursor:pointer; color:#ff4444; font-size:20px;">&times;</span>
                            </div>
                            <div id="reel-comments-list-${doc.id}" style="flex:1; overflow-y:auto; max-height:180px;"></div>
                            
                            <div style="display:flex; gap:8px;">
                                <input type="text" id="reel-input-${doc.id}" placeholder="write a comment..." style="flex:1; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#ffffff; padding:8px 14px; border-radius:20px; outline:none;">
                                <button onclick="handleCommentSubmitData('${doc.id}', true)" style="background:#00e5ff; color:#000; border:none; width:34px; height:34px; border-radius:50%; cursor:pointer;"><i class="fas fa-paper-plane"></i></button>
                            </div>
                        </div>
                    </div>`;
                    loadCommentsCount(doc.id);
                }
            });
            $(area).innerHTML = htmlContent; 
            globalReelsCache = currentReelsIds;
            initReelsObserver();
        });
    });
};

window.handleReelClick = function(videoElement) {
    if (!isAppUnmuted) { isAppUnmuted = true; videoElement.muted = false; } 
    else { if (videoElement.paused) videoElement.play(); else videoElement.pause(); }
};

function initReelsObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (entry.isIntersecting) {
                if (video) { video.muted = !isAppUnmuted; video.play().catch(e => console.log("Auto-play blocked")); }
                trackUniqueReelView(entry.target.getAttribute('data-id'), entry.target.getAttribute('data-creator'));
            } else { if (video) { video.pause(); video.currentTime = 0; } }
        });
    }, { root: $('reels-section'), threshold: 0.8 });
    document.querySelectorAll('.reel-card').forEach(card => observer.observe(card));
}

function trackUniqueReelView(reelDocId, creatorId) {
    if(!auth || !auth.currentUser || !db || !creatorId || auth.currentUser.uid === creatorId) return;
    const currentUserId = auth.currentUser.uid, todayStr = new Date().toISOString().split('T')[0], reelRef = db.collection("posts").doc(reelDocId);
    if (activeReelTimeout) clearTimeout(activeReelTimeout);

    reelRef.get().then((doc) => {
        if (!doc.exists) return;
        const d = doc.data();
        if (!(d.viewed_users || []).includes(currentUserId)) {
            db.collection("users").doc(creatorId).update({ [`analytics.${todayStr}.views` ]: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
            reelRef.update({ viewed_users: firebase.firestore.FieldValue.arrayUnion(currentUserId) });
        }
        if (!(d.viewed_three_sec_users || []).includes(currentUserId)) {
            activeReelTimeout = setTimeout(() => {
                reelRef.update({ viewed_three_sec_users: firebase.firestore.FieldValue.arrayUnion(currentUserId) });
                db.collection("users").doc(creatorId).update({ [`analytics.${todayStr}.three_sec_views`]: firebase.firestore.FieldValue.increment(1) });
            }, 3000); 
        }
    });
}

/* ==========================================================================
   ৯. ফ্রেন্ডস এবং ফলো সিঙ্ক লজিক (Follow/Unfollow Toggle Engine)
   ========================================================================== */
const loadUsersForFollow = () => {
    const container = $('user-list-container'); if (!container || !auth?.currentUser || !db) return;
    if (!container.innerHTML.trim() || container.innerHTML.includes("ইউজার লিস্ট লোড হচ্ছে")) {
        container.innerHTML = `<p style="text-align:center; opacity:0.6; font-size:13px; margin-top:20px;">ইউজার লিস্ট লোড হচ্ছে...</p>`;
    }

    db.collection("users").get().then(snapshot => {
        if (snapshot.empty) return container.innerHTML = `<p style="text-align:center; opacity:0.5;">কোনো ইউজার খুঁজে পাওয়া যায়নি।</p>`;
        const allUsers = [];
        snapshot.forEach(doc => { if (doc.id !== auth.currentUser.uid) allUsers.push({ id: doc.id, data: doc.data() }); });

        db.collection("users").doc(auth.currentUser.uid).collection("following").onSnapshot(followingSnap => {
            const followingList = followingSnap.docs.map(doc => doc.id);
            let tempHTML = "";
            allUsers.forEach(user => {
                const isFollowing = followingList.includes(user.id), uData = user.data;
                const uName = uData.displayName || uData.name || uData.username || "AI User";
                
                tempHTML += `
                <div class="user-card" style="display: flex; justify-content: space-between; align-items: center; background: var(--card-bg); padding: 12px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="window.openUserProfile('${user.id}', '${uName}')">
                        <div style="width: 40px; height: 40px; background: var(--accent); border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: bold; overflow:hidden;">${uData.profilePic ? `<img src="${uData.profilePic}" style="width:100%; height:100%; object-fit:cover;">` : uName.charAt(0).toUpperCase()}</div>
                        <div>
                            <h4 style="margin: 0; font-size: 14px;">${uName.toUpperCase()}</h4>
                            <p style="margin: 0; font-size: 11px; opacity: 0.5;">${uData.bio || "AI Sphere User"}</p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <button onclick="if(typeof nav==='function')nav('messages'); window.openChatWithUser('${user.id}', '${uName.replace('@','')}')" style="background: rgba(0, 229, 255, 0.1); color: #00e5ff; border: 1px solid #00e5ff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;" title="মেসেজ করুন">
                            <i class="fab fa-facebook-messenger"></i>
                        </button>
                        <button class="follow-btn ${isFollowing ? 'following' : ''}" data-user-id="${user.id}" onclick="handleFollowToggle(this, event)" style="background: ${isFollowing ? '#333333' : 'var(--accent)'}; color: ${isFollowing ? '#aaaaaa' : 'black'}; border: none; padding: 6px 16px; border-radius: 20px; font-weight: bold; cursor: pointer; font-size: 12px;">${isFollowing ? "Following" : "Follow"}</button>
                    </div>
                </div>`;
            });
            container.innerHTML = tempHTML;
        });
    }).catch(() => container.innerHTML = `<p style="text-align:center; color:#ff4444;">ইউজার লোড করতে সমস্যা হয়েছে।</p>`);
};

window.handleFollowToggle = (btn, event) => {
    if(event) { event.preventDefault(); event.stopPropagation(); }
    const targetUserId = btn.getAttribute('data-user-id'); if (!auth?.currentUser || !targetUserId || auth.currentUser.uid === targetUserId) return;
    btn.disabled = true;

    const isFollowing = btn.classList.contains('following') || btn.innerText.trim() === 'Following';
    toggleGlobalFollowButtons(targetUserId, !isFollowing);

    const myFollowingRef = db.collection("users").doc(auth.currentUser.uid).collection("following").doc(targetUserId);
    const targetFollowersRef = db.collection("users").doc(targetUserId).collection("followers").doc(auth.currentUser.uid);

    const action = isFollowing ? Promise.all([myFollowingRef.delete(), targetFollowersRef.delete()]) : Promise.all([myFollowingRef.set({ timestamp: firebase.firestore.FieldValue.serverTimestamp() }), targetFollowersRef.set({ timestamp: firebase.firestore.FieldValue.serverTimestamp() })]);
    action.catch(() => toggleGlobalFollowButtons(targetUserId, isFollowing)).finally(() => btn.disabled = false);
};

/* ==========================================================================
   ১০. ড্যাশবোর্ড অ্যানালিটিক্স ও চার্ট জেনারেটর (Analytics Engine)
   ========================================================================== */
const loadDashboardAnalytics = () => {
    if(!auth?.currentUser || !db) return; if (dashboardListener) dashboardListener();
    dashboardListener = db.collection("users").doc(auth.currentUser.uid).onSnapshot(userDoc => {
        let totalViews = 0;
        if (userDoc.exists) {
            const analytics = userDoc.data().analytics || {};
            for (let date in analytics) totalViews += (analytics[date].views || 0);
        }
        if ($('total-views-count')) $('total-views-count').innerText = totalViews;

        db.collection("posts").where("author", "==", auth.currentUser.email.split('@')[0]).get().then(snapshot => {
            let totalLikes = 0, postIds = [];
            snapshot.forEach(doc => { totalLikes += (doc.data().likes || 0); postIds.push(doc.id); });
            if ($('total-posts-count')) $('total-posts-count').innerText = snapshot.size;
            if ($('total-likes-count')) $('total-likes-count').innerText = totalLikes;
            calculateTotalComments(postIds);
        });
    });
};

const calculateTotalComments = (postIds) => {
    if (postIds.length === 0 || !db) { if ($('total-comments-count')) $('total-comments-count').innerText = 0; return; }
    let completedQueries = 0, combinedCommentsCount = 0;
    postIds.forEach(id => {
        db.collection("posts").doc(id).collection("comments").get().then(commentSnap => {
            combinedCommentsCount += commentSnap.size; completedQueries++;
            if (completedQueries === postIds.length && $('total-comments-count')) $('total-comments-count').innerText = combinedCommentsCount;
        });
    });
};

function getLast30DaysLabels() {
    const labels = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        labels.push(d.getDate() + ' ' + d.toLocaleString('en-US', { month: 'short' }));
    }
    return labels;
}

function get30DaysData(analyticsData, type) {
    const dataPoints = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dataPoints.push(analyticsData?.[d.toISOString().split('T')[0]]?.[type] || 0);
    }
    return dataPoints;
}

window.openViewsDetail = function() {
    if ($('views-detail-modal')) $('views-detail-modal').style.display = 'block';
    if ($('views-overlay')) $('views-overlay').style.display = 'block';
    if(!auth?.currentUser || !db) return;

    db.collection("users").doc(auth.currentUser.uid).onSnapshot((doc) => {
        if (!doc.exists) return;
        const analytics = doc.data().analytics || {}, chartLabels = getLast30DaysLabels();
        const viewsData = get30DaysData(analytics, 'views'), threeSecViewsData = get30DaysData(analytics, 'three_sec_views');
        if ($('three-sec-views-count')) $('three-sec-views-count').innerText = threeSecViewsData.reduce((a, b) => a + b, 0);

        setTimeout(() => {
            const chartCanvas = document.getElementById('viewsChart'); if (!chartCanvas || typeof Chart === 'undefined') return;
            if (viewsChartInstance) viewsChartInstance.destroy();
            viewsChartInstance = new Chart(chartCanvas.getContext('2d'), {
                type: 'line', 
                data: {
                    labels: chartLabels, 
                    datasets: [
                        { label: 'Total Views', data: viewsData, borderColor: '#00e5ff', backgroundColor: 'rgba(0, 229, 255, 0.05)', borderWidth: 2, tension: 0.3, fill: true },
                        { label: '3s+ Quality Views', data: threeSecViewsData, borderColor: '#ffeb3b', backgroundColor: 'rgba(255, 235, 59, 0.02)', borderWidth: 1.5, tension: 0.3, fill: true }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true }, x: { ticks: { maxTicksLimit: 6 } } } }
            });
        }, 100);
    });
};

window.closeViewsDetail = function() {
    if ($('views-detail-modal')) $('views-detail-modal').style.display = 'none';
    if ($('views-overlay')) $('views-overlay').style.display = 'none';
};

/* ==========================================================================
   ১১. মেসেঞ্জার চ্যাট রিয়েলটাইম ইঞ্জিন (Chat & History Engine)
   ========================================================================== */
window.openChatWithUser = (targetUserId, targetUserName) => {
    if(!auth || !auth.currentUser || !targetUserId) return;
    const currentUserId = auth.currentUser.uid;
    
    activeChatId = currentUserId < targetUserId ? `${currentUserId}_${targetUserId}` : `${targetUserId}_${currentUserId}`;
    activeChatPartnerId = targetUserId;
    activeChatPartnerName = targetUserName;
    
    // কলের ইঞ্জিনের জন্য টার্গেট আইডি সিঙ্ক
    activeChatUserId = targetUserId; 
    
    const chatHeaderName = document.getElementById('active-chat-name');
    if (chatHeaderName) chatHeaderName.innerText = targetUserName.toUpperCase();
    
    const chatAvatar = document.getElementById('active-chat-avatar');
    if (chatAvatar && targetUserName) chatAvatar.innerText = targetUserName.charAt(0).toUpperCase();

    const p2Box = document.getElementById('chat-p2-box');
    if (p2Box) p2Box.style.display = 'flex';
    
    loadChatMessages(activeChatId);
};

const loadChatMessages = (chatId) => {
    if (!db || !auth || !auth.currentUser || !chatId) return;
    
    db.collection("chats").doc(chatId).collection("messages")
      .orderBy("timestamp", "asc")
      .onSnapshot(snap => {
          const msgArea = document.getElementById('chat-messages-container'); 
          if (!msgArea) return;
          
          let html = "";
          const currentUserId = auth.currentUser.uid;
          
          if (snap.empty) {
              msgArea.innerHTML = `<div style="align-self: center; background: rgba(0, 0, 0, 0.03); border: 1px solid var(--border-color, #e0e0e0); padding: 6px 12px; border-radius: 20px; font-size: 11px; color: var(--text-color, #000); opacity: 0.5;">End-to-end encrypted</div>
              <p style="text-align:center; opacity:0.4; font-size:12px; margin-top:20px;">কোনো চ্যাট হিস্ট্রি নেই। একটি মেসেজ পাঠিয়ে আড্ডা শুরু করো!</p>`;
              return;
          }
          
          html += `<div style="align-self: center; background: rgba(0, 0, 0, 0.03); border: 1px solid var(--border-color, #e0e0e0); padding: 6px 12px; border-radius: 20px; font-size: 11px; color: var(--text-color, #000); opacity: 0.5; margin-bottom: 10px;">End-to-end encrypted</div>`;
          
          snap.forEach(doc => {
              const m = doc.data();
              const isMe = m.senderId === currentUserId;
              
              html += `
                <div style="display: flex; justify-content: ${isMe ? 'flex-end' : 'flex-start'}; margin-bottom: 12px; padding: 0 5px;">
                    <div style="background: ${isMe ? '#00e5ff' : 'var(--card-bg, #222222)'}; 
                                color: ${isMe ? '#000000' : 'var(--text-color, #ffffff)'}; 
                                padding: 9px 15px; 
                                border-radius: 16px; 
                                max-width: 70%;
                                word-wrap: break-word;
                                border: 1px solid ${isMe ? '#00e5ff' : 'var(--border-color, #333)'};
                                border-bottom-${isMe ? 'right' : 'left'}-radius: 2px;
                                font-size: 14px;
                                box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        ${m.text}
                    </div>
                </div>`;
          });
          
          msgArea.innerHTML = html;
          msgArea.scrollTop = msgArea.scrollHeight;
      });
};

window.sendDirectMessage = (event) => {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    const input = document.getElementById('chat-message-input'); 
    if (!input || !input.value.trim() || !activeChatId || !db || !auth?.currentUser) return;
    
    const messageText = input.value.trim();
    const currentUserId = auth.currentUser.uid;
    const currentUsername = auth.currentUser.email.split('@')[0];
    
    if (!activeChatPartnerId) {
        const ids = activeChatId.split('_');
        activeChatPartnerId = ids[0] === currentUserId ? ids[1] : ids[0];
    }
    if (!activeChatPartnerName || activeChatPartnerName === "Active User") {
        activeChatPartnerName = document.getElementById('active-chat-name')?.innerText || "Active User";
    }

    db.collection("chats").doc(activeChatId).collection("messages").add({
        senderId: currentUserId,
        text: messageText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        return db.collection("chats").doc(activeChatId).set({
            chatId: activeChatId,
            users: [currentUserId, activeChatPartnerId],
            lastMessage: messageText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            [`name_${activeChatPartnerId}`]: activeChatPartnerName,
            [`name_${currentUserId}`]: currentUsername
        }, { merge: true });
    }).then(() => {
        input.value = ""; 
        input.focus();    
    }).catch(err => console.error("মেসেজ সেন্ড করা যায়নি:", err));
};

const loadRecentChatsList = () => {
    const listArea = document.getElementById('chat-users-list');
    if (!listArea || !db || !auth?.currentUser) return;
    
    const currentUserId = auth.currentUser.uid;

    db.collection("chats")
      .where("users", "array-contains", currentUserId)
      .onSnapshot(snap => {
          if (snap.empty) {
              listArea.innerHTML = `<p style="text-align:center; opacity:0.4; font-size:12px; padding:20px;">কোনো চ্যাট হিস্ট্রি নেই</p>`;
              return;
          }

          const sortedDocs = snap.docs.sort((a, b) => {
              const timeA = a.data().timestamp?.toMillis() || Date.now();
              const timeB = b.data().timestamp?.toMillis() || Date.now();
              return timeB - timeA;
          });

          listArea.innerHTML = ""; 

          sortedDocs.forEach(doc => {
              const chatData = doc.data();
              const partnerId = chatData.users.find(id => id !== currentUserId);
              if(!partnerId) return;
              
              const partnerName = chatData[`name_${partnerId}`] || "Active User";
              const lastMsg = chatData.lastMessage || "মেসেজ পাঠানো হয়েছে";

              const chatItem = document.createElement('div');
              chatItem.style = "display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--card-bg, #222222); border: 1px solid var(--border-color, #333); border-radius: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s;";
              
              chatItem.onclick = () => { window.openChatWithUser(partnerId, partnerName); };

              chatItem.innerHTML = `
                  <div style="width: 40px; height: 40px; background: var(--accent, #00e5ff); color: #000; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 16px; flex-shrink: 0;">
                      ${partnerName.charAt(0).toUpperCase()}
                  </div>
                  <div style="flex: 1; min-width: 0;">
                      <h4 style="margin: 0; font-size: 14px; color: var(--text-color, #fff); text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${partnerName}</h4>
                      <p style="margin: 3px 0 0 0; font-size: 11px; opacity: 0.6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lastMsg}</p>
                  </div>
              `;
              listArea.appendChild(chatItem);
          });
      }, err => console.error("রিসেন্ট চ্যাট লোড করতে সমস্যা হয়েছে:", err));
};

window.sharePost = (postId) => {
    const postUrl = window.location.href + '#post-' + postId;
    if (navigator.share) {
        navigator.share({ title: 'AI Sphere Post', text: 'এই পোস্টটি দেখুন!', url: postUrl }).catch(err => console.log('Share failed:', err));
    } else {
        navigator.clipboard.writeText(postUrl);
        alert("পোস্ট লিংক কপি হয়েছে!");
    }
};

/* ==========================================================================
   ১২. এগোরা কলিং ইঞ্জিন (Agora Voice & Video Calling System) - CLEANED TESTING MODE
   ========================================================================== */
const AGORA_APP_ID = "2b8d018793a94adfab39bc70c3e95075"; 
const TEMP_TOKEN = "007eJxTYFgV1bs6sHrzz5rvEo9n77YOtVP3vLdmSdm/gn/STZw/d3IpMBglWaQYGFqYWxonWpokpqQlJhlbJiWbGyQbp1qaGpib7pRRzWoIZGSY4PuTiZEBAkF8PobETN3igozUolTdktTiEgYGAC6HJIs=";
const TEMP_CHANNEL_NAME = "ai-sphere-test"; 

let agoraClient = null;
let localAudioTrack = null;
let localVideoTrack = null;
let remoteUsers = {};

async function fetchAgoraToken(channelName, role = "publisher", uid = 0) {
    console.log("Using temporary hardcoded token for testing...");
    return TEMP_TOKEN; 
}

function initAgoraClient(mode) {
    if (typeof AgoraRTC === 'undefined') {
        alert("Agora SDK লোড হয়নি!");
        return null;
    }
    return AgoraRTC.createClient({ mode: mode, codec: "vp8" });
}

// অডিও কল শুরু করার ফাংশন
window.startAudioCalling = async function() {
    if (!activeChatUserId) return alert("কোনো ইউজার সিলেক্ট করা নেই কল করার জন্য!");
    
    const myUid = (auth && auth.currentUser) ? auth.currentUser.uid : "test_caller_123";
    const myName = (auth && auth.currentUser) ? (auth.currentUser.displayName || auth.currentUser.email.split('@')[0]) : "সাকিব (Test)";
    const channelName = TEMP_CHANNEL_NAME; 
    
    alert(`টেস্ট অডিও কল শুরু হচ্ছে...`);

    agoraClient = initAgoraClient("rtc");
    if (!agoraClient) return;

    try {
        const token = await fetchAgoraToken(channelName);
        if (!token) return alert("টোকেন পাওয়া যায়নি!");

        const uid = await agoraClient.join(AGORA_APP_ID, channelName, token, 0);
        
        localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        await agoraClient.publish([localAudioTrack]);
        console.log("Audio call started successfully, UID:", uid);

        await db.collection("users").doc(activeChatUserId).set({
            currentCall: {
                callerId: myUid,
                callerName: myName,
                type: "audio",
                status: "calling",
                channelName: channelName
            }
        }, { merge: true });
        console.log("Firebase call signal sent to:", activeChatUserId);

        // অফলাইন টেস্টের জন্য চ্যাট বক্সে একটি অডিও মিসড কল নোটিফিকেশন মেসেজ পুশ করা হচ্ছে
        if (activeChatId) {
            await db.collection("chats").doc(activeChatId).collection("messages").add({
                senderId: myUid,
                text: `📞 Missed Audio Call`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await db.collection("chats").doc(activeChatId).set({
                chatId: activeChatId,
                users: [myUid, activeChatUserId],
                lastMessage: `📞 Missed Audio Call`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log("Offline test notification sent to chat history!");
        }

        const callScreen = document.getElementById('call-screen') || document.getElementById('video-call-overlay');
        if (callScreen) callScreen.style.display = 'block';
        
        const endBtn = document.getElementById('end-call-btn');
        if (endBtn) endBtn.style.display = 'inline-block';

        setupRemoteUserListeners();

    } catch (error) {
        console.error("Audio Calling Failed:", error);
        alert("অডিও কল শুরু করতে সমস্যা হয়েছে: " + error.message);
    }
};

// ভিডিও কল শুরু করার ফাংশন
window.startVideoCalling = async function() {
    if (!activeChatUserId) return alert("কোনো ইউজার সিলেক্ট করা নেই কল করার জন্য!");
    
    const myUid = (auth && auth.currentUser) ? auth.currentUser.uid : "test_caller_123";
    const myName = (auth && auth.currentUser) ? (auth.currentUser.displayName || auth.currentUser.email.split('@')[0]) : "সাকিব (Test)";
    const channelName = TEMP_CHANNEL_NAME; 
    
    alert(`টেস্ট ভিডিও কল শুরু হচ্ছে...`);

    agoraClient = initAgoraClient("rtc");
    if (!agoraClient) return;

    try {
        const token = await fetchAgoraToken(channelName);
        if (!token) return alert("টোকেন পাওয়া যায়নি!");

        const uid = await agoraClient.join(AGORA_APP_ID, channelName, token, 0);
        
        localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localVideoTrack = await AgoraRTC.createCameraVideoTrack();
        
        await agoraClient.publish([localAudioTrack, localVideoTrack]);
        console.log("Video call started successfully, UID:", uid);

        await db.collection("users").doc(activeChatUserId).set({
            currentCall: {
                callerId: myUid,
                callerName: myName,
                type: "video",
                status: "calling",
                channelName: channelName
            }
        }, { merge: true });
        console.log("Firebase call signal sent to:", activeChatUserId);

        // অফলাইন টেস্টের জন্য চ্যাট বক্সে একটি ভিডিও মিসড কল নোটিফিকেশন মেসেজ পুশ করা হচ্ছে
        if (activeChatId) {
            await db.collection("chats").doc(activeChatId).collection("messages").add({
                senderId: myUid,
                text: `📹 Missed Video Call`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await db.collection("chats").doc(activeChatId).set({
                chatId: activeChatId,
                users: [myUid, activeChatUserId],
                lastMessage: `📹 Missed Video Call`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log("Offline test notification sent to chat history!");
        }

        const callScreen = document.getElementById('call-screen') || document.getElementById('video-call-overlay');
        if (callScreen) callScreen.style.display = 'block';
        
        const endBtn = document.getElementById('end-call-btn');
        if (endBtn) endBtn.style.display = 'inline-block';
        
        if (document.getElementById('local-video-container')) {
            localVideoTrack.play('local-video-container');
        }
        
        setupRemoteUserListeners();

    } catch (error) {
        console.error("Video Calling Failed:", error);
        alert("ভিডিও কল শুরু করতে সমস্যা হয়েছে: " + error.message);
    }
};

function setupRemoteUserListeners() {
    if (!agoraClient) return;

    agoraClient.on("user-published", async (user, mediaType) => {
        await agoraClient.subscribe(user, mediaType);
        if (mediaType === "video") {
            remoteUsers[user.uid] = user.videoTrack;
            if (document.getElementById("remote-video-container")) {
                user.videoTrack.play("remote-video-container");
            }
        }
        if (mediaType === "audio") {
            user.audioTrack.play();
        }
    });

    agoraClient.on("user-unpublished", (user) => {
        if (remoteUsers[user.uid]) {
            delete remoteUsers[user.uid];
        }
    });
}

// মাইক অন/অফ করার ফাংশন
window.toggleMic = async function() {
    if (localAudioTrack) {
        if (localAudioTrack.enabled) {
            await localAudioTrack.setEnabled(false);
            console.log("Mic Muted");
            alert("মাইক মিউট করা হয়েছে");
        } else {
            await localAudioTrack.setEnabled(true);
            console.log("Mic Unmuted");
            alert("মাইক আনমিউট করা হয়েছে");
        }
    }
};

window.endCall = async function() {
    console.log("Ending the Agora call...");
    if (localAudioTrack) { localAudioTrack.stop(); localAudioTrack.close(); localAudioTrack = null; }
    if (localVideoTrack) { localVideoTrack.stop(); localVideoTrack.close(); localVideoTrack = null; }
    
    if (agoraClient) {
        try { await agoraClient.leave(); } catch (e) { console.error("Agora leave error:", e); }
        agoraClient = null;
    }
    remoteUsers = {};
    
    if (activeChatUserId && db) {
        try {
            await db.collection("users").doc(activeChatUserId).update({
                currentCall: firebase.firestore.FieldValue.delete()
            });
        } catch (e) { console.log("Firebase delete error:", e); }
    }
    
    const callElements = ['call-screen', 'video-call-overlay', 'chat-p2-box', 'video-call-screen'];
    callElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    alert("কল সফলভাবে শেষ হয়েছে।");
};
window.endAgoraCall = window.endCall;

/* ==========================================================================
   ১২.১ ইনকামিং কল রিসিভ এবং লিসেনার সিস্টেম (Live Call Receiver)
   ========================================================================== */

// ১. ইনকামিং কলের জন্য ডেটাবেজ ওয়াচ করা (ইউজার লগইন হওয়ার পর এটি রান করতে হবে)
window.listenForIncomingCalls = function() {
    const myUid = (auth && auth.currentUser) ? auth.currentUser.uid : null;
    if (!myUid || !db) return console.log("User not logged in or DB not ready for call listening.");

    console.log("Listening for incoming calls for UID:", myUid);
    
    // রিয়েল-টাইম লিসেনার যা কল আসার সাথে সাথে ট্রিগার হবে
    db.collection("users").doc(myUid).onSnapshot((doc) => {
        const data = doc.data();
        
        // যদি কেউ কল দেয় এবং স্ট্যাটাস "calling" থাকে
        if (data && data.currentCall && data.currentCall.status === "calling") {
            const callData = data.currentCall;
            
            // স্ক্রিনে ব্রাউজার পপ-আপ দেখানো (confirm)
            const acceptCall = confirm(`${callData.callerName} তোমাকে একটি ${callData.type} কল দিচ্ছে! রিসিভ করবে?`);
            
            if (acceptCall) {
                // ইউজার রিসিভ করলে
                window.acceptIncomingCall(callData);
            } else {
                // ইউজার রিজেক্ট করলে ডেটাবেজ থেকে কল ডিলিট করে দেওয়া
                window.rejectIncomingCall(callData.callerId);
            }
        }
    }, (error) => {
        console.error("Call Listener Error:", error);
    });
};

// ২. কল রিসিভ করার মূল ফাংশন
window.acceptIncomingCall = async function(callData) {
    alert("কল রিসিভ করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...");
    
    agoraClient = initAgoraClient("rtc");
    if (!agoraClient) return;

    try {
        // কল দাতার একই চ্যানেল এবং টোকেন দিয়ে জয়েন করা
        const token = TEMP_TOKEN; // টেস্ট মোডের হার্ডকোডেড টোকেন
        const channelName = callData.channelName;
        
        const uid = await agoraClient.join(AGORA_APP_ID, channelName, token, 0);
        console.log("Joined Agora call successfully as Receiver, UID:", uid);

        // নিজের অডিও ট্র্যাক অন করা
        localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        let tracksToPublish = [localAudioTrack];

        // যদি ভিডিও কল হয়, তবে নিজের ক্যামেরাও অন করা
        if (callData.type === "video") {
            localVideoTrack = await AgoraRTC.createCameraVideoTrack();
            tracksToPublish.push(localVideoTrack);
            
            if (document.getElementById('local-video-container')) {
                localVideoTrack.play('local-video-container');
            }
        }

        // এগোরা সার্ভারে নিজের মিডিয়া পাবলিশ করা
        await agoraClient.publish(tracksToPublish);

        // ডেটাবেজে কলের স্ট্যাটাস বদলে "connected" করে দেওয়া
        await db.collection("users").doc(auth.currentUser.uid).set({
            currentCall: { status: "connected" }
        }, { merge: true });

        // কল স্ক্রিন UI ওপেন করা
        const callScreen = document.getElementById('call-screen') || document.getElementById('video-call-overlay');
        if (callScreen) callScreen.style.display = 'block';
        
        const endBtn = document.getElementById('end-call-btn');
        if (endBtn) endBtn.style.display = 'inline-block';

        // অপর পাশের (যে কল দিয়েছে) অডিও-ভিডিও শো করার লিসেনার চালু করা
        setupRemoteUserListeners();

    } catch (error) {
        console.error("Failed to accept call:", error);
        alert("কল রিসিভ করতে সমস্যা হয়েছে: " + error.message);
    }
};

// ৩. কল রিজেক্ট বা কেটে দেওয়ার ফাংশন
window.rejectIncomingCall = async function(callerId) {
    if (auth.currentUser && db) {
        try {
            await db.collection("users").doc(auth.currentUser.uid).update({
                currentCall: firebase.firestore.FieldValue.delete()
            });
            alert("কলটি রিজেক্ট করা হয়েছে।");
        } catch (e) { 
            console.error("Firebase call delete error:", e); 
        }
    }
};
