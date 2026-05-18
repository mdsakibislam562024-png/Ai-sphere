// --- Firebase & App Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyB1T8RtehtewhrTUWiwTomVv5nwwSzyIdw",
    authDomain: "ai-sphere-2.firebaseapp.com",
    projectId: "ai-sphere-2",
    storageBucket: "ai-sphere-2.firebasestorage.app",
    messagingSenderId: "287882935194",
    appId: "1:287882935194:web:2401447236fb80b26f5823"
};

// Firebase v8/v9 Compatibility Check
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = (typeof firebase !== 'undefined') ? firebase.auth() : null;
const db = (typeof firebase !== 'undefined') ? firebase.firestore() : null;
const cloudName = "ddcdcbepv", uploadPreset = "aisphere_preset"; 

let isLoginMode = true, currentPage = 'home', globalPostsCache = [];
let isAppUnmuted = false; 
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
    
    // Auth State Listener to manage Screens
    if (auth) {
        auth.onAuthStateChanged(user => {
            if (user) {
                if ($('onboarding-wrapper')) $('onboarding-wrapper').style.display = 'none';
                if ($('home-page')) $('home-page').style.display = 'flex';
                if (currentPage === 'friends') loadUsersForFollow();
                nav('home', false);
            } else {
                if ($('onboarding-wrapper')) $('onboarding-wrapper').style.display = 'flex';
                if ($('home-page')) $('home-page').style.display = 'none';
            }
        });
    } else {
        // Fallback for testing when Firebase is failing
        console.warn("Firebase Not Loaded. Showing Main Feed for UI Test.");
        if ($('onboarding-wrapper')) $('onboarding-wrapper').style.display = 'none';
        if ($('home-page')) $('home-page').style.display = 'flex';
    }
});

const toggleDarkMode = () => {
    const isChecked = $('darkModeCheckbox').checked;
    document.body.classList.toggle('light-mode', !isChecked);
    localStorage.setItem('theme', isChecked ? 'dark' : 'light');
};

// --- Navigation & Routing ---
const toggleSidebar = (pushHistory = true) => {
    const active = $('sidebar').classList.toggle('active');
    if ($('overlay')) $('overlay').style.display = active ? 'block' : 'none';

    if (active && pushHistory) {
        history.pushState({ page: 'sidebar' }, "", "#sidebar");
    }
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
            
            if (!$('sidebar').classList.contains('active')) {
                toggleSidebar(false); 
            }
        } else {
            nav('home', false);
        }
    } 
    else if (target === 'home' && $('sidebar').classList.contains('active')) {
        toggleSidebar(false);
    } 
    else {
        nav(target, false);
        if ($('sidebar').classList.contains('active')) {
            toggleSidebar(false);
        }
    }
};

const sections = ['hero-section', 'reels-section', 'messages-section', 'profile-page', 'global-feed-section', 'about-page', 'privacy-page', 'settings-page', 'dashboard-page', 'profile-security-page', 'wallet-page', 'refer-page', 'support-page', 'copyright-page', 'friends-page'];

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
            if (page === 'profile') { 
                loadUserProfile(targetUserId, targetAuthor); 
                loadMyPosts(targetUserId); 
            }
            if (page === 'reels') loadReels();
            if (page === 'friends') loadUsersForFollow(); 
            if (page === 'dashboard') loadDashboardAnalytics(); 
        }
    }
    
    if (addHistory) history.pushState({ page }, "", "#" + page);
    currentPage = page;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    $('tab-' + page)?.classList.add('active');
    
    if (addHistory && $('sidebar').classList.contains('active')) {
        toggleSidebar(false); 
    }
}

const sidebarNav = (page) => { 
    history.pushState({ page: 'sidebar' }, "", "#sidebar"); 
    nav(page, false); 
    if ($('sidebar').classList.contains('active')) {
        toggleSidebar(false); 
    }
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

// --- Authentication Engine ---
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
        .catch(e => status.innerText = e.message);
};

