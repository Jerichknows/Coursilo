document.getElementById('logoutBtn').addEventListener('click', function () {
  fetch('/logout')
    .then(response => {
      if (response.redirected) {
        window.location.href = response.url;
      } else {
        alert("Logout failed.");
      }
    })
    .catch(error => {
      console.error("Logout error:", error);
      alert("An error occurred during logout.");
    });
});

document.addEventListener('DOMContentLoaded', function() {
  // Initialize Lucide icons
  lucide.createIcons();

  // Fetch user data
  fetch('/current_user')
    .then(response => response.json())
    .then(data => {
      if (data.success && data.user) {
        const user = data.user;

        // Set basic user info that everyone sees
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('userEmailDropdown').textContent = user.email;
        document.getElementById('userName').textContent = `${user.first_name} ${user.last_name}`;

        // Set user role
        document.getElementById('userRole').textContent = user.user_type.toLowerCase();

        // Get references to all info sections
        const departmentInfo = document.getElementById('departmentInfo');
        const departmentName = document.getElementById('departmentName');
        const programsInfo = document.getElementById('programsInfo');
        const programsList = document.getElementById('programsList');

        // Clear existing programs
        programsList.innerHTML = '';

        // Role-based display logic
        switch(user.user_type.toLowerCase()) {
          case 'admin':
            // Admin only shows email (default state)
            departmentInfo.classList.add('hidden');
            programsInfo.classList.add('hidden');
            break;

          case 'dean':
            // Dean shows email and department
            if (user.department) {
              departmentName.textContent = `${user.department.name} (${user.department.code})`;
              departmentInfo.classList.remove('hidden');
            }
            programsInfo.classList.add('hidden');
            break;

          case 'program-head':
            // Program head shows email, department, and programs
            if (user.department) {
              departmentName.textContent = `${user.department.name} (${user.department.code})`;
              departmentInfo.classList.remove('hidden');
            }

            if (user.programs && user.programs.length > 0) {
              user.programs.forEach(program => {
                const li = document.createElement('li');
                li.className = 'py-1 text-sm text-gray-700';
                li.textContent = `${program.name} (${program.code})`;
                programsList.appendChild(li);
              });
              programsInfo.classList.remove('hidden');
            } else {
              const li = document.createElement('li');
              li.className = 'py-1 text-sm text-gray-500 italic';
              li.textContent = 'No programs assigned';
              programsList.appendChild(li);
              programsInfo.classList.remove('hidden');
            }
            break;

          default:
            // Default case (shouldn't happen)
            departmentInfo.classList.add('hidden');
            programsInfo.classList.add('hidden');
        }
      }
    })
    .catch(error => {
      console.error('Error fetching user data:', error);
    });
});

document.addEventListener("DOMContentLoaded", async () => {
  await loadYearSemesters();
  await loadAssignedPrograms();
});

async function loadYearSemesters() {
  try {
    const res = await fetch('/year-semester-sorted');
    const data = await res.json();

    const select = document.getElementById('yearSemesterSelect');
    select.innerHTML = ''; // Clear all options first

    // Find the active YearSemester entry
    const activeEntry = data.find(entry => entry.is_active);
    const inactiveEntries = data.filter(entry => !entry.is_active);

    // Add placeholder
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'Select Year/Semester';
    placeholderOption.disabled = true;
    placeholderOption.selected = !activeEntry;
    select.appendChild(placeholderOption);

    // Add active entry first (if exists)
    if (activeEntry) {
      const option = document.createElement('option');
      option.value = activeEntry.id;
      option.textContent = `${activeEntry.school_year} - ${activeEntry.semester} (Active)`;
      option.selected = true;
      select.appendChild(option);
    }

    // Create an optgroup for inactive options
    if (inactiveEntries.length > 0) {
      const optGroup = document.createElement('optgroup');
      optGroup.label = 'Inactive Year/Semesters';

      inactiveEntries.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry.id;
        option.textContent = `${entry.school_year} - ${entry.semester}`;
        optGroup.appendChild(option);
      });

      select.appendChild(optGroup);
    }
  } catch (err) {
    console.error('Failed to load year/semesters:', err);
  }
}


async function loadAssignedPrograms() {
  try {
    const res = await fetch('/assigned-programs');
    const result = await res.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to load programs');
    }

    const select = document.getElementById('programSelect');
    select.innerHTML = '<option value="">Select Program</option>';

    result.programs.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = `${p.program_name} (${p.program_code})`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Failed to load programs:', err);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadYearSemesters();
  await loadAssignedPrograms();

  // Load the user's department and year levels
  await loadUserDepartmentAndYearLevels();
});

async function loadUserDepartmentAndYearLevels() {
  try {
    const res = await fetch('/current_user');
    const data = await res.json();

    if (data.success && data.user && data.user.department) {
      const departmentId = data.user.department.id;
      await loadYearLevelsByDepartment(departmentId);
    }
  } catch (err) {
    console.error('Failed to load user department:', err);
  }
}

async function loadYearLevelsByDepartment(departmentId) {
  const yearSelect = document.getElementById('yearLevelSelect');
  yearSelect.innerHTML = '<option value="">Select Year Level</option>';

  if (!departmentId) return;

  try {
    const res = await fetch(`/year_levels_by_department/${departmentId}`);
    const data = await res.json();

    if (data.success && data.year_levels && data.year_levels.length > 0) {
      // Get unique year levels and sort them
      const uniqueYearLevels = [...new Set(data.year_levels)].sort();

      uniqueYearLevels.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `Year ${year}`;
        yearSelect.appendChild(option);
      });
    } else {
      const option = document.createElement('option');
      option.disabled = true;
      option.textContent = 'No year levels found for this department';
      yearSelect.appendChild(option);
    }
  } catch (err) {
    console.error('Failed to load year levels:', err);
  }
}

