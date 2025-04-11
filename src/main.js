// Pinata API keys (replace with your own)


const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
  throw new Error('Pinata API keys are not defined');
}

console.log('Pinata API Key:', PINATA_API_KEY);


// Initialize IPFS
const ipfs = window.IpfsHttpClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });

// Initialize Pinata
const pinata = new Pinata(PINATA_API_KEY, PINATA_SECRET_API_KEY);

// Initialize Yjs
const ydoc = new Y.Doc();

// Use y-ipfs for synchronization
const provider = new YIpfsProvider(ydoc, ipfs, 'spanniche-shared-state');

// Shared state
const sharedNiches = ydoc.getMap('niches');
const sharedInteractions = ydoc.getMap('interactions');

// Default niches
const defaultNiches = [
  { title: "Aquascaping", category: "Hobbies", description: "Creating underwater landscapes with aquatic plants and decor." },
  { title: "Antique Appraisal", category: "Collectibles", description: "Evaluating and collecting antiques for investment." },
  { title: "Bento Box Art", category: "Food", description: "Designing beautiful Japanese-style boxed meals." },
  { title: "Blockchain Basics", category: "Technology", description: "Understanding and utilizing blockchain technology." },
  { title: "Calligraphy", category: "Arts", description: "The art of beautiful handwriting." },
  { title: "Cosplay", category: "Entertainment", description: "Creating costumes based on characters from media." },
  { title: "Digital Nomadism", category: "Lifestyle", description: "Living and working remotely while traveling the world." },
  { title: "Drone Photography", category: "Technology", description: "Capturing aerial views with drones." },
  { title: "Extreme Ironing", category: "Sports", description: "Ironing clothes in unusual, extreme locations." },
  { title: "Ethical Hacking", category: "Technology", description: "Testing security measures in systems ethically." },
  { title: "Zen Gardening", category: "Home & Garden", description: "Creating peaceful, minimalist gardens." },
  { title: "Zumba Dance", category: "Fitness", description: "Enjoying energetic dance workouts." }
];

// Function to pin state to IPFS via Pinata
async function pinState() {
  const state = JSON.stringify({
    niches: sharedNiches.toJSON(),
    interactions: sharedInteractions.toJSON()
  });
  try {
    const result = await pinata.pinJSONToIPFS(state);
    console.log('State pinned to IPFS:', result.IpfsHash);
    localStorage.setItem('latestIPFSHash', result.IpfsHash); // Store latest hash locally
  } catch (error) {
    console.error('Error pinning state:', error);
    showToast('Failed to save state to IPFS', '#c0392b');
  }
}

// Function to load state from IPFS
async function loadStateFromIPFS(hash) {
  try {
    const response = await ipfs.cat(hash);
    const state = JSON.parse(response.toString());
    Object.entries(state.niches).forEach(([key, value]) => sharedNiches.set(key, value));
    Object.entries(state.interactions).forEach(([key, value]) => sharedInteractions.set(key, value));
    console.log('State loaded from IPFS:', hash);
  } catch (error) {
    console.error('Error loading state from IPFS:', error);
    showToast('Failed to load state from IPFS', '#c0392b');
  }
}

// Initialize state
async function initializeState() {
  const latestHash = localStorage.getItem('latestIPFSHash');
  if (latestHash) {
    await loadStateFromIPFS(latestHash);
  }
  if (sharedNiches.size === 0) {
    defaultNiches.forEach(niche => {
      sharedNiches.set(niche.title, niche);
    });
    pinState(); // Pin initial state
  }
  renderDefaultCategories();
}
initializeState();

// Observe changes and pin state
sharedNiches.observe(() => {
  pinState();
  renderDefaultCategories();
});
sharedInteractions.observe(() => {
  pinState();
  renderDefaultCategories();
});