const changePassword = () => {
    if(!auth.currentUser) return;
    const newPass = prompt("সাকিব, তোমার নতুন পাসওয়ার্ডটি এখানে দাও:");
    if (newPass && newPass.length >= 6) auth.currentUser.updatePassword(newPass).then(() => alert("সফল!")).catch(e => alert(e.message));
};

const handleLogout = () => auth ? auth.signOut().then(() => location.reload()) : location.reload();

// --- Profile Customization ---
const loadUserProfile = (targetUserId = null, targetAuthor = null) => {
    if (!auth || !auth.currentUser) return;
    const user = auth.currentUser; 

    const myUid = user.uid;
    const myUsername = user.email.split('@')[0].toLowerCase();
    
    const isOwnProfile = (!targetUserId || targetUserId === myUid || (targetAuthor && targetAuthor.toLowerCase() === myUsername));

    if (window.activeProfileListener) window.activeProfileListener();
    if (window.activeFollowersListener) window.activeFollowersListener();
    if (window.activeFollowingListener) window.activeFollowingListener();

    if (isOwnProfile) {
        const editBtn = document.querySelector("#profile-page button[onclick*='editProfileDetails']");
        if(editBtn) editBtn.style.display = "inline-block";

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

        window.activeFollowersListener = db.collection("users").doc(myUid).collection("followers").onSnapshot(snap => {
            if ($('follower-count')) $('follower-count').innerText = snap.size;
        });

        window.activeFollowingListener = db.collection("users").doc(myUid).collection("following").onSnapshot(snap => {
            if ($('following-count')) $('following-count').innerText = snap.size;
        });

    } else {
        const editBtn = document.querySelector("#profile-page button[onclick*='editProfileDetails']");
        if(editBtn) editBtn.style.display = "none";

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
                    if ($('profile-name') && (data.displayName || data.name)) $('profile-name').innerText = (data.displayName || data.name).toUpperCase();
                }
            });

            window.activeFollowersListener = db.collection("users").doc(targetUserId).collection("followers").onSnapshot(snap => {
                if ($('follower-count')) $('follower-count').innerText = snap.size;
            });

            window.activeFollowingListener = db.collection("users").doc(targetUserId).collection("following").onSnapshot(snap => {
                if ($('following-count')) $('following-count').innerText = snap.size;
            });
        }
    }
};

const editProfileDetails = () => {
    if ($('edit-profile-modal') && $('edit-profile-overlay')) {
        $('edit-profile-modal').style.display = 'block';
        $('edit-profile-overlay').style.display = 'block';
        if ($('profile-name-input')) $('profile-name-input').value = $('profile-name') ? $('profile-name').innerText : "";
        if ($('profile-bio-input')) $('profile-bio-input').value = $('profile-bio') ? $('profile-bio').innerText : "";
    }
};

