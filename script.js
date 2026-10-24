// 1. CONNECT TO SUPABASE


const SUPABASE_URL = "https://vmrzuxufwocguwohgxpr.supabase.co";
const SUPABASE_KEY = "sb_publishable_WsTPovRcHzJNjz26CwFxEQ_eFPXyg4F";


const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);


const STORAGE_KEY = "civicsignal_neighborhood_demo";


let currentUser = "";
let currentUserId = "";
let currentNeighborhood = "Willow Creek";
let reports = [];
let messages = [];
let featureItems = {};
let preferences = {
  anonymousByDefault: false,
  compactView: false
};
let reportView = "all";
let pollVote = "";
let activeReport = null;
let toastTimer;


// 3. SAMPLE DATA


const residents = [
  { name: "Maya Thompson", role: "Community volunteer", bio: "Helps neighbors stay connected." },
  { name: "Ethan Brooks", role: "Resident", bio: "Enjoys walking trails." },
  { name: "Ava Patel", role: "Resident", bio: "Cares about clean spaces." },
  { name: "Noah Williams", role: "Resident", bio: "Enjoys helping neighbors." },
  { name: "Sophia Chen", role: "Resident", bio: "Cares about safe parks." },
  { name: "Liam Carter", role: "Resident", bio: "Follows street maintenance." },
  { name: "Olivia Reed", role: "Volunteer", bio: "Organizes community cleanups." },
  { name: "Lucas Green", role: "Resident", bio: "Enjoys community projects." }
];


const board = [
  { name: "Jordan Mitchell", role: "Board President", bio: "Community questions." },
  { name: "Danielle Foster", role: "Vice President", bio: "Community projects." },
  { name: "Marcus Bennett", role: "Treasurer", bio: "Budgets and finances." },
  { name: "Priya Shah", role: "Secretary", bio: "Meetings and records." },
  { name: "Alex Rivera", role: "Maintenance Liaison", bio: "Landscaping and repairs." }
];


const categories = [
  "Roads & sidewalks",
  "Lighting",
  "Waste & cleanliness",
  "Parks & landscaping",
  "Noise & safety",
  "Other"
];


const starterReports = [
  {
    title: "Pothole on Oak Street",
    category: "Roads & sidewalks",
    location: "Oak Street near the park",
    description: "A pothole near the park may need repair.",
    priority: "High",
    status: "Reported",
    author: "Maya Thompson",
    supports: 5
  },
  {
    title: "Streetlight out by the walking trail",
    category: "Lighting",
    location: "Willow Creek walking trail",
    description: "The light near the trail entrance appears to be out.",
    priority: "Normal",
    status: "Under review",
    author: "Ethan Brooks",
    supports: 8
  },
  {
    title: "Overflowing trash bin",
    category: "Waste & cleanliness",
    location: "Community playground",
    description: "The public trash bin is full.",
    priority: "Normal",
    status: "In progress",
    author: "Ava Patel",
    supports: 3
  },
  {
    title: "Tree branches over sidewalk",
    category: "Parks & landscaping",
    location: "Maple Lane sidewalk",
    description: "Low branches are hanging over the sidewalk.",
    priority: "Normal",
    status: "Reported",
    author: "Noah Williams",
    supports: 4
  },
  {
    title: "Playground swing needs inspection",
    category: "Parks & landscaping",
    location: "North playground",
    description: "One swing may need inspection.",
    priority: "High",
    status: "Under review",
    author: "Sophia Chen",
    supports: 6
  },
  {
    title: "Sidewalk repair completed",
    category: "Roads & sidewalks",
    location: "Cedar Court",
    description: "The uneven sidewalk appears to have been repaired.",
    priority: "Low",
    status: "Resolved",
    author: "Liam Carter",
    supports: 2
  }
];




// 4. LOCAL STORAGE FOR NON-REPORT DATA


function loadLocalData() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "{}"
    );


    messages = Array.isArray(saved.messages) ? saved.messages : [];
    featureItems = saved.featureItems || {};


    preferences = {
      anonymousByDefault: false,
      compactView: false,
      ...(saved.preferences || {})
    };


    pollVote = saved.pollVote || "";
  } catch {
    messages = [];
    featureItems = {};
    pollVote = "";
  }
}


function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      messages,
      featureItems,
      preferences,
      pollVote
    }));
  } catch {
    showToast("Your changes could not be saved.");
  }
}




