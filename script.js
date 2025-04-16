document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("devlogContainer");
  const baseCsvFileUrl = 'devlog-csv.csv'; // Base URL for the CSV file.
  const BATCH_SIZE = 5; // Number of date groups to render per batch.

  // Mapping activity types to emoji icons.
  const activityIcons = {
    commit: "📌",
    issue: "⚠️",
    pull_request: "🔨",
    fork: "🍴",
    release: "🏷️"
  };

  // Variables for lazy loading state.
  let sortedDates = []; // Array of date keys in sorted order.
  let groupedLogs = {}; // Grouped log entries.
  let currentIndex = 0; // Index of the next date group to render.
  let observer; // IntersectionObserver instance.

  // Create a sentinel element at the end of the container.
  const sentinel = document.createElement("div");
  sentinel.id = "sentinel";
  container.appendChild(sentinel);

  // Helper: Fetch and parse CSV data using a cache-busting query parameter.
  function fetchCSV(url) {
    const fullUrl = url + '?v=' + new Date().getTime(); // Append timestamp to bypass cache.
    return fetch(fullUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Network response was not ok. Status: ${response.status}`);
        }
        return response.text();
      })
      .then(text => {
        console.log("CSV content loaded:", text);
        return parseCSV(text);
      });
  }

  // CSV parser: Splits lines and fields on commas not enclosed in quotes.
  function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',');
    const data = lines.slice(1).map(line => {
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      const entry = {};
      headers.forEach((header, i) => {
        let value = values[i] ? values[i].trim() : "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        entry[header.trim()] = value;
      });
      return entry;
    });
    return data;
  }

  // Group log entries by date (expects 'date' field in YYYY-MM-DD format).
  function groupLogsByDate(logs) {
    const groups = {};
    logs.forEach(log => {
      const date = log.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    return groups;
  }

  // Helper: Parse a date and time string to a local Date object.
  function parseLocalDateTime(dateStr, timeStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute, second] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute, second);
  }

  // Format a date string (YYYY-MM-DD) into a human-friendly date.
  function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return localDate.toLocaleDateString(undefined, options);
  }

  // Render a single date group (a "card").
  function renderGroup(date) {
    const card = document.createElement("div");
    card.className = "devlog-entry";

    // Date header.
    const header = document.createElement("div");
    header.className = "date-header";
    header.textContent = formatDate(date);
    card.appendChild(header);

    // Sort the entries for the date group by local time ascending.
    const entries = groupedLogs[date].sort((a, b) => {
      return parseLocalDateTime(a.date, a.time) - parseLocalDateTime(b.date, b.time);
    });

    const list = document.createElement("ul");
    entries.forEach(log => {
      const listItem = document.createElement("li");

      // Build log entry content: [time] - [icon] activity on repository: description.
      const timeSpan = document.createElement("span");
      timeSpan.className = "time";
      timeSpan.textContent = log.time;

      const iconSpan = document.createElement("span");
      iconSpan.className = "icon";
      iconSpan.textContent = activityIcons[log.activity] || "";

      const activitySpan = document.createElement("span");
      activitySpan.className = "activity";
      activitySpan.textContent = log.activity;

      const repoSpan = document.createElement("span");
      repoSpan.className = "repo";
      repoSpan.textContent = log.repository;

      const descriptionSpan = document.createElement("span");
      descriptionSpan.className = "description";
      descriptionSpan.textContent = log.description;

      listItem.appendChild(timeSpan);
      listItem.insertAdjacentText("beforeend", " - ");
      listItem.appendChild(iconSpan);
      listItem.insertAdjacentText("beforeend", " ");
      listItem.appendChild(activitySpan);
      listItem.insertAdjacentText("beforeend", " on ");
      listItem.appendChild(repoSpan);
      listItem.insertAdjacentText("beforeend", ": ");
      listItem.appendChild(descriptionSpan);
      list.appendChild(listItem);
    });
    card.appendChild(list);
    container.insertBefore(card, sentinel);
  }

  // Render the next batch of date groups.
  function renderNextGroups() {
    const nextBatch = sortedDates.slice(currentIndex, currentIndex + BATCH_SIZE);
    nextBatch.forEach(date => renderGroup(date));
    currentIndex += BATCH_SIZE;
    // If all groups have been rendered, disconnect the observer.
    if (currentIndex >= sortedDates.length && observer) {
      observer.disconnect();
    }
  }

  // Set up IntersectionObserver to lazy-load more groups when the sentinel is in view.
  function setupObserver() {
    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        renderNextGroups();
      }
    });
    observer.observe(sentinel);
  }

  // Function to load CSV data, group logs, and initialize lazy rendering.
  function loadAndRenderCSV() {
    fetchCSV(baseCsvFileUrl)
      .then(data => {
        groupedLogs = groupLogsByDate(data);
        // Sort dates in descending order (most recent first).
        sortedDates = Object.keys(groupedLogs).sort((a, b) => new Date(b) - new Date(a));
        // Reset lazy load state.
        currentIndex = 0;
        container.innerHTML = "";
        container.appendChild(sentinel); // Re-attach sentinel.
        renderNextGroups();
        setupObserver();
      })
      .catch(error => {
        console.error("Error loading CSV data:", error);
        container.textContent = "Error loading devlog data.";
      });
  }

  // Initial load.
  loadAndRenderCSV();

  // Set up auto-refresh to load new CSV data every 60 seconds.
  setInterval(loadAndRenderCSV, 60000);
});