const saveProfileData = () => {
    if(!auth || !auth.currentUser) return;
    const user = auth.currentUser;
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

// --- ক্রিয়েট পোস্ট মডাল কন্ট্রোলারস ---
const openPostModal = () => {
    if($('post-popup-overlay')) $('post-popup-overlay').style.display = 'block';
    if($('post-popup-modal')) $('post-popup-modal').style.display = 'block';
    if($('modal-post-title')) $('modal-post-title').value = "";
    if($('modal-post-input')) $('modal-post-input').value = "";
    if($('modal-post-tags')) $('modal-post-tags').value = "";
    if($('modal-media-preview')) { $('modal-media-preview').style.display = 'none'; $('modal-media-preview').innerHTML = ""; }
    if($('post-media-trigger')) $('post-media-trigger').value = ""; 
};

const closePostModal = () => {
    if($('post-popup-overlay')) $('post-popup-overlay').style.display = 'none';
    if($('post-popup-modal')) $('post-popup-modal').style.display = 'none';
};

const handleMediaSelection = (input) => {
    const file = input.files[0];
    if (!file) return;

    if($('post-popup-overlay')) $('post-popup-overlay').style.display = 'block';
    if($('post-popup-modal')) $('post-popup-modal').style.display = 'block';

    const previewContainer = $('modal-media-preview');
    if(previewContainer) {
        previewContainer.innerHTML = "";
        previewContainer.style.display = 'block';

        const fileURL = URL.createObjectURL(file);

        if (file.type.startsWith('video/')) {
            previewContainer.innerHTML = `<video src="${fileURL}" controls style="width:100%; max-height:220px; object-fit:cover;"></video>`;
        } else {
            previewContainer.innerHTML = `<img src="${fileURL}" style="width:100%; max-height:220px; object-fit:cover;">`;
        }
    }
};

const handleModalPostSubmit = async () => {
    const title = $('modal-post-title').value.trim();
    const content = $('modal-post-input').value.trim();
    const tags = $('modal-post-tags').value.trim();
    const file = $('post-media-trigger').files[0];
    const submitBtn = $('modal-submit-btn');

    if (!content && !title && !file) return alert("সাকিব, খালি পোস্ট করা যাবে না!");

    if(submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> আপলোড হচ্ছে...`;
    }

    const url = file ? await uploadToCloudinary(file) : null;

    let fullText = "";
    if (title) fullText += `⚡ **${title}**\n\n`;
    fullText += content;
    if (tags) fullText += `\n\n${tags}`;

    const currentUid = (auth && auth.currentUser) ? auth.currentUser.uid : '';

    if(db) {
        db.collection("posts").add({
            text: fullText,
            image: url,
            author: (auth && auth.currentUser) ? auth.currentUser.email.split('@')[0] : 'SAKIB',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            likes: 0,
            userId: currentUid, 
            uid: currentUid 
        })
        .then(() => {
            alert("পোস্টটি সফলভাবে গ্লোবাল ফিডে লাইভ হয়েছে!");
            closePostModal();
        })
        .catch(e => alert("Post Error: " + e.message))
        .finally(() => {
            if(submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="fas fa-paper-plane"></i> পোস্ট করুন`;
            }
        });
    }
};

window.handleLike = (event, postId) => {
    if(event) event.stopPropagation(); 
    if(!db) return;
    const postRef = db.collection("posts").doc(postId);
    
    db.runTransaction((transaction) => {
        return transaction.get(postRef).then((postDoc) => {
            if (!postDoc.exists) return;
            const currentLikes = postDoc.data().likes || 0;
            transaction.update(postRef, { likes: currentLikes + 1 });
        });
    })
    .catch((err) => console.error("Like Error: ", err));
};

