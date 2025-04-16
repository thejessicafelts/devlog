document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("devlogContainer");
  const csvFile = 'devlog-csv.csv'; // Ensure the CSV is in the same directory

  // Mapping activity types to emoji icons
  const activityIcons = {
    commit: "📌",
    issue: "⚠️",
    pull_request: "🔨",
    fork: "🍴",
    release: "🏷️"
  };

  // Helper: Fetch and parse CSV data
  function fetchCSV(url) {
    return fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Network response was not ok. Status: ${response.status}`);
        }
        return response.text();
      })
      .then(text => {
        console.log("CSV content loaded:", text); // Debug: log raw CSV content
        return parseCSV(text);
      });
  }

  // Updated CSV parser to correctly split on commas not within quotes.
  function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',');
    const data = lines.slice(1).map(line => {
      // This regex splits on commas that are not enclosed in quotes.
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      const entry = {};
      headers.forEach((header, i) => {
        let value = values[i] ? values[i].trim() : "";
        // Remove surrounding quotes if present.
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        entry[header.trim()] = value;
      });
      return entry;
    });
    return data;
  }

  // Group log entries by date (YYYY-MM-DD)
  function groupLogsByDate(logs) {
    const groups = {};
    logs.forEach(log => {
      const date = log.date; // Expecting format: YYYY-MM-DD
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    return groups;
  }

  // Helper: Parse date string and time string to a local Date object.
  function parseLocalDateTime(dateStr, timeStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute, second] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute, second);
  }

  // Format a date string (YYYY-MM-DD) as a human-friendly date using local date values.
  function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    // Construct a local date – the Date constructor here interprets the values in local time.
    const localDate = new Date(year, month - 1, day);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return localDate.toLocaleDateString(undefined, options);
  }

  // Render the devlog UI from the grouped data
  function renderDevlogs(groupedLogs) {
    // Sort dates in descending order (most recent first)
    const dates = Object.keys(groupedLogs).sort((a, b) => new Date(b) - new Date(a));

    dates.forEach(date => {
      const card = document.createElement("div");
      card.className = "devlog-entry";

      // Create date header using a formatted version of the date string
      const header = document.createElement("div");
      header.className = "date-header";
      header.textContent = formatDate(date);
      card.appendChild(header);

      // Sort entries for the day in ascending order by local time
      const entries = groupedLogs[date].sort((a, b) => {
        return parseLocalDateTime(a.date, a.time) - parseLocalDateTime(b.date, b.time);
      });

      const list = document.createElement("ul");
      entries.forEach(log => {
        const listItem = document.createElement("li");

        // Build the entry line: [time] - [icon] activity on repository: description
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

        // Compose the list item content
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
      container.appendChild(card);
    });
  }

  // Fetch the CSV file, parse the contents, group the data and render the UI
  fetchCSV(csvFile)
    .then(data => {
      // Data is an array of log objects from the CSV file
      const groupedLogs = groupLogsByDate(data);
      renderDevlogs(groupedLogs);
    })
    .catch(error => {
      console.error("Error loading CSV data:", error);
      container.textContent = "Error loading devlog data.";
    });
});