// Add event listener for year level selection to load subjects
document.getElementById('yearLevelSelect').addEventListener('change', async function() {
  const yearLevel = this.value;
  const programId = document.getElementById('programSelect').value;
  const yearSemesterId = document.getElementById('yearSemesterSelect').value;

  if (yearLevel && programId && yearSemesterId) {
    await loadSubjects(yearSemesterId, programId, yearLevel);
  }
});


async function loadSubjects(yearSemesterId, programId, yearLevel) {
  try {
    const res = await fetch(`/subjects_by_program_year?year_semester_id=${yearSemesterId}&program_id=${programId}&year_level=${yearLevel}`);
    const data = await res.json();

    const subjectSelect = document.getElementById('subjectSelect');
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';

    if (data.success && data.subjects.length > 0) {
      data.subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = `${subject.subject_code} - ${subject.subject_name}`;
        subjectSelect.appendChild(option);
      });
    } else {
      const option = document.createElement('option');
      option.disabled = true;
      option.textContent = 'No subjects found for this year level';
      subjectSelect.appendChild(option);
    }
  } catch (err) {
    console.error('Failed to load subjects:', err);
  }
}

// Initialize selectedSubjects array at the top level
let selectedSubjects = [];

// Function to show notification
function showNotification(message) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.classList.remove('hidden');

  setTimeout(() => {
    notification.classList.add('hidden');
  }, 3000);
}

// Function to update the summary section
function updateSummary() {
  const totalSubjects = selectedSubjects.length;
  const totalUnits = selectedSubjects.reduce((sum, subject) => sum + (subject.total_units || 0), 0);

  document.getElementById('totalSubjects').textContent = totalSubjects;
  document.getElementById('totalUnits').textContent = totalUnits;

  // Update load status
  const loadStatus = document.getElementById('loadStatus');
  loadStatus.className = 'rounded-full px-3 py-1 text-sm font-medium ';

  if (totalUnits < 12) {
    loadStatus.textContent = 'Underloaded';
    loadStatus.classList.add('bg-yellow-100', 'text-yellow-800');
  } else if (totalUnits >= 12 && totalUnits <= 18) {
    loadStatus.textContent = 'Balanced';
    loadStatus.classList.add('bg-green-100', 'text-green-800');
  } else {
    loadStatus.textContent = 'Overloaded';
    loadStatus.classList.add('bg-red-100', 'text-red-800');
  }
}

// Update the table row generation
function updateSelectedSubjectsTable() {
  const tableBody = document.getElementById('selectedSubjectsTable');
  tableBody.innerHTML = '';

  if (selectedSubjects.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="10" class="placeholder-row py-8 text-center text-gray-500">
          No subjects selected. Please select a subject to add.
        </td>
      </tr>
    `;
  } else {
    selectedSubjects.forEach((subject, index) => {
      const row = document.createElement('tr');
      row.className = 'border-b border-gray-200 hover:bg-gray-50';
      row.innerHTML = `
        <td class="p-3 border">${subject.code}</td>
        <td class="p-3 border">${subject.name}</td>
        <td class="p-3 text-center border">${subject.total_units}</td>
        <td class="p-3 text-center border">${subject.lecture}</td>
        <td class="p-3 text-center border">${subject.com_lab}</td>
        <td class="p-3 text-center border">${subject.laboratory}</td>
        <td class="p-3 text-center border">${subject.school_lecture}</td>
        <td class="p-3 text-center border">${subject.clinic}</td>
        <td class="p-3 text-center border">
          ${subject.subject_type} ${subject.is_nstp ? '(NSTP)' : ''}
        </td>
        <td class="p-3 text-right border">
          <button class="remove-subject-btn text-red-500 hover:text-red-700" data-index="${index}">
            <i data-lucide="trash-2" class="h-4 w-4"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    // Initialize Lucide icons for new elements
    lucide.createIcons();

    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-subject-btn').forEach(button => {
      button.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        selectedSubjects.splice(index, 1);
        updateSelectedSubjectsTable();
        updateSummary();
      });
    });
  }

  updateSummary();
}

// Subject selection handler
document.getElementById('subjectSelect').addEventListener('change', async function() {
  const subjectId = this.value;

  if (subjectId) {
    try {
      // Fetch complete subject details
      const response = await fetch(`/get_subject_details/${subjectId}`);
      const data = await response.json();

      if (data.success) {
        const subject = data.subject;

        // Add to selected subjects array if not already present
        if (!selectedSubjects.some(sub => sub.id === subject.id)) {
          selectedSubjects.push({
            id: subject.id,
            code: subject.subject_code,
            name: subject.subject_name,
            total_units: subject.total_units,
            lecture: subject.lecture,
            com_lab: subject.com_lab,
            laboratory: subject.laboratory,
            school_lecture: subject.school_lecture,
            clinic: subject.clinic,
            subject_type: subject.subject_type,
            is_nstp: subject.is_nstp
          });

          // Update the table
          updateSelectedSubjectsTable();

          // Reset the select
          this.value = '';
        } else {
          alert('This subject has already been selected');
        }
      } else {
        alert('Failed to load subject details: ' + data.message);
      }
    } catch (error) {
      console.error('Error fetching subject details:', error);
      alert('Error loading subject details');
    }
  }
});