const createPostHTML = (id, data) => {
    let media = "";
    if (data.image) {
        const isVid = data.image.match(/\.(mp4|webm|ogg|mov)/i) || data.image.includes("/video/upload/");
        media = isVid ? `<video src="${data.image}" controls class="post-image"></video>` : `<img src="${data.image}" class="post-image">`;
    }
    
    const postUserId = data.userId || data.uid || '';
    const postAuthor = data.author || 'User';

    return `
    <div class="post-card" id="post-card-${id}" style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 15px; padding: 15px; margin-bottom: 20px;">
        <div class="post-header" style="margin-bottom: 12px;">
            <div class="post-info-meta">
                <strong class="post-user-name" onclick="window.openUserProfile('${postUserId}', '${postAuthor}')" style="color: var(--accent); font-size: 15px; cursor: pointer; display: inline-block; user-select: none;">@${postAuthor}</strong>
                <span class="post-time" style="font-size: 12px; opacity: 0.5; margin-left: 10px;"><i class="far fa-clock" style="margin-right:3px;"></i>${formatTimeAgo(data.timestamp)}</span>
            </div>
        </div>
        <p class="post-content" style="font-size: 14.5px; line-height: 1.5; margin-bottom: 12px;">${data.text}</p>
        ${media}
        
        <div class="post-stats" style="display: flex; justify-content: space-between; padding: 8px 5px; font-size: 13px; color: #b0b3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05); margin-top: 10px;">
            <div class="stats-left" style="display: flex; align-items: center; gap: 5px;">
                <span> <span id="like-count-${id}">${data.likes || 0}</span> লাইকস</span>
            </div>
            <div class="stats-right">
                <span><span id="comment-count-${id}">0</span> comments</span>
            </div>
        </div>

        <div class="post-actions-wrapper" style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; margin-top: 5px;">
            <button class="action-btn" onclick="window.handleLike(event, '${id}')" style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 8px; background: transparent; border: none; color: #b0b3b8; padding: 10px 5px; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 8px;">
                <i class="far fa-thumbs-up" style="font-size: 16px;"></i> লাইক
            </button>
            <button class="action-btn" onclick="toggleInlineCommentBox('${id}', false)" style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 8px; background: transparent; border: none; color: #b0b3b8; padding: 10px 5px; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 8px;">
                <i class="far fa-comment" style="font-size: 16px;"></i> কমেন্ট
            </button>
            <button class="action-btn" style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 8px; background: transparent; border: none; color: #b0b3b8; padding: 10px 5px; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 8px;">
                <i class="fas fa-share" style="font-size: 15px;"></i> শেয়ার
            </button>
        </div>

        <div id="inline-comment-box-${id}" data-opened="false" style="display:none; margin-top:15px; padding-top:15px; border-top:1px dashed var(--border-color);">
            <div id="inline-comments-list-${id}" style="max-height:200px; overflow-y:auto; margin-bottom:12px;"></div>
            <div style="display:flex; gap:8px; align-items:center; padding-bottom:12px;">
                <input type="text" id="inline-input-${id}" placeholder="একটি মন্তব্য লিখুন..." style="flex:1; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); color:var(--text-color); padding:8px 14px; border-radius:20px; outline:none; font-size:13px;">
                <button onclick="handleCommentSubmitData('${id}', false)" style="background:var(--accent); color:#000; border:none; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;"><i class="fas fa-paper-plane" style="font-size:12px;"></i></button>
            </div>
        </div>
    </div>`;
};

const loadPosts = () => {
    if(!db) return;
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

const loadMyPosts = (targetUserId = null) => {
    if(!auth || !auth.currentUser) return;
    const user = auth.currentUser;
    
    let searchId = user.email.split('@')[0];
    if (targetUserId && targetUserId !== user.uid) {
        db.collection("users").doc(targetUserId).get().then(uDoc => {
            if(uDoc.exists) {
                searchId = uDoc.data().username || uDoc.data().email.split('@')[0];
                fetchMyPostsFromFirestore(searchId);
            }
        });
    } else {
        fetchMyPostsFromFirestore(searchId);
    }
};

function fetchMyPostsFromFirestore(authorName) {
    if(!db) return;
    db.collection("posts").where("author", "==", authorName).get().then(snap => {
        if ($('user-posts-area')) {
            $('user-posts-area').innerHTML = snap.empty ? `<p style="text-align:center; opacity:0.5; padding:20px;">কোনো পোস্ট পাওয়া যায়নি</p>` : "";
            snap.forEach(doc => $('user-posts-area').innerHTML += createPostHTML(doc.id, doc.data()));
        }
    });
}

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
    if (!text || !db) return;
    db.collection("posts").doc(postId).collection("comments").add({ text, author: (auth && auth.currentUser) ? auth.currentUser.email.split('@')[0] : 'SAKIB', timestamp: firebase.firestore.FieldValue.serverTimestamp() })
        .then(() => input.value = "").catch(e => console.error(e));
};

const loadLiveCommentsData = (postId, isReel = false) => {
    if(!db) return;
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
    if(!db) return;
    db.collection("posts").doc(id).collection("comments").onSnapshot(snap => {
        if ($(`comment-count-${id}`)) $(`comment-count-${id}`).innerText = snap.size;
        if ($(`reel-comment-count-${id}`)) $(`reel-comment-count-${id}`).innerText = snap.size;
    });
};