// 5. HELPER FUNCTIONS


function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}


function initials(name) {
  return name.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0] || "")
    .join("")
    .toUpperCase();
}


function avatar(name) {
  return `<div class="avatar">${safe(initials(name || "N"))}</div>`;
}


function statusClass(status) {
  return "status-" + status.toLowerCase().replace(/\s+/g, "-");
}


function showToast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");


  clearTimeout(toastTimer);


  toastTimer = setTimeout(() => {
    $("#toast").classList.remove("show");
  }, 2500);
}


function showDatabaseError(error) {
  console.error(error);
  showToast("Database error. Check the setup and try again.");
}




// 6. SIGN IN AND CHECK NEIGHBORHOOD MEMBERSHIP


async function signIn(name, neighborhood, code) {
  try {
    // Get the current user or create a temporary account.
    const { data: sessionData, error: sessionError } =
      await db.auth.getSession();


    if (sessionError) throw sessionError;


    let user = sessionData.session?.user;


    if (!user) {
      const { data, error } = await db.auth.signInAnonymously();


      if (error) throw error;


      user = data.user;
    }


    // Ask Supabase to check the neighborhood access code.
    const { data, error } = await db.rpc("join_neighborhood", {
      p_neighborhood: neighborhood,
      p_access_code: code,
      p_display_name: name
    });


    if (error) throw error;


    const member = Array.isArray(data) ? data[0] : data;


    if (!member) {
      throw new Error("Neighborhood membership was not created.");
    }


    // Save the verified membership information.
    currentUser = member.display_name;
    currentUserId = user.id;
    currentNeighborhood = member.neighborhood;


    // Open the website.
    $("#signinPage").classList.add("hidden");
    $("#app").classList.remove("hidden");


    $("#sideName").textContent = currentUser;
    $("#topName").textContent = currentUser;
    $("#sideNeighborhood").textContent = currentNeighborhood;
    $("#welcomeNeighborhood").textContent = currentNeighborhood;
    $("#welcomeName").textContent = currentUser.split(" ")[0];


    await loadReports();


    renderAll();
    renderPreferences();
    showPage("dashboard");


  } catch (error) {
    console.error("Sign-in failed:", error);
    showToast(error.message || "Unable to sign in.");
  }
}




// Handle the sign-in form.
$("#signinForm").addEventListener("submit", async event => {
  event.preventDefault();


  const name = $("#nameInput").value.trim();
  const neighborhood = $("#neighborhoodInput").value;
  const code = $("#accessCodeInput").value.trim();


  if (!name || !code) {
    showToast("Enter your name and access code.");
    return;
  }


  await signIn(name, neighborhood, code);
});


// 7. LOAD REPORTS FROM SUPABASE


async function loadReports() {
  let { data, error } = await db
    .from("reports")
    .select("*")
    .eq("neighborhood", currentNeighborhood)
    .order("created_at", { ascending: false });


  if (error) throw error;


  // Add sample reports if this neighborhood has no reports yet.
  if (data.length === 0) {
    const sampleRows = starterReports.map(report => ({
      ...report,
      neighborhood: currentNeighborhood,
      created_by: currentUserId
    }));


    const result = await db.from("reports").insert(sampleRows);


    if (result.error) throw result.error;


    const reload = await db
      .from("reports")
      .select("*")
      .eq("neighborhood", currentNeighborhood)
      .order("created_at", { ascending: false });


    if (reload.error) throw reload.error;
    data = reload.data;
  }


  // Convert database column names to JavaScript names.
  reports = data.map(row => ({
    ...row,
    createdAt: new Date(row.created_at).getTime(),
    created_by: row.created_by
  }));
}




// 8. NAVIGATION


function showPage(pageName) {
  $$(".page").forEach(page => page.classList.add("hidden"));


  const page = $("#page-" + pageName);
  if (page) page.classList.remove("hidden");


  $$(".nav-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });


  const titles = {
    dashboard: "Overview",
    reports: "Community Reports",
    wellbeing: "Community Life",
    neighbors: "Neighbors",
    messages: "Messages",
    hoa: "HOA Board",
    settings: "Settings"
  };


  $("#pageTitle").textContent = titles[pageName] || "Overview";
  $(".sidebar").classList.remove("open");
  $("#menuBtn").setAttribute("aria-expanded", "false");


  window.scrollTo({ top: 0, behavior: "smooth" });
}


$$(".nav-btn").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});