// Toast notifications
function showToast(message, bgColor = "#d63031") {
  Toastify({
    text: message,
    duration: 3000,
    close: true,
    gravity: "top",
    position: "right",
    backgroundColor: bgColor,
  }).showToast();
}

// Alphabet navigation
const alphabetNav = document.getElementById("alphabet-nav");
"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(letter => {
  const link = document.createElement("a");
  link.href = "#";
  link.classList.add("alphabet-link");
  link.textContent = letter;
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const filtered = Array.from(sharedNiches.entries())
      .filter(([_, niche]) => niche.title.toUpperCase().startsWith(letter))
      .map(([_, niche]) => niche);
    renderSearchResults(filtered);
  });
  alphabetNav.appendChild(link);
});

// Render default categories
function renderDefaultCategories(sortBy = "default") {
  const container = document.getElementById("default-categories");
  container.innerHTML = "";
  let niches = Array.from(sharedNiches.entries()).map(([_, niche]) => {
    const interactions = sharedInteractions.get(niche.title) || { likes: 0, dislikes: 0, addedAt: Date.now() };
    return {
      ...niche,
      popularity: interactions.likes - interactions.dislikes,
      longevity: Date.now() - interactions.addedAt,
      novelty: interactions.addedAt,
      profitability: Date.now() - interactions.addedAt, // Simplified for shared state
      accessibility: interactions.clickCount || 0
    };
  });

  if (sortBy === "popularity") niches.sort((a, b) => b.popularity - a.popularity);
  else if (sortBy === "longevity") niches.sort((a, b) => b.longevity - a.longevity);
  else if (sortBy === "novelty") niches.sort((a, b) => a.novelty - b.novelty);
  else if (sortBy === "profitability") niches.sort((a, b) => b.profitability - a.profitability);
  else if (sortBy === "accessibility") niches.sort((a, b) => b.accessibility - a.accessibility);

  niches.forEach(niche => {
    const card = document.createElement("div");
    card.classList.add("niche-card");
    card.innerHTML = `
      <div class="niche-header">
        <h3 class="niche-title">${niche.title}</h3>
        <span class="niche-category">${niche.category}</span>
      </div>
      <div class="niche-body">
        <p class="niche-description">${niche.description}</p>
      </div>
    `;
    card.addEventListener("click", () => {
      let interactions = sharedInteractions.get(niche.title) || { likes: 0, dislikes: 0, addedAt: Date.now(), clickCount: 0 };
      interactions.clickCount = (interactions.clickCount || 0) + 1;
      sharedInteractions.set(niche.title, interactions);
      document.getElementById("modal-niche-title").textContent = niche.title;
      document.getElementById("modal-niche-category").textContent = niche.category;
      document.getElementById("modal-niche-description").textContent = niche.description;
      document.getElementById("modal-niche-likes").textContent = interactions.likes;
      document.getElementById("modal-niche-dislikes").textContent = interactions.dislikes;
      modal.style.display = "flex";
    });
    container.appendChild(card);
  });
}

// Search functionality
const searchBar = document.querySelector(".search-bar");
const suggestionsDiv = document.getElementById("suggestions");
searchBar.addEventListener("input", () => {
  const query = searchBar.value.toLowerCase().trim();
  if (query === "") {
    suggestionsDiv.style.display = "none";
    renderDefaultCategories();
    document.getElementById("search-results").innerHTML = "";
    return;
  }
  const filtered = Array.from(sharedNiches.entries())
    .filter(([_, niche]) => niche.title.toLowerCase().includes(query) || niche.description.toLowerCase().includes(query))
    .map(([_, niche]) => niche);
  suggestionsDiv.innerHTML = "";
  filtered.slice(0, 5).forEach(niche => {
    const item = document.createElement("div");
    item.classList.add("suggestion-item");
    item.textContent = niche.title;
    item.addEventListener("click", () => {
      searchBar.value = niche.title;
      suggestionsDiv.style.display = "none";
      renderSearchResults([niche]);
    });
    suggestionsDiv.appendChild(item);
  });
  suggestionsDiv.style.display = filtered.length ? "block" : "none";
});