const loadReels = () => {
    if(!db) return;
    db.collection("posts").orderBy("timestamp", "desc").onSnapshot(snapshot => {
        const area = $('reels-section'); if (!area) return;
        
        if (area.children.length === 0) {
            let htmlContent = ""; 
            
            snapshot.forEach(doc => {
                const d = doc.data();
                if (d.image && (d.image.match(/\.(mp4|webm|ogg|mov)/i) || d.image.includes("/video/upload/"))) {
                    const reelUserId = d.userId || d.uid || '';
                    const reelAuthor = d.author || 'User';
                    
                    htmlContent += `
                    <div class="reel-card" id="reel-card-${doc.id}" data-id="${doc.id}" data-creator="${reelUserId}" style="position:relative; width:100%; height:100%; background:#000; scroll-snap-align:start; display:flex; flex-direction:column; overflow:hidden;">
                        <div style="position:relative; width:100%; flex:1; background:#000;">
                            <video src="${d.image}" loop muted playsinline style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0; z-index:1;" onclick="handleReelClick(this)"></video>
                            <div style="position:absolute; bottom:20px; left:15px; color:#fff; z-index:5; text-shadow:2px 2px 8px rgba(0,0,0,0.8); max-width:70%; pointer-events:none;">
                                <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px;">
                                    <h4 style="color:#00e5ff; margin:0; font-size:16px; font-weight:bold; cursor:pointer; pointer-events:auto;" onclick="window.openUserProfile('${reelUserId}', '${reelAuthor}')">@${reelAuthor}</h4>
                                    <span style="font-size:11px; opacity:0.7; background:rgba(0,0,0,0.4); padding:2px 6px; border-radius:10px;">${formatTimeAgo(d.timestamp)}</span>
                                </div>
                                <p style="font-size:13px; opacity:0.9; margin:0; line-height:1.4;">${d.text}</p>
                            </div>
                            <div style="position:absolute; right:20px; bottom:50px; display:flex; flex-direction:column; gap:22px; color:#fff; z-index:10; text-align:center; background:rgba(0,0,0,0.4); padding:18px 12px; border-radius:30px; backdrop-filter:blur(5px);">
                                <button onclick="window.handleLike(event, '${doc.id}')" style="background:transparent; border:none; outline:none; cursor:pointer; color:#fff;"><i class="fas fa-heart" style="color:#ff4444; font-size:26px;"></i><div id="reel-like-count-${doc.id}" style="font-weight:bold; font-size:12px; margin-top:4px;">${d.likes || 0}</div></button>
                                <div onclick="toggleInlineCommentBox('${doc.id}', true)" style="cursor:pointer;"><i class="fas fa-comment" style="color:#fff; font-size:26px;"></i><div id="reel-comment-count-${doc.id}" style="font-weight:bold; font-size:12px; margin-top:4px;">0</div></div>
                            </div>
                        </div>
                    </div>`;
                    loadCommentsCount(doc.id);
                }
            });
            area.innerHTML = htmlContent;
            initReelsObserver();
        }
    });
};

window.handleReelClick = function(videoElement) {
    if (!isAppUnmuted) {
        isAppUnmuted = true;
        videoElement.muted = false;
    } else {
        if (videoElement.paused) videoElement.play();
        else videoElement.pause();
    }
};

let activeReelTimeout = null; 

function initReelsObserver() {
    const cards = document.querySelectorAll('.reel-card');
    const observerOptions = { root: $('reels-section'), threshold: 0.8 };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            const reelId = entry.target.getAttribute('data-id');
            const creatorId = entry.target.getAttribute('data-creator');
            
            if (entry.isIntersecting) {
                if (video) {
                    video.muted = !isAppUnmuted;
                    video.play().catch(e => console.log("Auto-play blocked"));
                }
                trackUniqueReelView(reelId, creatorId);
            } else {
                if (video) { video.pause(); video.currentTime = 0; }
            }
        });
    }, observerOptions);
    cards.forEach(card => observer.observe(card));
}