$$("[data-goto]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.goto));
});


$$("[data-open-report]").forEach(button => {
  button.addEventListener("click", openReportForm);
});


$("#menuBtn").addEventListener("click", () => {
  const open = $(".sidebar").classList.toggle("open");
  $("#menuBtn").setAttribute("aria-expanded", String(open));
});




// 9. SIGN OUT


async function signOut() {
  try {
    const { error } = await db.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error(error);
  }


  currentUser = "";
  currentUserId = "";


  $("#app").classList.add("hidden");
  $("#signinPage").classList.remove("hidden");
  $("#signinForm").reset();


  $(".sidebar").classList.remove("open");
  $("#menuBtn").setAttribute("aria-expanded", "false");
}


$("#signoutBtn").addEventListener("click", signOut);


$$("[data-signout]").forEach(button => {
  button.addEventListener("click", signOut);
});




// 10. SETTINGS


function renderPreferences() {
  $("#prefAnonymous").checked = preferences.anonymousByDefault;
  $("#prefCompact").checked = preferences.compactView;


  $(".content").classList.toggle(
    "compact-view",
    preferences.compactView
  );


  $("#anonymousReport").checked = preferences.anonymousByDefault;
}


$("#settingsForm").addEventListener("submit", event => {
  event.preventDefault();


  preferences.anonymousByDefault = $("#prefAnonymous").checked;
  preferences.compactView = $("#prefCompact").checked;


  renderPreferences();
  saveData();


  showToast("Preferences saved.");
});




// 11. DASHBOARD STATISTICS


function renderStats() {
  $("#totalReports").textContent = reports.length;


  $("#openReports").textContent = reports.filter(report =>
    report.status !== "Resolved"
  ).length;


  $("#resolvedReports").textContent = reports.filter(report =>
    report.status === "Resolved"
  ).length;


  $("#totalNeighbors").textContent = residents.length;
}




// 12. REPORT DISPLAY


function reportCard(report, compact = false) {
  const author = report.anonymous ? "Anonymous neighbor" : report.author;


  const description = compact
    ? ""
    : `<p class="report-description">${safe(report.description)}</p>`;


  let statusControl = "";


  if (report.created_by === currentUserId) {
    statusControl = `
      <select class="small-btn" data-status="${report.id}">
        ${["Reported", "Under review", "In progress", "Resolved"].map(status => `
          <option ${report.status === status ? "selected" : ""}>${status}</option>
        `).join("")}
      </select>
    `;
  }


  return `
    <article class="report-item">
      <div class="report-top">
        <div>
          <div class="report-title" data-report="${report.id}">
            ${safe(report.title)}
          </div>


          <div class="report-meta">
            ${safe(report.category)} - ${safe(report.location)}
          </div>
        </div>


        <span class="status ${statusClass(report.status)}">
          ${safe(report.status)}
        </span>
      </div>


      ${description}


      <p class="report-meta">Posted by ${safe(author)}</p>


      <div class="report-actions">
        <button class="small-btn" data-support="${report.id}">
          ${report.supports} neighbors noticed this
        </button>


        ${statusControl}
      </div>
    </article>
  `;
}


function renderReports() {
  const search = $("#reportSearch").value.toLowerCase().trim();
  const status = $("#statusFilter").value;
  const category = $("#categoryFilter").value;
  const sorting = $("#reportSort").value;


  let filtered = reports.filter(report => {
    const text =
      `${report.title} ${report.location} ${report.description}`.toLowerCase();


    const matchesSearch = text.includes(search);
    const matchesStatus = status === "All" || report.status === status;
    const matchesCategory = category === "All" || report.category === category;


    let matchesView = true;


    if (reportView === "active") {
      matchesView = report.status !== "Resolved";
    }


    if (reportView === "resolved") {
      matchesView = report.status === "Resolved";
    }


    return matchesSearch && matchesStatus && matchesCategory && matchesView;
  });


  if (sorting === "attention") {
    filtered.sort((a, b) => {
      if (a.priority === "High" && b.priority !== "High") return -1;
      if (b.priority === "High" && a.priority !== "High") return 1;
      return b.createdAt - a.createdAt;
    });
  } else {
    filtered.sort((a, b) => b.createdAt - a.createdAt);
  }


  $("#allReports").innerHTML = filtered.map(report =>
    reportCard(report)
  ).join("") || `<p class="empty-state">No matching reports.</p>`;


  $("#recentReports").innerHTML = [...reports]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3)
    .map(report => reportCard(report, true))
    .join("");


  renderCategorySummary();
}


