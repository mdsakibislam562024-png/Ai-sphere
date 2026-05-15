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

// --- Cloudinary Config ---
const cloudName = "ddcdcbepv"; 
const uploadPreset = "aisphere_preset"; 

// --- Cloudinary Upload Function ---
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
            method: "POST",
            body: formData
        });
        const data = await response.json();
        return data.secure_url; 
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        return null;
    }
}

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
const sections = ['hero-section', 'reels-section', 'messages-section', 'profile-page', 'global-feed-section', 'about-page', 'privacy-page', 'settings-page'];

function nav(page, addHistory = true) {
    sections.forEach(s => $(s) && ($(s).style.display = 'none'));
    
    if (page === 'home') {
        $('hero-section').style.display = 'flex';
    } else {
        const target = page === 'profile' ? 'profile-page' : 
                       page === 'global-feed' ? 'global-feed-section' : 
                       page === 'reels' ? 'reels-section' : 
                       page === 'about' ? 'about-page' : 
                       page === 'privacy' ? 'privacy-page' : 
                       page === 'settings' ? 'settings-page' : page + '-section';
        
        if($(target)) {
            $(target).style.display = 'block'; 
            if (page === 'global-feed') loadPosts();
            if (page === 'profile') {
                loadUserProfile(); // ইউজার প্রোফাইল ডাটা লোড
                loadMyPosts();
            }
            if (page === 'reels') loadReels(); 
        }
    }

    if (addHistory) history.pushState({page: page}, "", "#" + page);
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    if($('tab-' + page)) $('tab-' + page).classList.add('active');
    if($('sidebar').classList.contains('active')) toggleSidebar();
}

const openAbout = () => nav('about');
const closeAbout = () => nav('home');
const openPrivacy = () => nav('privacy');
const closePrivacy = () => nav('home');
const openSettings = () => nav('settings');
const closeSettings = () => nav('home');

// --- SETTINGS ---
const changePassword = () => {
    const newPassword = prompt("সাকিব, তোমার নতুন পাসওয়ার্ডটি এখানে দাও:");
    if (newPassword && newPassword.length >= 6) {
        auth.currentUser.updatePassword(newPassword).then(() => alert("সফল!")).catch(e => alert(e.message));
    }
};

let isDarkMode = true;
const toggleDarkMode = () => {
    isDarkMode = !isDarkMode;
    const root = document.documentElement;
    if (isDarkMode) {
        root.style.setProperty('--bg-dark', '#000000');
        root.style.setProperty('--text-color', '#ffffff');
    } else {
        root.style.setProperty('--bg-dark', '#ffffff');
        root.style.setProperty('--text-color', '#000000');
    }
};

const confirmDelete = () => {
    if(confirm("অ্যাকাউন্ট ডিলিট করতে চাও?")) {
        auth.currentUser.delete().then(() => location.reload()).catch(e => alert(e.message));
    }
};

window.onpopstate = (e) => nav(e.state?.page || 'home', false);

// --- PROFILE & COVER UPDATE SYSTEM ---
async function updateProfileMedia(type) {
    const fileInput = type === 'profile' ? $('profile-upload') : $('cover-upload');
    const file = fileInput.files[0];
    const user = auth.currentUser;

    if (!file || !user) return;

    // লোডিং ফিডব্যাক
    console.log(`${type} uploading...`);
    
    const imageUrl = await uploadToCloudinary(file);

    if (imageUrl) {
        const userRef = db.collection("users").doc(user.uid);
        
        userRef.set({
            [type + "Pic"]: imageUrl,
            email: user.email,
            username: user.email.split('@')[0]
        }, { merge: true }).then(() => {
            if (type === 'profile') {
                $('my-profile-img').src = imageUrl;
            } else {
                $('my-cover-img').src = imageUrl;
            }
            alert("Success: " + type.charAt(0).toUpperCase() + type.slice(1) + " updated!");
        }).catch(e => alert("Firestore Error: " + e.message));
    }
}

const loadUserProfile = () => {
    const user = auth.currentUser;
    if (!user) return;

    db.collection("users").doc(user.uid).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            if (data.profilePic) $('my-profile-img').src = data.profilePic;
            if (data.coverPic) $('my-cover-img').src = data.coverPic;
            $('profile-name').innerText = data.username ? data.username.toUpperCase() : user.email.split('@')[0].toUpperCase();
        }
    });
};