function trackUniqueReelView(reelDocId, creatorId) {
    if(!auth || !auth.currentUser || !db) return;
    const currentUserId = auth.currentUser.uid;
    if (!currentUserId || !creatorId || currentUserId === creatorId) return;

    const todayStr = new Date().toISOString().split('T')[0]; 
    const reelRef = db.collection("posts").doc(reelDocId);

    if (activeReelTimeout) clearTimeout(activeReelTimeout);

    reelRef.get().then((doc) => {
        if (!doc.exists) return;
        
        const reelData = doc.data();
        const viewedUsers = reelData.viewed_users || [];
        const viewedThreeSecUsers = reelData.viewed_three_sec_users || [];

        if (!viewedUsers.includes(currentUserId)) {
            db.collection("users").doc(creatorId).update({
                [`analytics.${todayStr}.views`]: firebase.firestore.FieldValue.increment(1)
            }).catch(e => console.log("Generating analytics field..."));

            reelRef.update({
                viewed_users: firebase.firestore.FieldValue.arrayUnion(currentUserId)
            });
        }

        if (!viewedThreeSecUsers.includes(currentUserId)) {
            activeReelTimeout = setTimeout(() => {
                reelRef.get().then((latestDoc) => {
                    if (!latestDoc.exists) return;
                    const updatedThreeSecUsers = latestDoc.data().viewed_three_sec_users || [];
                    
                    if (!updatedThreeSecUsers.includes(currentUserId)) {
                        db.collection("users").doc(creatorId).update({
                            [`analytics.${todayStr}.three_sec_views`]: firebase.firestore.FieldValue.increment(1)
                        });

                        reelRef.update({
                            viewed_three_sec_users: firebase.firestore.FieldValue.arrayUnion(currentUserId)
                        });
                    }
                });
            }, 3000); 
        }
    }).catch(error => console.error("Tracking Engine Error:", error));
}

const loadUsersForFollow = () => {
    const container = $('user-list-container'); if (!container) return;
    if(!auth || !auth.currentUser || !db) return;
    const currentUser = auth.currentUser;

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
                    <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="window.openUserProfile('${userId}', '${userName}')">
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
        });
    }, err => {
        container.innerHTML = `<p style="text-align:center; color:#ff4444; font-size:12px;">ইউজার লোড করতে সমস্যা হয়েছে।</p>`;
    });
};

const handleFollowToggle = (btn) => {
    if(!auth || !auth.currentUser || !db) return;
    const targetUserId = btn.getAttribute('data-user-id'); 
    const currentUser = auth.currentUser; 
    if (!currentUser || !targetUserId) return;

    const isFollowing = btn.classList.contains('following');
    const myFollowingRef = db.collection("users").doc(currentUser.uid).collection("following").doc(targetUserId);
    const targetFollowersRef = db.collection("users").doc(targetUserId).collection("followers").doc(currentUser.uid);

    if (isFollowing) {
        Promise.all([myFollowingRef.delete(), targetFollowersRef.delete()]).catch(e => console.error("Unfollow Error:", e));
    } else {
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        Promise.all([myFollowingRef.set({ timestamp: timestamp }), targetFollowersRef.set({ timestamp: timestamp })]).catch(e => console.error("Follow Error:", e));
    }
};