function renderCategorySummary() {
  $("#categorySummary").innerHTML = categories.map(category => {
    const count = reports.filter(report => report.category === category).length;
    const width = reports.length ? count / reports.length * 100 : 0;


    return `
      <div class="category-row">
        <p>${safe(category)}: ${count}</p>
        <div class="budget-track">
          <span style="width: ${width}%"></span>
        </div>
      </div>
    `;
  }).join("");
}


$("#reportSearch").addEventListener("input", renderReports);
$("#statusFilter").addEventListener("change", renderReports);
$("#categoryFilter").addEventListener("change", renderReports);


$("#reportSort").addEventListener("change", () => {
  if ($("#reportSort").value === "nearest") {
    showToast("Location sorting is not connected.");
    $("#reportSort").value = "recent";
  }


  renderReports();
});


$$(".report-view-tab").forEach(button => {
  button.addEventListener("click", () => {
    reportView = button.dataset.reportView;


    $$(".report-view-tab").forEach(tab => {
      tab.classList.toggle("active", tab === button);
    });


    renderReports();
  });
});




// 13. CREATE A REPORT IN SUPABASE


function openReportForm() {
  showPage("reports");
  $("#reportTitle").focus();


  $("#reportComposer").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


$("#reportForm").addEventListener("submit", async event => {
  event.preventDefault();


  const title = $("#reportTitle").value.trim();
  const location = $("#reportLocation").value.trim();
  const description = $("#reportDescription").value.trim();


  if (!title || !location || !description) return;


  const newReport = {
    title,
    category: $("#reportCategory").value,
    location,
    description,
    priority: $("#reportPriority").value,
    status: "Reported",
    author: currentUser,
    anonymous: $("#anonymousReport").checked,
    supports: 0,
    neighborhood: currentNeighborhood,
    created_by: currentUserId
  };


  const { error } = await db.from("reports").insert(newReport);


  if (error) {
    showDatabaseError(error);
    return;
  }


  $("#reportForm").reset();
  $("#anonymousReport").checked = preferences.anonymousByDefault;


  await loadReports();
  renderAll();
  showPage("reports");


  showToast("Your report was shared with the database.");
});




// 14. OPEN REPORT DETAILS


function openReportDetails(id) {
  const report = reports.find(item => item.id === Number(id));
  if (!report) return;


  activeReport = report.id;


  $("#modalTitle").textContent = report.title;
  $("#modalMeta").textContent = `${report.category} - ${report.location}`;
  $("#modalDescription").textContent = report.description;
  $("#modalStatus").textContent =
    `Status: ${report.status} | Priority: ${report.priority}`;


  $("#modalProgress").textContent =
    "Progress: Reported, Under review, In progress, Resolved";


  $("#modalSupport").textContent = `I Noticed This Too (${report.supports})`;


  $("#reportModal").classList.remove("hidden");
}


$("#closeModal").addEventListener("click", () => {
  $("#reportModal").classList.add("hidden");
});


$("#reportModal").addEventListener("click", event => {
  if (event.target.id === "reportModal") {
    $("#reportModal").classList.add("hidden");
  }
});


document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    $("#reportModal").classList.add("hidden");
  }
});




// 15. SUPPORT AND STATUS UPDATES


async function supportReport(id) {
  const { error } = await db.rpc("support_report", {
    report_id: Number(id)
  });


  if (error) {
    showDatabaseError(error);
    return;
  }


  await loadReports();
  renderAll();
  showToast("Thanks for supporting your community.");
}


document.addEventListener("click", async event => {
  const titleButton = event.target.closest("[data-report]");


  if (titleButton) {
    openReportDetails(titleButton.dataset.report);
    return;
  }


  const supportButton = event.target.closest("[data-support]");


  if (supportButton) {
    await supportReport(supportButton.dataset.support);
    return;
  }


  const messageButton = event.target.closest("[data-message-person]");


  if (messageButton) {
    showPage("messages");
    $("#messageRecipient").value = messageButton.dataset.messagePerson;
    $("#messageSubject").focus();
    return;
  }


  const pollButton = event.target.closest("[data-poll-option]");


  if (pollButton) {
    pollVote = pollButton.dataset.pollOption;
    saveData();
    renderPoll();
    showToast("Your demo vote was saved.");
    return;
  }


  const quickButton = event.target.closest("[data-quick-action]");


  if (quickButton) {
    const messages = {
      "quiet-hours": "Quiet-hour information needs to be added.",
      "trash-schedule": "Trash dates need to be added.",
      "hoa-dates": "HOA meeting dates need to be added."
    };


    showToast(messages[quickButton.dataset.quickAction]);
  }
});


