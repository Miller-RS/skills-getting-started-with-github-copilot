document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const activities = await response.json();

      // Clear loading message and existing content
      activitiesList.innerHTML = "";
      // Clear existing options except the default one
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        renderActivityCard(name, details);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Function to render a single activity card
  function renderActivityCard(name, details) {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";
    activityCard.dataset.activityName = name; // Add data attribute for identification

    const spotsLeft = details.max_participants - details.participants.length;

    // Generate participants list HTML with delete icons
    let participantsListHTML = "";
    if (details.participants.length > 0) {
      participantsListHTML = `
        <div class="participants-section">
          <strong>Participants:</strong>
          <ul class="participants-list">
            ${details.participants.map(email => `
              <li>
                ${email}
                <button class="delete-participant" data-email="${email}" data-activity="${name}" title="Unregister ${email}">🗑️</button>
              </li>`).join('')}
          </ul>
        </div>
      `;
    } else {
      participantsListHTML = "<p>No participants signed up yet.</p>";
    }

    activityCard.innerHTML = `
      <h4>${name}</h4>
      <p>${details.description}</p>
      <p><strong>Schedule:</strong> ${details.schedule}</p>
      <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
      ${participantsListHTML}
    `;

    // Find the existing card if it exists, otherwise append
    const existingCard = activitiesList.querySelector(`.activity-card[data-activity-name="${name}"]`);
    if (existingCard) {
      existingCard.replaceWith(activityCard);
    } else {
      activitiesList.appendChild(activityCard);
    }
  }

  // Function to unregister a participant
  async function unregisterParticipant(activityName, email) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        // Refresh just the specific activity card
        const activityResponse = await fetch(`/activities`);
        const allActivities = await activityResponse.json();
        if (allActivities[activityName]) {
          renderActivityCard(activityName, allActivities[activityName]);
        } else {
          // If activity somehow disappeared, refresh all
          fetchActivities();
        }
      } else {
        showMessage(result.detail || "Failed to unregister participant.", "error");
      }
    } catch (error) {
      showMessage("An error occurred during unregistration.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Function to display messages
  function showMessage(msg, type) {
    messageDiv.textContent = msg;
    messageDiv.className = `message ${type}`; // Ensure 'message' class is always present
    messageDiv.classList.remove("hidden");

    // Hide message after 5 seconds
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailInput = document.getElementById("email");
    const activitySelectInput = document.getElementById("activity");
    const email = emailInput.value;
    const activity = activitySelectInput.value;

    if (!activity) {
      showMessage("Please select an activity.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        // Refresh just the specific activity card after signup
        const activityResponse = await fetch(`/activities`); // Fetch updated data
        const allActivities = await activityResponse.json();
        if (allActivities[activity]) {
          // Re-render the specific card with new data
          renderActivityCard(activity, allActivities[activity]);
        } else {
          fetchActivities(); // Fallback: refresh all if specific activity not found (shouldn't happen)
        }
      } else {
        showMessage(result.detail || "An error occurred during sign up.", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Add event listener for delete buttons using event delegation
  activitiesList.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-participant')) {
      const button = event.target;
      const email = button.dataset.email;
      const activityName = button.dataset.activity;
      if (confirm(`Are you sure you want to unregister ${email} from ${activityName}?`)) {
        unregisterParticipant(activityName, email);
      }
    }
  });

  // Initialize app
  fetchActivities();
});