let dashboardListener = null;
const loadDashboardAnalytics = () => {
    if(!auth || !auth.currentUser || !db) return;
    const user = auth.currentUser;

    if (dashboardListener) dashboardListener();

    dashboardListener = db.collection("users").doc(user.uid).onSnapshot(userDoc => {
        let totalViews = 0;
        if (userDoc.exists) {
            const userData = userDoc.data();
            const analytics = userData.analytics || {};
            for (let date in analytics) { totalViews += (analytics[date].views || 0); }
        }
        if ($('total-views-count')) $('total-views-count').innerText = totalViews;

        db.collection("posts").where("author", "==", user.email.split('@')[0]).get().then(snapshot => {
            let totalPosts = snapshot.size;
            let totalLikes = 0;
            let postIds = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                totalLikes += (data.likes || 0);
                postIds.push(doc.id);
            });
            if ($('total-posts-count')) $('total-posts-count').innerText = totalPosts;
            if ($('total-likes-count')) $('total-likes-count').innerText = totalLikes;
            calculateTotalComments(postIds);
        });
    }, err => console.error("Dashboard Error:", err));
};

const calculateTotalComments = (postIds) => {
    if (postIds.length === 0 || !db) {
        if ($('total-comments-count')) $('total-comments-count').innerText = 0;
        return;
    }
    let completedQueries = 0, combinedCommentsCount = 0;
    postIds.forEach(id => {
        db.collection("posts").doc(id).collection("comments").get().then(commentSnap => {
            combinedCommentsCount += commentSnap.size;
            completedQueries++;
            if (completedQueries === postIds.length && $('total-comments-count')) {
                $('total-comments-count').innerText = combinedCommentsCount;
            }
        }).catch(e => console.error("Comment Count Error:", e));
    });
};

// --- Chart/Analytics Setup ---
let viewsChartInstance = null;
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
        const dateStr = d.toISOString().split('T')[0]; 
        dataPoints.push((analyticsData && analyticsData[dateStr]) ? (analyticsData[dateStr][type] || 0) : 0);
    }
    return dataPoints;
}

window.openViewsDetail = function() {
    if ($('views-detail-modal')) $('views-detail-modal').style.display = 'block';
    if ($('views-overlay')) $('views-overlay').style.display = 'block';
    
    if(!auth || !auth.currentUser || !db) return;
    const currentUserId = auth.currentUser.uid;

    db.collection("users").doc(currentUserId).onSnapshot((doc) => {
        if (!doc.exists) return;
        const userData = doc.data(), analytics = userData.analytics || {};
        const chartLabels = getLast30DaysLabels();
        const viewsData = get30DaysData(analytics, 'views');
        const threeSecViewsData = get30DaysData(analytics, 'three_sec_views');
        
        if ($('three-sec-views-count')) $('three-sec-views-count').innerText = threeSecViewsData.reduce((a, b) => a + b, 0);

        setTimeout(() => {
            const chartCanvas = document.getElementById('viewsChart');
            if (!chartCanvas || typeof Chart === 'undefined') return;
            
            const ctx = chartCanvas.getContext('2d');
            if (viewsChartInstance) viewsChartInstance.destroy();
            
            viewsChartInstance = new Chart(ctx, {
                type: 'line', 
                data: {
                    labels: chartLabels, 
                    datasets: [
                        { label: 'Total Views', data: viewsData, borderColor: '#00e5ff', backgroundColor: 'rgba(0, 229, 255, 0.05)', borderWidth: 2, tension: 0.3, fill: true },
                        { label: '3s+ Quality Views', data: threeSecViewsData, borderColor: '#ffeb3b', backgroundColor: 'rgba(255, 235, 59, 0.02)', borderWidth: 1.5, tension: 0.3, fill: true }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true }, x: { ticks: { maxTicksLimit: 6 } } }
                }
            });
        }, 100);
    });
};

window.closeViewsDetail = function() {
    if ($('views-detail-modal')) $('views-detail-modal').style.display = 'none';
    if ($('views-overlay')) $('views-overlay').style.display = 'none';
};

window.openUserProfile = function(targetUserId, targetAuthor) {
    if (!targetUserId || targetUserId === 'undefined' || targetUserId === 'null') targetUserId = null;
    nav('profile', true, targetUserId, targetAuthor);
};