document.addEventListener("change", async event => {
  const control = event.target.closest("[data-status]");
  if (!control) return;


  const report = reports.find(item =>
    item.id === Number(control.dataset.status)
  );


  if (!report || report.created_by !== currentUserId) return;


  const { error } = await db
    .from("reports")
    .update({ status: control.value })
    .eq("id", report.id)
    .eq("created_by", currentUserId);


  if (error) {
    showDatabaseError(error);
    await loadReports();
    renderAll();
    return;
  }


  await loadReports();
  renderAll();
  showToast("Report status updated.");
});


$("#modalSupport").addEventListener("click", async () => {
  if (activeReport === null) return;


  await supportReport(activeReport);


  openReportDetails(activeReport);
});




// 16. NEIGHBOR AND HOA CARDS


function personCard(person, isBoard = false) {
  const recipient = isBoard ? person.name : board[0].name;


  return `
    <article class="person-card">
      ${avatar(person.name)}
      <h3>${safe(person.name)}</h3>
      <p class="role">${safe(person.role)}</p>
      <p>${safe(person.bio)}</p>


      <button class="outline-btn full-width"
              data-message-person="${safe(recipient)}">
        ${isBoard ? "Message Board Member" : "Contact HOA"}
      </button>
    </article>
  `;
}


function renderPeople() {
  const search = $("#peopleSearch").value.toLowerCase().trim();


  const current = {
    name: currentUser,
    role: "Resident",
    bio: "Your community profile."
  };


  const people = [current, ...residents.filter(person =>
    person.name.toLowerCase() !== currentUser.toLowerCase()
  )].filter(person =>
    `${person.name} ${person.role} ${person.bio}`.toLowerCase().includes(search)
  );


  $("#peopleGrid").innerHTML = people.map(person =>
    personCard(person)
  ).join("") || `<p class="empty-state">No neighbors found.</p>`;


  $("#neighborPreview").innerHTML = residents.slice(0, 4).map(person => `
    <div class="person-mini">
      ${avatar(person.name)}
      <div>
        <strong>${safe(person.name)}</strong>
        <small>${safe(person.role)}</small>
      </div>
    </div>
  `).join("");


  $("#hoaGrid").innerHTML = board.map(person =>
    personCard(person, true)
  ).join("");
}


$("#peopleSearch").addEventListener("input", renderPeople);




// 17. MESSAGES


async function renderMessages() {
  const oldRecipient = $("#messageRecipient").value;


  $("#messageRecipient").innerHTML = board.map(person => `
    <option value="${safe(person.name)}">
      ${safe(person.name)} - ${safe(person.role)}
    </option>
  `).join("");


  if (board.some(person => person.name === oldRecipient)) {
    $("#messageRecipient").value = oldRecipient;
  }


  // Load this resident's messages from Supabase.
  const { data, error } = await db
    .from("messages")
    .select("*")
    .eq("sender_id", currentUserId)
    .eq("neighborhood", currentNeighborhood)
    .order("created_at", { ascending: false });


  if (error) {
    console.error("Could not load messages:", error);


    $("#sentMessages").innerHTML =
      '<p class="empty-state">Could not load messages.</p>';


    return;
  }


  $("#sentMessages").innerHTML = data.map(message => `
    <article class="sent-message">
      <strong>To: ${safe(message.recipient_name)}</strong>
      <small>
        ${safe(message.subject)} -
        ${new Date(message.created_at).toLocaleString()}
      </small>
      <p>${safe(message.body)}</p>
      <small>Saved in Supabase. Board notifications are not configured.</small>
    </article>
  `).join("") || '<p class="empty-state">No messages yet.</p>';
}




