let deniedSubjects = [];
let professorSubjects = {};
let approvedSubjects = {};
let currentProfessorId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  removeAllModals();
  lucide.createIcons();
  fetchData();
  fetchNotifications();
  fetchDeniedSubjects();
  fetchApprovedSubjects(); // fetch approved subjects on load
});

function removeAllModals() {
  const modals = ['professorSubjectsModal', 'deniedSubjectModal', 'approvedSubjectsModal'];
  modals.forEach(id => {
    const modal = document.getElementById(id);
    if (modal) modal.remove();
  });
}

// Fetch all submitted subjects
async function fetchData() {
  try {
    const response = await fetch('http://0.0.0.0:3000/get_submitted_subjects');
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    professorSubjects = data.reduce((acc, item) => {
      if (!acc[item.professor_id]) acc[item.professor_id] = [];
      acc[item.professor_id].push(item);
      return acc;
    }, {});
    displayGroupedData(data);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}


function displayGroupedData(items) {
  const tableBody = document.getElementById('subjectOfferingsTable');
  tableBody.innerHTML = '';

  // Filter out rejected subjects
  const filteredItems = items.filter(item => !item.rejected);

  if (filteredItems.length === 0) {
    const noOfferingsRow = document.createElement('tr');
    noOfferingsRow.innerHTML = `
      <td colspan="6" class="py-8 text-center text-gray-500">No subject offerings to review.</td>
    `;
    tableBody.appendChild(noOfferingsRow);
    return;
  }

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.professor_id]) {
      acc[item.professor_id] = {
        professor_name: item.professor_name || `${item.professor_id}`,
        department: item.department,
        year: item.year_level,
        subjects: [],
        totalUnits: 0, // Initialize totalUnits here
      };
    }

    // Calculate total units for this subject
    const subjectUnits =
      (item.lecture || 0) +
      (item.com_lab || 0) +
      (item.laboratory || 0) +
      (item.school_lecture || 0) +
      (item.clinic || 0);

    acc[item.professor_id].subjects.push(item);
    acc[item.professor_id].totalUnits += subjectUnits;

    return acc;
  }, {});

  Object.entries(groupedItems).forEach(([profId, { professor_name, department, year, subjects, totalUnits }]) => {
    const row = document.createElement('tr');
    row.className = 'border-b border-gray-200 hover:bg-gray-50';
    row.innerHTML = `
      <td class="p-3 text-gray-900">${department}</td>
      <td class="p-3 text-gray-900">${professor_name}</td>
      <td class="p-3 text-gray-900">${year}</td>
      <td class="p-3 text-right">
        <button class="view-submissions rounded bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" data-professor-id="${profId}">
          View Submissions
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  document.querySelectorAll('.view-submissions').forEach(btn => {
    btn.addEventListener('click', () => {
      const profId = btn.getAttribute('data-professor-id');
      showProfessorSubjectsModal(profId);
    });
  });
}

function showProfessorSubjectsModal(professorId) {
  removeAllModals();
  const allSubjects = professorSubjects[professorId] || [];
  // Filter out rejected subjects
  const subjects = allSubjects.filter(s => !s.rejected);
  const pendingSubjects = subjects.filter(s => !s.approved);

  const modalHTML = `
    <div id="professorSubjectsModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-20">
      <div class="relative top-20 mx-auto p-5 border w-3/4 shadow-lg rounded-md bg-white">
        <div class="mt-3 text-center">
          <h3 class="text-lg leading-6 font-medium text-gray-900">Subject Offerings</h3>
          <div class="mt-2 px-7 py-3">
            <div class="flex justify-between items-center mb-4">
              <div id="professorInfo">Professor ID: ${professorId} - ${pendingSubjects.length} subject(s) pending</div>
              ${pendingSubjects.length > 0 ? `<button id="approveAllBtn" class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">Approve All Pending</button>` : ''}
            </div>
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Code</th>
                  <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Name</th>
                  <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Units</th>
                  <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Lecture</th>
                  <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Computer Laboratory</th>
                  <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Laboratory</th>
                  <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">School Lecture</th>
                  <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Clinic</th>
                  <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Type</th>
                  <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody id="modalSubjectsTable" class="bg-white divide-y divide-gray-200">
                ${subjects.map(item => `
                  <tr class="border-b border-gray-200 hover:bg-gray-50" data-subject-id="${item.id}">
                    <td class="p-3 text-gray-900">${item.subject_code}</td>
                    <td class="p-3 text-gray-900">${item.subject_name}</td>
                    <td class="p-3 text-gray-900">${
                      (item.lecture || 0) +
                      (item.laboratory || 0) +
                      (item.com_lab || 0) +
                      (item.school_lecture || 0) +
                      (item.clinic || 0)
                    }</td>
                    <td class="p-3 text-gray-900">${item.lecture || 0}</td>
                    <td class="p-3 text-gray-900">${item.com_lab || 0}</td>
                    <td class="p-3 text-gray-900">${item.laboratory || 0}</td>
                    <td class="p-3 text-gray-900">${item.school_lecture || 0}</td>
                    <td class="p-3 text-gray-900">${item.clinic || 0}</td>
                    <td class="p-3 text-gray-900">${item.subject_type}</td>
                    <td class="p-3 text-right">
                      ${!item.approved ? `
                        <button class="deny-subject rounded bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-200" data-subject-id="${item.id}">
                          Deny
                        </button>
                      ` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="items-center px-4 py-3">
            <button id="closeModal" class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  if (pendingSubjects.length > 0) {
    document.getElementById('approveAllBtn').onclick = () => approveAllSubjects(professorId);
  }
  document.querySelectorAll('.deny-subject').forEach(btn => {
    btn.addEventListener('click', () => {
      const subjectId = btn.getAttribute('data-subject-id');
      const subject = subjects.find(s => s.id == subjectId);
      denySubject(subject, professorId);
    });
  });
  document.getElementById('closeModal').addEventListener('click', closeProfessorModal);
  currentProfessorId = professorId;
}

function closeProfessorModal() {
  const modal = document.getElementById('professorSubjectsModal');
  if (modal) modal.remove();
  currentProfessorId = null;
}

async function approveAllSubjects(professorId) {
  const allSubjects = professorSubjects[professorId] || [];
  const subjectsToApprove = allSubjects.filter(s => !s.approved && !s.rejected);

  if (subjectsToApprove.length === 0) {
    alert("No pending subjects to approve");
    return;
  }

  // Create list of subject codes
  const subjectList = subjectsToApprove.map(s => s.subject_code).join(', ');

  // Show only subject codes in confirmation
  const confirmation = confirm(
    `Approve these subjects:\n${subjectList}\n\nClick OK to confirm.`
  );

  if (!confirmation) return;

  try {
    const response = await fetch('http://0.0.0.0:3000/approve_all_subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professor_id: professorId,
        subject_ids: subjectsToApprove.map(s => s.id),
        approved_by: "Registrar"
      })
    });

    if (!response.ok) throw new Error('Failed to approve selected subjects');

    subjectsToApprove.forEach(s => s.approved = true);

    // Show only subject codes in success message
    alert(`Approved subjects:\n${subjectList}`);

    closeProfessorModal();

    await fetchData();
    await fetchNotifications();
    await fetchDeniedSubjects();
    await fetchApprovedSubjects();

    removeProfessorRow(professorId);
  } catch (err) {
    console.error('Error approving:', err);

  }
}

function updateProfessorInfoCount(professorId) {
  const professorInfoDiv = document.getElementById('professorInfo');
  if (!professorInfoDiv) return;

  const pendingSubjects = (professorSubjects[professorId] || []).filter(s =>
    !s.approved && !s.rejected
  );

  professorInfoDiv.textContent = `Professor ID: ${professorId} - ${pendingSubjects.length} subject(s) pending`;
}

function removeProfessorRow(professorId) {
  const tbody = document.getElementById('subjectOfferingsTable');
  Array.from(tbody.querySelectorAll('tr')).forEach(row => {
    if (row.cells[0].textContent === professorId) row.remove();
  });
  if (tbody.children.length === 0) {
    const noRow = document.createElement('tr');
    noRow.innerHTML = `<td colspan="4" class="py-8 text-center text-gray-500">No subject offerings to review.</td>`;
    tbody.appendChild(noRow);
  }
}

async function denySubject(item, professorId) {
  try {
    const comment = prompt("Provide reason for denial:");
    if (!comment) throw new Error("Comment is required");

    const res = await fetch("http://0.0.0.0:3000/deny_subject", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, comment, status: "Denied" })
    });

    if (!res.ok) throw new Error("Denial failed");

    // Update local state
    if (professorSubjects[professorId]) {
      const idx = professorSubjects[professorId].findIndex(s => s.id === item.id);
      if (idx !== -1) {
        professorSubjects[professorId][idx].rejected = true;
        professorSubjects[professorId][idx].approved = false;
        professorSubjects[professorId][idx].comment = comment;

        // Immediately remove from UI
        const subjectRow = document.querySelector(`tr[data-subject-id="${item.id}"]`);
        if (subjectRow) subjectRow.remove();

        // Update the professor info count
        updateProfessorInfoCount(professorId);
      }
    }

    await fetchNotifications();
    await fetchDeniedSubjects();
    await fetchApprovedSubjects();

    // Check if any pending subjects remain
    const pendingCount = (professorSubjects[professorId] || []).filter(s =>
      !s.approved && !s.rejected
    ).length;

    if (pendingCount === 0) {
      // If no pending left, close modal and remove from main table
      closeProfessorModal();
      removeProfessorRow(professorId);
    }
  } catch (err) {
    console.error("Failed to deny:", err);

  }
}

// Show denial reason modal
function showDenialReason(subjectCode, comment) {
  removeAllModals();
  const html = `
    <div id="deniedSubjectModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-20 flex items-center justify-center">
      <div class="relative mx-auto p-5 border w-1/2 shadow-lg rounded-md bg-white">
        <div class="mt-3 text-center">
          <h3 class="text-lg leading-6 font-medium text-gray-900">Denial Reason for ${subjectCode}</h3>
          <div class="mt-2 px-7 py-3">
            <p id="deniedSubjectDetails" class="text-gray-700">Reason: ${comment || 'No reason provided'}</p>
          </div>
          <button onclick="closeDeniedModal()" class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">Close</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function closeDeniedModal() {
  document.getElementById('deniedSubjectModal')?.remove();
}

// Fetch notifications and display
async function fetchNotifications() {
  try {
    const res = await fetch('http://0.0.0.0:3000/get_notifications');
    if (!res.ok) throw new Error('Network');
    const list = await res.json();
    displayApprovedSubjects(list);
  } catch (err) {
    console.error('Error fetching notifications:', err);
  }
}

// Display notification list
function displayApprovedSubjects(notificationList) {
  const tbody = document.getElementById('DisplayMessageStatus');
  tbody.innerHTML = '';
  if (notificationList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-gray-500">No subjects submitted yet.</td></tr>`;
    return;
  }
  notificationList.forEach(n => {
    const row = document.createElement('tr');
    row.className = 'border-b border-gray-200 hover:bg-gray-50';
    const statusHtml = n.status === "Denied" ?
      `<span class="text-red-500">Denied</span> <button class="text-blue-500 underline" onclick="showDenialReason('${n.subject_code}', '${n.comment}')">(View Reason)</button>` :
      `<span class="text-green-500">Approved</span>`;
    row.innerHTML = `
      <td class="p-3 text-gray-900">${n.subject_code}</td>
      <td class="p-3 text-gray-900">${n.subject_name}</td>
      <td class="p-3 text-gray-900">${n.department}</td>
      <td class="p-3 text-right text-gray-900">${n.year_level}</td>
      <td class="p-3 text-right">${statusHtml}</td>`;
    tbody.appendChild(row);
  });
  lucide.createIcons();
}

// Fetch denied subjects
async function fetchDeniedSubjects() {
  try {
    const res = await fetch('http://0.0.0.0:3000/get_denied_subjects');
    if (!res.ok) throw new Error('Network');
    deniedSubjects = await res.json();
  } catch (err) {
    console.error('Error fetching denied subjects:', err);
  }
}

// Close modals on outside click
document.addEventListener('click', e => {
  if (document.getElementById('professorSubjectsModal') && e.target === document.getElementById('professorSubjectsModal')) {
    closeProfessorModal();
  }
  if (document.getElementById('deniedSubjectModal') && e.target === document.getElementById('deniedSubjectModal')) {
    closeDeniedModal();
  }
  if (document.getElementById('approvedSubjectsModal') && e.target === document.getElementById('approvedSubjectsModal')) {
    document.getElementById('approvedSubjectsModal').remove();
  }
});