function renderSearchResults(niches) {
  const container = document.getElementById("search-results");
  container.innerHTML = "";
  document.getElementById("default-categories").innerHTML = "";
  niches.forEach(niche => {
    const card = document.createElement("div");
    card.classList.add("niche-card");
    card.innerHTML = `
      <div class="niche-header">
        <h3 class="niche-title">${niche.title}</h3>
        <span class="niche-category">${niche.category}</span>
      </div>
      <div class="niche-body">
        <p class="niche-description">${niche.description}</p>
      </div>
    `;
    card.addEventListener("click", () => {
      let interactions = sharedInteractions.get(niche.title) || { likes: 0, dislikes: 0, addedAt: Date.now(), clickCount: 0 };
      interactions.clickCount = (interactions.clickCount || 0) + 1;
      sharedInteractions.set(niche.title, interactions);
      document.getElementById("modal-niche-title").textContent = niche.title;
      document.getElementById("modal-niche-category").textContent = niche.category;
      document.getElementById("modal-niche-description").textContent = niche.description;
      document.getElementById("modal-niche-likes").textContent = interactions.likes;
      document.getElementById("modal-niche-dislikes").textContent = interactions.dislikes;
      modal.style.display = "flex";
    });
    container.appendChild(card);
  });
}

// Modal controls
const modal = document.getElementById("niche-modal");
document.getElementById("like-niche-btn").addEventListener("click", () => {
  const nicheTitle = document.getElementById("modal-niche-title").textContent;
  let interactions = sharedInteractions.get(nicheTitle) || { likes: 0, dislikes: 0, addedAt: Date.now(), clickCount: 0 };
  interactions.likes += 1;
  sharedInteractions.set(nicheTitle, interactions);
  document.getElementById("modal-niche-likes").textContent = interactions.likes;
});
document.getElementById("dislike-niche-btn").addEventListener("click", () => {
  const nicheTitle = document.getElementById("modal-niche-title").textContent;
  let interactions = sharedInteractions.get(nicheTitle) || { likes: 0, dislikes: 0, addedAt: Date.now(), clickCount: 0 };
  interactions.dislikes += 1;
  sharedInteractions.set(nicheTitle, interactions);
  document.getElementById("modal-niche-dislikes").textContent = interactions.dislikes;
});
document.getElementById("save-niche-btn").addEventListener("click", () => {
  const nicheTitle = document.getElementById("modal-niche-title").textContent;
  let saved = JSON.parse(localStorage.getItem("savedNiches") || "[]");
  if (!saved.some(n => n.title === nicheTitle)) {
    saved.push({ title: nicheTitle, addedAt: Date.now(), clickCount: 0, deletionTime: null });
    localStorage.setItem("savedNiches", JSON.stringify(saved));
    updateSavedButtonText();
    showToast("Niche saved!", "#27ae60");
  } else {
    showToast("Niche already saved");
  }
});
document.querySelector("#niche-modal .close-modal").addEventListener("click", () => {
  modal.style.display = "none";
});

// Saved niches modal (local to user)
const showSavedBtn = document.getElementById("show-saved-btn");
const savedModal = document.getElementById("saved-modal");
const closeSavedModal = document.getElementById("close-saved-modal");
const savedNichesList = document.getElementById("saved-niches-list");
const savedSortSelect = document.getElementById("saved-sort-select");

function updateSavedButtonText() {
  let saved = JSON.parse(localStorage.getItem("savedNiches") || "[]");
  showSavedBtn.textContent = saved.length === 0 ? "Create your niche list" : `Your niche list (${saved.length})`;
}