// Save a message in the shared database.
$("#messageForm").addEventListener("submit", async event => {
  event.preventDefault();


  const recipient = $("#messageRecipient").value;
  const subject = $("#messageSubject").value.trim();
  const body = $("#messageBody").value.trim();


  if (!recipient || !subject || !body) return;


  const { error } = await db.from("messages").insert({
    neighborhood: currentNeighborhood,
    sender_id: currentUserId,
    sender_name: currentUser,
    recipient_name: recipient,
    subject: subject,
    body: body
  });


  if (error) {
    console.error("Could not save message:", error);
    showToast("Message could not be saved.");
    return;
  }


  $("#messageForm").reset();


  await renderMessages();


  showToast("Message saved to the shared database.");
});


// 18. COMMUNITY LIFE FEATURES (LOCAL DEMO)


const featureForms = [
  {
    form: "lendItemForm",
    list: "lendItems",
    fields: [
      ["lendItemName", "Item"],
      ["lendItemCategory", "Category"],
      ["lendAvailability", "Availability"]
    ]
  },
  {
    form: "helpRequestForm",
    list: "helpRequests",
    fields: [
      ["helpRequestType", "Request"],
      ["helpRequestCategory", "Type"],
      ["helpRequestDescription", "Details"]
    ]
  },
  {
    form: "quietHoursForm",
    list: "quietNotices",
    fields: [
      ["quietNoticeTitle", "Notice"],
      ["quietNoticeDate", "Date"],
      ["quietNoticeTime", "Time"],
      ["quietNoticeDetails", "Details"]
    ]
  },
  {
    form: "buddyForm",
    list: "buddyList",
    fields: [
      ["buddyActivity", "Activity"],
      ["buddyDay", "Day"],
      ["buddyTime", "Time"]
    ]
  },
  {
    form: "youthServiceForm",
    list: "youthServices",
    fields: [
      ["youthServiceType", "Service"],
      ["youthServiceDetails", "Details"]
    ]
  },
  {
    form: "mealTrainForm",
    list: "mealTrainList",
    fields: [
      ["mealTrainOccasion", "Support"],
      ["mealTrainDate", "Date"],
      ["mealTrainSlots", "Helpers"],
      ["mealTrainDetails", "Details"]
    ]
  },
  {
    form: "communityEventForm",
    list: "communityEvents",
    fields: [
      ["communityEventTitle", "Event"]
    ]
  }
];


function renderFeatureLists() {
  featureForms.forEach(config => {
    const items = featureItems[config.form] || [];


    $("#" + config.list).innerHTML = items.map(item => {
      const details = item.values.slice(1).map((value, index) => {
        if (!value) return "";


        return `<div><strong>${safe(config.fields[index + 1][1])}:</strong> ${safe(value)}</div>`;
      }).join("");


      return `
        <article class="feature-entry">
          <strong>${safe(item.values[0])}</strong>
          ${details}
        </article>
      `;
    }).join("") || `<p class="empty-state">No entries yet.</p>`;
  });
}


featureForms.forEach(config => {
  $("#" + config.form).addEventListener("submit", event => {
    event.preventDefault();


    const values = config.fields.map(field =>
      $("#" + field[0]).value.trim()
    );


    if (!values[0]) return;


    if (!featureItems[config.form]) {
      featureItems[config.form] = [];
    }


    featureItems[config.form].push({ values });


    saveData();
    renderFeatureLists();


    $("#" + config.form).reset();
    showToast("Your entry was added.");
  });
});




// 19. POLL AND SAMPLE BUDGET


function renderPoll() {
  $("#pollFeedback").textContent = pollVote
    ? "Your vote: " + pollVote
    : "Choose an option to vote in this demo.";
}


function renderBudget() {
  const items = [
    { name: "Landscaping", amount: 62 },
    { name: "Lighting and paths", amount: 38 },
    { name: "Parks and shared spaces", amount: 48 }
  ];


  $("#budgetItems").innerHTML = items.map(item => `
    <div class="budget-item">
      <strong>${item.name}</strong>
      <div class="budget-track">
        <span style="width: ${item.amount}%"></span>
      </div>
      <small>Illustrative value only</small>
    </div>
  `).join("");
}


$("#exportBulletinBtn").addEventListener("click", () => {
  window.print();
});




// 20. REFRESH THE PAGE CONTENT


function renderAll() {
  renderStats();
  renderReports();
  renderPeople();
  renderMessages();
  renderFeatureLists();
  renderPoll();
  renderBudget();
}




// 21. START


loadLocalData();
renderPreferences();