// --- POST SYSTEM ---
const handlePostSubmit = async () => {
    const content = $('post-input').value;
    const imageFile = $('post-image-input')?.files[0];
    if (!content.trim() && !imageFile) return;

    let imageUrl = imageFile ? await uploadToCloudinary(imageFile) : null;
    db.collection("posts").add({
        text: content,
        image: imageUrl,
        author: auth.currentUser?.email.split('@')[0] || 'SAKIB',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        likes: 0
    }).then(() => {
        $('post-input').value = "";
        alert("পোস্ট হয়েছে!");
    });
};

const handleLike = (id) => db.collection("posts").doc(id).update({ likes: firebase.firestore.FieldValue.increment(1) });

const toggleCommentBox = (id) => {
    const box = $(`comment-box-${id}`);
    if(box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
};

const loadComments = (id) => {
    db.collection("posts").doc(id).collection("comments").orderBy("timestamp", "asc").onSnapshot(snap => {
        const count = $(`comment-count-${id}`);
        if(count) count.innerText = snap.size;
    });
};

const handleShare = () => { navigator.clipboard.writeText(window.location.href); alert("লিঙ্ক কপি হয়েছে!"); };

const createPostHTML = (id, data) => {
    let media = "";
    if (data.image) {
        const isVideo = data.image.match(/\.(mp4|webm|ogg|mov)/i) || data.image.includes("/video/upload/");
        media = isVideo ? `<video src="${data.image}" controls style="width:100%; border-radius:12px; margin:10px 0;"></video>` 
                        : `<img src="${data.image}" style="width:100%; border-radius:12px; margin:10px 0;">`;
    }
    return `<div class="post-card">
        <strong>@${data.author}</strong><p>${data.text}</p>${media}
        <div style="display:flex; gap:15px; margin-top:10px;">
            <span onclick="handleLike('${id}')">❤️ ${data.likes || 0}</span>
            <span onclick="toggleCommentBox('${id}')"> <span id="comment-count-${id}">0</span></span>
        </div>
    </div>`;
};

const loadPosts = () => {
    db.collection("posts").orderBy("timestamp", "desc").onSnapshot(snap => {
        $('post-display-area').innerHTML = "";
        snap.forEach(doc => {
            $('post-display-area').innerHTML += createPostHTML(doc.id, doc.data());
            loadComments(doc.id);
        });
    });
};

const loadMyPosts = () => {
    const user = auth.currentUser;
    if (!user) return;
    db.collection("posts").where("author", "==", user.email.split('@')[0]).onSnapshot(snap => {
        $('user-posts-area').innerHTML = "";
        snap.forEach(doc => $('user-posts-area').innerHTML += createPostHTML(doc.id, doc.data()));
    });
};

// --- REELS SYSTEM ---
const loadReels = () => {
    db.collection("posts").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        const reelsArea = $('reels-section');
        if(!reelsArea) return;
        reelsArea.innerHTML = ""; 
        snapshot.forEach((doc) => {
            const data = doc.data();
            const isVideo = data.image && (data.image.match(/\.(mp4|webm|ogg|mov)/i) || data.image.includes("/video/upload/"));
            if (isVideo) {
                reelsArea.innerHTML += `
                    <div class="reel-card" style="position: relative; height: 100%; background: #000; scroll-snap-align: start;">
                        <video src="${data.image}" loop muted playsinline 
                            style="width: 100%; height: 100%; object-fit: cover;"
                            onclick="this.paused ? this.play() : this.pause(); this.muted = false;">
                        </video>
                        
                        <div style="position: absolute; bottom: 40px; left: 15px; color: #fff; z-index: 10; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
                            <h4 style="color: var(--accent); margin-bottom: 5px;">@${data.author}</h4>
                            <p style="font-size: 13px; opacity: 0.9;">${data.text}</p>
                        </div>
                        
                        <div style="position: absolute; right: 25px; bottom: 100px; display: flex; flex-direction: column; gap: 25px; color: #fff; z-index: 10; text-align: center;">
                            <div onclick="handleLike('${doc.id}')" style="cursor: pointer;">
                                <i class="fas fa-heart" style="font-size: 26px;"></i>
                                <br><small style="font-weight: bold;">${data.likes || 0}</small>
                            </div>
                            <div onclick="toggleCommentBox('${doc.id}')" style="cursor: pointer;">
                                <i class="fas fa-comment" style="font-size: 26px;"></i>
                                <br><small id="comment-count-${doc.id}" style="font-weight: bold;">0</small>
                            </div>
                            <div onclick="handleShare()" style="cursor: pointer;">
                                <i class="fas fa-share" style="font-size: 26px;"></i>
                            </div>
                        </div>
                    </div>`;
                loadComments(doc.id);
            }
        });
    });
};

const handleLogout = () => auth.signOut().then(() => location.reload());