function loadSavedNiches(sortBy = "default") {
  let saved = JSON.parse(localStorage.getItem("savedNiches") || "[]");
  if (saved.length === 0) {
    showToast("No niches saved");
    savedNichesList.innerHTML = "";
    return;
  }
  saved = saved.map(n => {
    const interactions = sharedInteractions.get(n.title) || { likes: 0, dislikes: 0, addedAt: n.addedAt, clickCount: 0 };
    return {
      ...n,
      popularity: interactions.likes - interactions.dislikes,
      longevity: Date.now() - n.addedAt,
      novelty: n.addedAt,
      profitability: n.deletionTime ? (n.deletionTime - n.addedAt) : (Date.now() - n.addedAt),
      accessibility: n.clickCount || 0
    };
  });
  if (sortBy === "popularity") saved.sort((a, b) => b.popularity - a.popularity);
  else if (sortBy === "longevity") saved.sort((a, b) => b.longevity - a.longevity);
  else if (sortBy === "novelty") saved.sort((a, b) => a.novelty - b.novelty);
  else if (sortBy === "profitability") saved.sort((a, b) => b.profitability - a.profitability);
  else if (sortBy === "accessibility") saved.sort((a, b) => b.accessibility - a.accessibility);

  let html = "<ul>";
  saved.forEach(n => {
    html += `<li class="saved-niche-item">
      <strong>${n.title}</strong>
      <span>
        <button class="edit-niche" onclick="editNiche('${n.title.replace(/'/g, "\\'")}')">Edit</button>
        <button class="delete-niche" onclick="deleteNiche('${n.title.replace(/'/g, "\\'")}')">Delete</button>
      </span>
    </li>`;
  });
  html += "</ul>";
  savedNichesList.innerHTML = html;
}

showSavedBtn.addEventListener("click", () => {
  loadSavedNiches(savedSortSelect.value);
  savedModal.style.display = "flex";
});
closeSavedModal.addEventListener("click", () => {
  savedModal.style.display = "none";
});
savedSortSelect.addEventListener("change", () => loadSavedNiches(savedSortSelect.value));

document.getElementById("add-new-niche-btn").addEventListener("click", () => {
  const title = prompt("Enter new niche title:");
  const category = prompt("Enter category:");
  const description = prompt("Enter description:");
  if (title && category && description) {
    const newNiche = { title: title.trim(), category: category.trim(), description: description.trim() };
    sharedNiches.set(newNiche.title, newNiche);
    sharedInteractions.set(newNiche.title, { likes: 0, dislikes: 0, addedAt: Date.now(), clickCount: 0 });
    showToast("New niche added!", "#27ae60");
  } else {
    showToast("All fields are required");
  }
});

window.editNiche = function(nicheTitle) {
  let saved = JSON.parse(localStorage.getItem("savedNiches") || "[]");
  const index = saved.findIndex(n => n.title === nicheTitle);
  if (index !== -1) {
    let newTitle = prompt("Edit niche title:", nicheTitle);
    if (newTitle && newTitle.trim() !== "") {
      saved[index].title = newTitle.trim();
      localStorage.setItem("savedNiches", JSON.stringify(saved));
      loadSavedNiches(savedSortSelect.value);
      updateSavedButtonText();
    } else {
      showToast("Invalid niche title");
    }
  }
};

window.deleteNiche = function(nicheTitle) {
  let saved = JSON.parse(localStorage.getItem("savedNiches") || "[]");
  const index = saved.findIndex(n => n.title === nicheTitle);
  if (index !== -1 && confirm(`Are you sure you want to delete "${nicheTitle}" from your list?`)) {
    saved[index].deletionTime = Date.now();
    saved.splice(index, 1);
    localStorage.setItem("savedNiches", JSON.stringify(saved));
    loadSavedNiches(savedSortSelect.value);
    updateSavedButtonText();
  }
};

// Sorting for default niches
document.getElementById("sort-select").addEventListener("change", (e) => {
  renderDefaultCategories(e.target.value);
});

// Initial setup
updateSavedButtonText();
