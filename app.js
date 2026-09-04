// --- State Management ---
let allRepos = [];
let filteredRepos = [];
const itemsPerPage = 6;
let currentPage = 1;
let showingBookmarksOnly = false;
let currentUsername = "octocat"; // Default user on initial load

const readBookmarks = () => {
  try {
    return JSON.parse(localStorage.getItem("ledesma_bookmarks")) || [];
  } catch {
    return [];
  }
};

let bookmarks = readBookmarks();

// DOM Elements
const galleryContainer = document.getElementById("projectGallery");
const searchInput = document.getElementById("searchInput");
const githubUserInput = document.getElementById("githubUserInput"); // New
const fetchUserBtn = document.getElementById("fetchUserBtn"); // New
const spinner = document.getElementById("loadingSpinner");
const errorContainer = document.getElementById("errorContainer");
const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
const paginationControls = document.getElementById("paginationControls");
const showBookmarksBtn = document.getElementById("showBookmarksBtn");
const contactForm = document.getElementById("contactForm");
const phoneInput = document.getElementById("phone");
const formError = document.getElementById("formError");
const formSuccess = document.getElementById("formSuccess");

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getVisibleRepos = () => {
  const query = searchInput.value.trim().toLowerCase();
  return allRepos.filter(({ id, name, description }) => {
    const searchableText = `${name} ${description || ""}`.toLowerCase();
    return (
      searchableText.includes(query) &&
      (!showingBookmarksOnly || bookmarks.includes(id))
    );
  });
};

// --- Fetch & Async (W4 Requirement) ---
async function fetchRepositories(username) {
  spinner.classList.remove("hidden");
  errorContainer.classList.add("hidden");
  paginationControls.classList.add("hidden");
  galleryContainer.innerHTML = "";

  try {
    // Dynamic URL based on input
    const encodedUsername = encodeURIComponent(username);
    const url = `https://api.github.com/users/${encodedUsername}/repos?sort=updated&per_page=30`;
    const res = await fetch(url);

    // Graceful 404 handling if user doesn't exist
    if (res.status === 404) {
      throw new Error(`GitHub user "${username}" not found.`);
    }
    if (!res.ok) {
      throw new Error(
        `HTTP Error: ${res.status} - Failed to fetch repositories.`,
      );
    }

    const data = await res.json();

    // Destructuring and functional mapping (W4 Requirement)
    allRepos = data.map((repo) => {
      const { id, name, description, html_url, language, stargazers_count } =
        repo;
      return {
        id,
        name,
        description,
        html_url,
        language,
        stars: stargazers_count,
      };
    });

    filteredRepos = [...allRepos];
    currentPage = 1; // Reset to page 1 on new fetch
    searchInput.value = ""; // Clear local project search
    renderGallery();
  } catch (err) {
    errorContainer.textContent = `Unable to load projects: ${err.message}`;
    errorContainer.classList.remove("hidden");
  } finally {
    spinner.classList.add("hidden");
  }
}

// --- DOM Manipulation & Interactivity (W3/W4 Requirement) ---
function renderGallery() {
  galleryContainer.innerHTML = "";

  // Pagination Logic
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const reposToDisplay = filteredRepos.slice(startIndex, endIndex);

  if (reposToDisplay.length === 0) {
    galleryContainer.innerHTML = `<p class="empty-state">No projects found.</p>`;
    paginationControls.classList.add("hidden");
    return;
  }

  // Dynamically create project cards using Template Literals
  const htmlString = reposToDisplay
    .map((repo) => {
      const isBookmarked = bookmarks.includes(repo.id);
      const iconClass = isBookmarked ? "fa-solid" : "fa-regular";
      const activeClass = isBookmarked ? "bookmarked" : "";

      return `
            <article class="project-card">
                <div class="project-header">
            <a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener noreferrer" class="project-title">${escapeHtml(repo.name)}</a>
            <button type="button" class="bookmark-btn ${activeClass}" data-id="${repo.id}" aria-label="${isBookmarked ? "Remove bookmark" : "Bookmark project"}">
                        <i class="${iconClass} fa-bookmark"></i>
                    </button>
                </div>
          <p class="project-desc">${escapeHtml(repo.description || "No description provided.")}</p>
                <div class="project-meta">
            <span><i class="fa-solid fa-code"></i> ${escapeHtml(repo.language || "N/A")}</span>
                    <span><i class="fa-solid fa-star"></i> ${repo.stars}</span>
                </div>
            </article>
      `;
    })
    .join("");

  galleryContainer.innerHTML = htmlString;
  updatePaginationControls();
  attachBookmarkListeners();
}

