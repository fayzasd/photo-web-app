import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,updateProfile, signOut} from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js'
import { getFirestore, collection, addDoc, doc, Timestamp, query, orderBy, where, getDocs, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-storage.js';

//Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAPNFKR03BUU_1cPNdni12a7XsG7NJpTPk",
  authDomain: "netsnap-1bdb9.firebaseapp.com",
  projectId: "netsnap-1bdb9",
  storageBucket: "netsnap-1bdb9.appspot.com",
  messagingSenderId: "586466185819",
  appId: "1:586466185819:web:ec7214c3baa28f6d7fe57e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth();
const db = getFirestore(app);
const storage = getStorage(app);

//DOM-elements
const mainContainer = document.getElementById('main-container')
const loginContainer = document.getElementById('login-container')
const photoForm = document.getElementById("photo-form");
const entriesList = document.getElementById("entries-list");
const logOutBttn = document.getElementById("log-out")

const modal = document.getElementById("sign-up-modal");
const span = document.getElementsByClassName("close")[0];

document.getElementById('sign-up-entry').addEventListener('click', () => {
    modal.style.display = "block";
  });

span.onclick = function() {
  modal.style.display = "none";
}

// Sign up
document.getElementById('sign-up-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    let email = document.getElementById('sign-up-email').value;
    let password = document.getElementById('sign-up-password').value;
    let name = document.getElementById('full-name').value

    try{
        await createUserWithEmailAndPassword(auth, email, password)
        .then(() => {
            updateProfile(auth.currentUser, {
                displayName: name
              })

            setTimeout(() => {
                modal.style.display = "none"
            },100);
        })
    }  
    catch(error) {
        console.error(error);
    };
});

//Event Listeners for buttons
document.getElementById('login-form').addEventListener('submit', (e)=>{
    e.preventDefault();
    let email = document.getElementById('email').value
    let password = document.getElementById('password').value
    signInWithEmailAndPassword(auth,email,password).catch(e=>{
        console.error(e)
    })
})

document.getElementById('log-out').addEventListener('click', () => {
    signOut(auth).catch((e) => {
        console.log(e)
    })
})

//Log in Check
onAuthStateChanged(auth, async (user)=>{
    
    let nameHolder = document.getElementById('display-name');
    if(user){
        mainContainer.style.display = "block";
        loginContainer.style.display = "none";
        logOutBttn.style.display = "block"

        nameHolder.textContent = user.displayName
        
        loadEntries().then(()=>{
            const userName = user.displayName;
            nameHolder.textContent = userName;
        })
    }else{
        mainContainer.style.display = "none";
        loginContainer.style.display = "flex";
    }
})


//Photo modules
photoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const photo = document.getElementById("photo").files[0];
    const loading = document.getElementById('loading-text')

    const img = document.createElement("img");
    img.src = URL.createObjectURL(photo);
    loading.style.display = "block"

    setTimeout(() => {
        loading.style.display = "none"
    },5000);

    img.onload = async () => {
        // Create a canvas element
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Set the canvas width and height
        const MAX_WIDTH = 500;
        const scaleFactor = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleFactor;

        // Draw the image on the canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert the canvas to a Blob (File-like object)
        canvas.toBlob(async (blob) => {
            // Upload to Firebase Storage
            const storageRef = ref(storage, `images/${photo.name}`);
            await uploadBytes(storageRef, blob);
            const url = await getDownloadURL(storageRef);
            
            // Save to Firestore
            await addDoc(collection(db, "entries"), {
                name,
                url,
                timestamp: new Date(),
                userId: auth.currentUser.uid
            });

            // Reload Entries
            loadEntries();
        }, 'image/jpeg', 0.8); // The last argument here is the quality of the image (0 to 1)
    };
});

// Load entries
async function loadEntries() {

    entriesList.innerHTML = "";

    const user = auth.currentUser;
    if (!user) return;

    const q = query(
        collection(db, "entries"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc")
    );

    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
        const entry = doc.data();
        const entryElement = document.createElement("div");
        const timestamp = entry.timestamp.toDate().toLocaleString();

        entryElement.innerHTML = `
        <div class="imageCont">
            <img src="${entry.url}" alt="${entry.name}"/>
            <p>${entry.name}</p>
            <div id="dateCont">
            <p>Created on ${timestamp}</p></div>
            <button data-id="${doc.id}" data-url="${entry.url}">Delete</button>
        </div>
        `;
        entriesList.appendChild(entryElement);
    });

    document.querySelectorAll('[data-id]').forEach(btn => {
        btn.addEventListener('click', async function() {
        const id = this.getAttribute('data-id');
        const url = this.getAttribute('data-url');
        await deleteEntry(id, url);
        loadEntries();
        });
    });
}

async function deleteEntry(id, imageUrl) {
    const user = auth.currentUser;
    if (!user) return;

    await deleteDoc(doc(db, "entries", id));

    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
}