// --- Pagination Helpers ---
function updatePaginationControls() {
  const totalPages = Math.ceil(filteredRepos.length / itemsPerPage);

  if (totalPages > 1) {
    paginationControls.classList.remove("hidden");
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    // Visual styling for disabled states
    prevBtn.style.opacity = currentPage === 1 ? "0.5" : "1";
    nextBtn.style.opacity = currentPage === totalPages ? "0.5" : "1";
  } else {
    paginationControls.classList.add("hidden");
  }
}

// --- Event Listeners ---

const fetchEnteredProfile = () => {
  const username = githubUserInput.value.trim();
  if (!username) {
    errorContainer.textContent = "Please enter a GitHub username.";
    errorContainer.classList.remove("hidden");
    return;
  }

  currentUsername = username;
  fetchRepositories(username);
};

fetchUserBtn.addEventListener("click", fetchEnteredProfile);

githubUserInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    fetchEnteredProfile();
  }
});

// 1. Search Functionality (W3 Requirement)
searchInput.addEventListener("input", (e) => {
  filteredRepos = getVisibleRepos();
  currentPage = 1; // Reset to page 1 on search
  renderGallery();
});

// 2. Pagination Clicks
prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderGallery();
  }
});

nextBtn.addEventListener("click", () => {
  const totalPages = Math.ceil(filteredRepos.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderGallery();
  }
});

// 3. Toggle Bookmarks View (Bonus)
showBookmarksBtn.addEventListener("click", () => {
  showingBookmarksOnly = !showingBookmarksOnly;
  showBookmarksBtn.classList.toggle("btn-primary");
  showBookmarksBtn.classList.toggle("btn-secondary");

  filteredRepos = getVisibleRepos();
  currentPage = 1;
  renderGallery();
});

// 4. Handle Bookmarking action
function attachBookmarkListeners() {
  const buttons = document.querySelectorAll(".bookmark-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = Number(e.currentTarget.dataset.id);

      if (bookmarks.includes(id)) {
        bookmarks = bookmarks.filter((bId) => bId !== id);
      } else {
        bookmarks.push(id);
      }

      localStorage.setItem("ledesma_bookmarks", JSON.stringify(bookmarks));
      filteredRepos = getVisibleRepos();
      renderGallery(); // Re-render to update UI states
    });
  });
}

// 5. Contact Form Regex Validation (Bonus)
contactForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const phPhoneRegex = /^(09|\+639)\d{9}$/;
  const isValidPhone = phPhoneRegex.test(phoneInput.value.trim());
  const fullName = document.getElementById("fullName").value.trim();

  formError.classList.toggle("hidden", Boolean(fullName) && isValidPhone);
  formSuccess.classList.add("hidden");

  if (!fullName || !isValidPhone) {
    phoneInput.classList.add("invalid");
  } else {
    phoneInput.classList.remove("invalid");
    formSuccess.classList.remove("hidden");
    contactForm.reset();

    // Hide success message after 3 seconds
    setTimeout(() => {
      formSuccess.classList.add("hidden");
    }, 3000);
  }
});

// --- Initialize App ---
document.addEventListener("DOMContentLoaded", () =>
  fetchRepositories(currentUsername),
);
